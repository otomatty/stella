/**
 * 進捗 (編集中コードとクリア状態) を localStorage に永続化する薄いラッパ。
 *
 * - キー: `jsreview/progress/{assignmentId}`
 * - 値:   JSON シリアライズされた `ProgressEntry`
 * - スキーマ変更に備えてバージョンキーを別途保持し、不一致なら全削除
 * - QuotaExceeded 時は `lastSubmittedAt` の古い順に間引いて再試行
 * - 旧スキーマ (= 本アプリ専用プレフィックスを持つ非 `jsreview/progress/` キー)
 *   が残っていれば削除し、 `sessionStorage` にリセット通知フラグを立てる
 */

const VERSION = 3;
const PREFIX = "falcon/progress/";
const VERSION_KEY = "falcon/progress/__version__";
const RESET_NOTICE_FLAG = "falcon/reset-notice-pending";

/**
 * JSON から復元したエントリの寛容な形。
 *
 * v2 (`v: 2`, `lastCode: string`) と v3 (`v: 3`, `lastFiles: Record`/`activeFile`) の
 * フィールドを両方持つ可能性があるため、 いずれも optional として読み出してから個別に判定する。
 * v2 → v3 の非破壊マイグレーションで両形式を扱う必要がある。
 */
interface RawParsedEntry {
  v?: number;
  cleared?: unknown;
  lastCode?: unknown;
  lastFiles?: unknown;
  activeFile?: unknown;
  lastSubmittedAt?: unknown;
}

/**
 * 本アプリの過去スキーマで使われた可能性のある localStorage キー。
 *
 * `localStorage` は origin を共有するため、 generic な名前 (`progress` 等) を
 * 削除候補に含めると同一 origin で動く別アプリのデータを意図せず破壊しうる。
 * 本アプリ固有の名前空間 (`jsreview-` / `jsreview_`) を持つことが確実なものだけに絞る。
 */
const LEGACY_KEY_CANDIDATES = ["falcon-progress-legacy"];

export interface ProgressEntry {
  /** 一度でも全チェックを通過 (クリア) しているか */
  cleared: boolean;
  /** 多ファイル対応 (v3 で導入)。 path → 編集中コンテンツ。 */
  lastFiles: Record<string, string>;
  /** UI で最後にアクティブだったファイル path (#106 でタブ復元に使う)。 */
  activeFile?: string;
  lastSubmittedAt?: number;
}

interface StoredEntry extends ProgressEntry {
  /** スキーマバージョン (将来の互換チェック用) */
  v: number;
}

function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") {return null;}
    return window.localStorage;
  } catch {
    return null;
  }
}

function entryKey(assignmentId: string): string {
  return `${PREFIX}${assignmentId}`;
}

// ─── 変更通知 (一覧画面等の一括ビュー向け) ───────────────────
// `getClearedSnapshot` の結果は変化があるまで参照同値で返す
// (useSyncExternalStore の getSnapshot 用)。
type Listener = () => void;
const listeners = new Set<Listener>();
let cachedCleared: Set<string> | null = null;

function emitChange(): void {
  cachedCleared = null;
  for (const l of listeners) {l();}
}

export function subscribeProgress(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 起動時に呼ぶ。
 *
 * - v3 (現行) なら何もしない
 * - v2 (単一ファイル `lastCode`) なら **非破壊で** `lastFiles: { "main.js": lastCode }` へ書き換える
 *   (#100 / #103: 既存ユーザの進捗を保つことが受け入れ条件)
 * - パース失敗・形状不一致のエントリのみ削除し、 ResetNotice を立てる
 * - バージョンキー自体が未設定で実エントリが残っている場合 (v1 等) は破棄
 */
export function initProgressStore(): void {
  const ls = safeStorage();
  if (!ls) {return;}

  // 別タブでの編集にも追従する (key === null は localStorage.clear())。
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === null || e.key.startsWith(PREFIX)) {emitChange();}
    });
  }

  // Phase 1 以前の非プレフィックス旧キーが残っていれば掃除し、
  // 一度だけ通知すべきフラグを sessionStorage に立てる。
  const removedLegacy = removeLegacyKeys(ls);
  if (removedLegacy) {
    markResetNoticePending();
  }

  const stored = ls.getItem(VERSION_KEY);
  if (stored === String(VERSION)) {return;}

  if (stored === "2") {
    migrateV2ToV3(ls);
    try {
      ls.setItem(VERSION_KEY, String(VERSION));
    } catch {
      // ignore
    }
    return;
  }

  // バージョンキーが "3" でも "2" でもない (=v1 以前 / 未設定 / 想定外) → 旧データ破棄
  const obsolete: string[] = [];
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (k && k.startsWith(PREFIX) && k !== VERSION_KEY) {obsolete.push(k);}
  }
  if (obsolete.length > 0) {
    for (const k of obsolete) {ls.removeItem(k);}
    markResetNoticePending();
  }
  try {
    ls.setItem(VERSION_KEY, String(VERSION));
  } catch {
    // ignore
  }
}

function migrateV2ToV3(ls: Storage): void {
  let droppedAny = false;
  const keys: string[] = [];
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (k && k.startsWith(PREFIX) && k !== VERSION_KEY) {keys.push(k);}
  }
  for (const k of keys) {
    const raw = ls.getItem(k);
    if (!raw) {continue;}
    try {
      const parsed = JSON.parse(raw) as RawParsedEntry;
      if (parsed.v === 3) {
        // 既に v3 (混在状態) → 触らない
        continue;
      }
      if (
        parsed.v === 2 &&
        typeof parsed.cleared === "boolean" &&
        typeof parsed.lastCode === "string"
      ) {
        const migrated: StoredEntry = {
          v: VERSION,
          cleared: parsed.cleared,
          lastFiles: { "main.js": parsed.lastCode },
          activeFile: "main.js",
          lastSubmittedAt:
            typeof parsed.lastSubmittedAt === "number" ? parsed.lastSubmittedAt : undefined,
        };
        ls.setItem(k, JSON.stringify(migrated));
      } else {
        // 想定形状ではない → 個別削除 + 通知
        ls.removeItem(k);
        droppedAny = true;
      }
    } catch {
      ls.removeItem(k);
      droppedAny = true;
    }
  }
  if (droppedAny) {
    markResetNoticePending();
  }
}

function removeLegacyKeys(ls: Storage): boolean {
  let removed = false;
  for (const key of LEGACY_KEY_CANDIDATES) {
    if (ls.getItem(key) !== null) {
      try {
        ls.removeItem(key);
        removed = true;
      } catch {
        // ignore
      }
    }
  }
  return removed;
}

function markResetNoticePending(): void {
  try {
    if (typeof window === "undefined") {return;}
    window.sessionStorage.setItem(RESET_NOTICE_FLAG, "1");
  } catch {
    // ignore (private mode etc.)
  }
}

/** 起動時に旧データの掃除が走った場合に true を返し、 同時にフラグを消す。 */
export function consumeResetNotice(): boolean {
  try {
    if (typeof window === "undefined") {return false;}
    const ss = window.sessionStorage;
    const flag = ss.getItem(RESET_NOTICE_FLAG);
    if (flag === null) {return false;}
    ss.removeItem(RESET_NOTICE_FLAG);
    return true;
  } catch {
    return false;
  }
}

export function loadEntry(assignmentId: string): ProgressEntry | null {
  const ls = safeStorage();
  if (!ls) {return null;}
  const raw = ls.getItem(entryKey(assignmentId));
  if (!raw) {return null;}
  try {
    const parsed = JSON.parse(raw) as RawParsedEntry;
    if (typeof parsed.cleared !== "boolean") {return null;}
    const ts = typeof parsed.lastSubmittedAt === "number" ? parsed.lastSubmittedAt : undefined;

    // v3: 正規パス
    if (parsed.v === VERSION) {
      if (!isStringRecord(parsed.lastFiles)) {return null;}
      return {
        cleared: parsed.cleared,
        lastFiles: parsed.lastFiles,
        activeFile: typeof parsed.activeFile === "string" ? parsed.activeFile : undefined,
        lastSubmittedAt: ts,
      };
    }

    // v2: 個別ロード時の遅延マイグレーション。 initProgressStore が走ってない場合や、
    // 別タブ書き込みで一時的に v2 が残るケースの保険。
    if (parsed.v === 2 && typeof parsed.lastCode === "string") {
      return {
        cleared: parsed.cleared,
        lastFiles: { "main.js": parsed.lastCode },
        activeFile: "main.js",
        lastSubmittedAt: ts,
      };
    }

    return null;
  } catch {
    // 壊れた JSON は黙って捨てる
    ls.removeItem(entryKey(assignmentId));
    return null;
  }
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (value === null || typeof value !== "object") {return false;}
  for (const v of Object.values(value)) {
    if (typeof v !== "string") {return false;}
  }
  return true;
}

export interface SaveOptions {
  /**
   * 書き込み直前のクリア状態。一括ビューのキャッシュを無効化すべきかの判定に使う。
   * 呼び出し側が state として既に保持しているので、ここで `loadEntry` を再実行
   * しないで済むよう引数で受け取る (タイピング毎の `setCode` パスでの不要な
   * JSON.parse 回避)。未指定なら従来通り常に通知する (安全側)。
   */
  previousCleared?: boolean | null;
}

export function saveEntry(
  assignmentId: string,
  entry: ProgressEntry,
  opts: SaveOptions = {},
): void {
  const ls = safeStorage();
  if (!ls) {return;}
  const payload: StoredEntry = { v: VERSION, ...entry };
  const serialized = JSON.stringify(payload);
  let written = false;
  let prunedOthers = false;
  try {
    ls.setItem(entryKey(assignmentId), serialized);
    written = true;
  } catch (e) {
    if (isQuotaError(e)) {
      pruneOldest(ls, assignmentId);
      prunedOthers = true;
      try {
        ls.setItem(entryKey(assignmentId), serialized);
        written = true;
      } catch {
        // 諦める。ユーザの編集を妨げないため例外は飲み込む。
      }
    }
  }
  if (!written) {return;}
  // 容量逼迫で他課題のエントリが削除された可能性があるパスでは、
  // cleared に変化がなくても一括ビューのキャッシュを無効化する必要がある
  // (削除済み課題のクリア状態を表示し続けるのを防ぐ)。
  if (prunedOthers) {
    emitChange();
    return;
  }
  // 通常パス: 自課題の cleared が変わった場合のみ通知する。
  // `previousCleared` 未指定なら安全側で通知。
  const prev = opts.previousCleared;
  if (prev === undefined || prev !== entry.cleared) {
    emitChange();
  }
}

export function deleteEntry(assignmentId: string): void {
  const ls = safeStorage();
  if (!ls) {return;}
  const had = ls.getItem(entryKey(assignmentId)) !== null;
  ls.removeItem(entryKey(assignmentId));
  if (had) {emitChange();}
}

/**
 * クリア済みの assignmentId 集合を返す。
 * `subscribeProgress` で通知される変更があるまで同じ参照を返すため、
 * `useSyncExternalStore` の getSnapshot として安全に使える。
 */
export function getClearedSnapshot(): Set<string> {
  if (cachedCleared) {return cachedCleared;}
  const set = new Set<string>();
  const ls = safeStorage();
  if (!ls) {
    cachedCleared = set;
    return set;
  }
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (!k || !k.startsWith(PREFIX) || k === VERSION_KEY) {continue;}
    const raw = ls.getItem(k);
    if (!raw) {continue;}
    try {
      const parsed = JSON.parse(raw) as RawParsedEntry;
      // v2 / v3 どちらでも cleared を読む (initProgressStore 完了後は v3 のみだが、
      // ロードと書き戻しの間でクラッシュした場合等の保険)
      if (parsed.v !== VERSION && parsed.v !== 2) {continue;}
      if (parsed.cleared === true) {
        set.add(k.slice(PREFIX.length));
      }
    } catch {
      // 壊れたエントリは無視
    }
  }
  cachedCleared = set;
  return set;
}

function isQuotaError(e: unknown): boolean {
  if (!(e instanceof Error)) {return false;}
  // ブラウザによって名称が異なる
  return (
    e.name === "QuotaExceededError" ||
    e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    /quota/i.test(e.message)
  );
}

/** 容量超過時、現在保存対象を除いて古いエントリから順に削除する。 */
function pruneOldest(ls: Storage, currentAssignmentId: string): void {
  type Item = { key: string; ts: number };
  const items: Item[] = [];
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (!k || !k.startsWith(PREFIX) || k === VERSION_KEY) {continue;}
    if (k === entryKey(currentAssignmentId)) {continue;}
    const raw = ls.getItem(k);
    let ts = 0;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as RawParsedEntry;
        ts = typeof parsed.lastSubmittedAt === "number" ? parsed.lastSubmittedAt : 0;
      } catch {
        ts = 0;
      }
    }
    items.push({ key: k, ts });
  }
  items.sort((a, b) => a.ts - b.ts);
  // とりあえず古い1/4を削除
  const removeCount = Math.max(1, Math.ceil(items.length / 4));
  for (let i = 0; i < removeCount && i < items.length; i++) {
    ls.removeItem(items[i].key);
  }
}
