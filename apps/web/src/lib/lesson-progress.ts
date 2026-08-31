/**
 * レッスン視聴進捗のローカルストア。
 *
 * - 真実は localStorage の `lms_lesson_progress` (JSON)
 * - メモリ上にキャッシュを保持し、 書き込みは 1秒デバウンス
 * - `pagehide` 時に未フラッシュ分を即時保存 (タブクローズで失われないように)
 * - 完了判定: slides は閲覧ページ集合 / 動画は視聴秒数 が 90% 以上で auto complete
 * - 一度 `completed: true` になったレッスンは自動では取り消されない
 * - マージは単調 (完了は OR / 閲覧ページは和集合 / 視聴秒数は max)。 `updatedAt` の
 *   新旧だけで丸ごと入れ替えると、 サーバ取り込み前のローカル更新が既存の進捗を
 *   巻き戻して push してしまうため (`mergeEntries` のコメント参照)。
 */

import { isBackendConfigured } from "@/lib/backend";
import { emitStageCleared, toStageClearedEvents } from "@/lib/stage-clear-events";
import type { Stage, Lesson, LessonStatus } from "@/data/types";

const STORAGE_KEY = "lms_lesson_progress";
const COMPLETION_THRESHOLD = 0.9;
const DEBOUNCE_MS = 1000;
/** リモート upsert はローカルより少し長めにまとめてバッチ送信する。 */
const REMOTE_DEBOUNCE_MS = 2000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface LessonProgressEntry {
  completed: boolean;
  /** slides: 最終閲覧ページ (1-indexed) */
  lastPage?: number;
  /** slides: 既閲覧ページ集合 (Set を配列直列化) */
  viewedPages?: number[];
  /** video: 視聴済み秒数の最大値 */
  watchedSec?: number;
  /** ISO8601 */
  updatedAt: string;
}

export type LessonProgressMap = Record<string, LessonProgressEntry>;

type Listener = () => void;

const listeners = new Set<Listener>();
let cache: LessonProgressMap = readFromStorage();
let pendingFlush: ReturnType<typeof setTimeout> | null = null;

function readFromStorage(): LessonProgressMap {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as LessonProgressMap;
    return {};
  } catch {
    return {};
  }
}

function writeToStorage(map: LessonProgressMap): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // QuotaExceeded など。 ローカルでの一時保存だけ諦めて続行。
  }
}

/**
 * 2 つのエントリを 1 つにまとめる。
 *
 * 進捗の各項目は本質的に単調 (閲覧ページは増えるだけ / 視聴秒数は最大値 / 完了は
 * 取り消されない) なので、 `updatedAt` が新しい方でレコードごと置き換えるのではなく
 * **項目ごとに単調な側を採る**。 置き換えにすると、 サーバ取り込み (hydrate) が
 * 終わる前に走ったローカル更新 (レッスンを開いた瞬間の 1 ページ目記録など) が
 * より新しい `updatedAt` を持ってしまい、 サーバ側の完了フラグや閲覧ページを
 * 巻き戻したうえに、 その巻き戻しを push してしまう。
 *
 * `lastPage` だけは「最後に見た位置」で単調ではないので `updatedAt` が新しい方を採る。
 * updatedAt がない / パースできない場合は b (= 現タブの値) を新しい側とみなす。
 */
export function mergeEntries(
  a: LessonProgressEntry | undefined,
  b: LessonProgressEntry | undefined,
): LessonProgressEntry | undefined {
  if (!a) return b;
  if (!b) return a;
  const ta = Date.parse(a.updatedAt);
  const tb = Date.parse(b.updatedAt);
  const newer =
    !Number.isFinite(tb) || !Number.isFinite(ta) ? (Number.isFinite(ta) ? a : b) : tb >= ta ? b : a;
  const viewed = new Set<number>([...(a.viewedPages ?? []), ...(b.viewedPages ?? [])]);
  const watched = Math.max(a.watchedSec ?? 0, b.watchedSec ?? 0);
  return {
    completed: a.completed || b.completed,
    lastPage: newer.lastPage ?? a.lastPage ?? b.lastPage,
    viewedPages: viewed.size > 0 ? Array.from(viewed).sort((x, y) => x - y) : undefined,
    watchedSec: watched > 0 ? watched : undefined,
    updatedAt: newer.updatedAt,
  };
}

/** 2 つの進捗マップを `mergeEntries` で束ねる。 */
function mergeMaps(a: LessonProgressMap, b: LessonProgressMap): LessonProgressMap {
  const merged: LessonProgressMap = {};
  for (const k of new Set<string>([...Object.keys(a), ...Object.keys(b)])) {
    const picked = mergeEntries(a[k], b[k]);
    if (picked) merged[k] = picked;
  }
  return merged;
}

/**
 * 別タブが先に書き込んだ進捗を踏み潰さないよう、 書き込み直前に
 * localStorage の最新値を再読込してマージする。
 */
function mergeAndWrite(): void {
  cache = mergeMaps(readFromStorage(), cache);
  writeToStorage(cache);
}

function scheduleFlush(): void {
  if (pendingFlush) return;
  pendingFlush = setTimeout(() => {
    pendingFlush = null;
    mergeAndWrite();
  }, DEBOUNCE_MS);
}

// ---------------------------------------------------------------
// リモート同期 (API) — Issue #21
//
// バックエンド設定 + ログイン時のみ有効。 `configureRemoteSync` を App が呼ぶと
// サーバから進捗を取り込み (LWW マージ)、 以降の更新を debounce で upsert する。
// 未設定時 (identity === null) は従来通り localStorage のみで動作する。
// ---------------------------------------------------------------

interface SyncIdentity {
  userId: string;
  tenantId: string;
}

/** 直近に同期した user_id を記録し、 共有端末でのアカウント切替を検知する。 */
const OWNER_KEY = "lms_lesson_progress_owner";

let identity: SyncIdentity | null = null;
const remoteDirty = new Set<string>();
let remoteFlush: ReturnType<typeof setTimeout> | null = null;
/**
 * サーバ進捗の取り込みが決着したか (成功・失敗どちらでも true)。
 *
 * 「続きから」の復元位置 (`lastPage` / `watchedSec`) は、 これが true になるまで
 * 確定できない。 バックエンド未設定ならサーバ進捗自体が無いので常に確定済み。
 * 設定済みでログイン前は `configureRemoteSync(null)` が呼ばれた時点で確定する。
 */
let hydrated = !isBackendConfigured();

/** サーバ進捗の取り込みが決着したか。 ビューアの復元位置の確定に使う。 */
export function isProgressReady(): boolean {
  return hydrated;
}

function setHydrated(next: boolean): void {
  if (hydrated === next) return;
  hydrated = next;
  notify();
}

/** 進捗の中身 (updatedAt を除く) が同じか。 hydrate 後の push 要否判定に使う。 */
function sameEntry(
  a: LessonProgressEntry | undefined,
  b: LessonProgressEntry | undefined,
): boolean {
  if (!a || !b) return false;
  return (
    a.completed === b.completed &&
    a.lastPage === b.lastPage &&
    (a.watchedSec ?? 0) === (b.watchedSec ?? 0) &&
    (a.viewedPages ?? []).join(",") === (b.viewedPages ?? []).join(",")
  );
}

function readOwner(): string | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    return window.localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function writeOwner(userId: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(OWNER_KEY, userId);
  } catch {
    // ignore
  }
}

/**
 * 共有ブラウザで別アカウントにログインした場合、 localStorage に残った
 * 前ユーザーの DB 連携進捗 (uuid キー) を新ユーザーへ漏らさない / 押し上げない
 * よう、 uuid キーのエントリを破棄する。 fixture (非 uuid) エントリは保持する。
 */
function purgeRemoteEntries(): void {
  const next: LessonProgressMap = {};
  for (const [k, v] of Object.entries(cache)) {
    if (!UUID_RE.test(k)) next[k] = v;
  }
  cache = next;
  writeToStorage(cache);
}

function scheduleRemoteFlush(): void {
  if (!identity || remoteFlush) return;
  remoteFlush = setTimeout(() => {
    remoteFlush = null;
    void flushRemote();
  }, REMOTE_DEBOUNCE_MS);
}

async function flushRemote(): Promise<void> {
  if (!identity || remoteDirty.size === 0) return;
  const current = identity;
  const ids = Array.from(remoteDirty);
  remoteDirty.clear();
  const entries = ids
    .map((lessonId) => ({ lessonId, entry: cache[lessonId] }))
    .filter((e): e is { lessonId: string; entry: LessonProgressEntry } => Boolean(e.entry));
  try {
    const { upsertProgressBatch } = await import("@/lib/lesson-progress-api");
    const clearedStages = await upsertProgressBatch(current.userId, current.tenantId, entries);
    // 同期でステージの修了条件が揃った (サーバが修了証を自動発行した) 場合は、
    // シェルのクリアダイアログへ流す。identity が切り替わっていたら前ユーザーの分なので出さない。
    if (identity === current) {
      emitStageCleared(toStageClearedEvents(clearedStages));
    }
  } catch (err) {
    console.error("[lesson-progress] remote upsert failed", err);
    // 失敗分は remoteDirty に戻すだけに留める。 自動の即時再スケジュールは
    // オフライン / RLS エラー時に 2 秒間隔の無限リトライを招くため行わない。
    // 次の update() / flushNow() (pagehide) で自然に再試行される。
    if (identity === current) {
      for (const { lessonId } of entries) remoteDirty.add(lessonId);
    }
  }
}

async function hydrateFromRemote(target: SyncIdentity): Promise<void> {
  try {
    const { fetchProgressForUser } = await import("@/lib/lesson-progress-api");
    const remote = await fetchProgressForUser(target.userId);
    // 取得中に identity が切り替わっていたら破棄
    if (identity !== target) return;
    const merged = mergeMaps(remote, cache);
    // マージ結果がサーバの行と食い違う uuid 進捗 (= ローカルにしか無い分がある) を
    // push する。 マージは updatedAt を進めないことがあるので、 サーバ側 LWW
    // (excluded.updated_at > 既存) に弾かれないよう push 分だけ今の時刻を打ち直す。
    const toPush: string[] = [];
    for (const [k, entry] of Object.entries(merged)) {
      if (!UUID_RE.test(k) || sameEntry(entry, remote[k])) continue;
      merged[k] = { ...entry, updatedAt: nowIso() };
      toPush.push(k);
    }
    cache = merged;
    writeToStorage(cache);
    notify();
    if (toPush.length > 0) {
      for (const k of toPush) remoteDirty.add(k);
      scheduleRemoteFlush();
    }
  } catch (err) {
    console.error("[lesson-progress] remote hydrate failed", err);
  } finally {
    // 失敗しても「決着」とする。 待ち続けるとビューアが復元位置を出せない。
    if (identity === target) setHydrated(true);
  }
}

/**
 * リモート同期の有効化 / 無効化。
 * - identity を渡すと: サーバから進捗を hydrate し、 以降の更新を upsert する
 * - null を渡すと (ログアウト等): 同期を停止する (ローカルキャッシュは保持)
 */
export function configureRemoteSync(next: SyncIdentity | null): void {
  if (identity?.userId === next?.userId && identity?.tenantId === next?.tenantId) {
    return;
  }
  identity = next;
  if (remoteFlush) {
    clearTimeout(remoteFlush);
    remoteFlush = null;
  }
  remoteDirty.clear();
  // 同期しないなら復元位置はローカルで確定済み。 同期するなら hydrate 待ち。
  setHydrated(next === null);
  if (next) {
    // pagehide 時の即時 flush でチャンクフェッチ中断を避けるため、 同期有効化の
    // タイミングで API モジュールを投機的にプリロードしておく。
    void import("@/lib/lesson-progress-api");
    // 別ユーザーに切り替わったら、 前ユーザーの DB 連携進捗をローカルから除去。
    // ただし owner 未記録 (null) の初回同期では purge しない。 本機能導入前から
    // localStorage に残る既存ユーザーの uuid 進捗を、 hydrate 前に消して失わない
    // ようにするため (記録済み owner があり、 かつ別ユーザーの時のみ purge)。
    const prevOwner = readOwner();
    if (prevOwner !== null && prevOwner !== next.userId) {
      purgeRemoteEntries();
      notify();
    }
    writeOwner(next.userId);
    void hydrateFromRemote(next);
  }
}

function notify(): void {
  for (const l of listeners) l();
}

/** デバウンス中の書き込みを即時 flush (pagehide / 明示 save 用) */
export function flushNow(): void {
  if (pendingFlush) {
    clearTimeout(pendingFlush);
    pendingFlush = null;
  }
  mergeAndWrite();
  // リモートも best-effort で即時送信 (pagehide では完了は保証されない。
  // 通常のデバウンス送信で大半は既に同期済み)。
  if (identity && remoteDirty.size > 0) {
    if (remoteFlush) {
      clearTimeout(remoteFlush);
      remoteFlush = null;
    }
    void flushRemote();
  }
}

if (typeof window !== "undefined") {
  // pagehide はモバイル含めて beforeunload より確実に発火する
  window.addEventListener("pagehide", flushNow);
  // 別タブでの localStorage 更新を取り込み、 in-memory cache を同期
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    cache = mergeMaps(readFromStorage(), cache);
    notify();
  });
}

export function loadMap(): LessonProgressMap {
  return cache;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getEntry(lessonId: string): LessonProgressEntry | undefined {
  return cache[lessonId];
}

function nowIso(): string {
  return new Date().toISOString();
}

function update(lessonId: string, entry: LessonProgressEntry): LessonProgressEntry {
  cache = { ...cache, [lessonId]: entry };
  scheduleFlush();
  if (identity && UUID_RE.test(lessonId)) {
    remoteDirty.add(lessonId);
    scheduleRemoteFlush();
  }
  notify();
  return entry;
}

export function recordPage(
  lessonId: string,
  page: number,
  totalPages: number,
): LessonProgressEntry {
  const prev = cache[lessonId];
  const validPage =
    Number.isInteger(page) && page >= 1 && (totalPages <= 0 || page <= totalPages)
      ? page
      : undefined;
  const viewedSet = new Set(prev?.viewedPages ?? []);
  if (validPage !== undefined) viewedSet.add(validPage);
  const viewedPages = Array.from(viewedSet).sort((a, b) => a - b);
  const completed =
    prev?.completed === true ||
    (totalPages > 0 && viewedPages.length / totalPages >= COMPLETION_THRESHOLD);
  return update(lessonId, {
    completed,
    lastPage: validPage ?? prev?.lastPage,
    viewedPages,
    watchedSec: prev?.watchedSec,
    updatedAt: nowIso(),
  });
}

export function recordWatchTime(
  lessonId: string,
  sec: number,
  totalSec: number,
): LessonProgressEntry {
  const prev = cache[lessonId];
  const prevWatched = prev?.watchedSec ?? 0;
  const normalizedSec = Number.isFinite(sec) ? Math.max(0, sec) : prevWatched;
  const watched = Math.max(prevWatched, normalizedSec);
  const completed =
    prev?.completed === true || (totalSec > 0 && watched / totalSec >= COMPLETION_THRESHOLD);
  return update(lessonId, {
    completed,
    lastPage: prev?.lastPage,
    viewedPages: prev?.viewedPages,
    watchedSec: watched,
    updatedAt: nowIso(),
  });
}

/**
 * 「開いた」ことだけを記録する (完了にはしない)。
 *
 * text / quiz レッスンは閲覧ページも視聴秒数も持たないため、 これが無いと完了ボタンを
 * 押すまで進捗行が 1 行も作られず、 サイドバーでも「読みかけ」に見えない。
 * 既にエントリがあれば何もしない (updatedAt を無駄に進めて LWW を乱さない)。
 */
export function markVisited(lessonId: string): LessonProgressEntry {
  const prev = cache[lessonId];
  if (prev) return prev;
  return update(lessonId, { completed: false, updatedAt: nowIso() });
}

export function markComplete(lessonId: string): LessonProgressEntry {
  const prev = cache[lessonId];
  if (prev?.completed) return prev;
  return update(lessonId, {
    completed: true,
    lastPage: prev?.lastPage,
    viewedPages: prev?.viewedPages,
    watchedSec: prev?.watchedSec,
    updatedAt: nowIso(),
  });
}

/**
 * fixture の初期 status と進捗マップから現在の表示 status を導出。
 *
 * 優先度: locked 維持 → completed なら done → fixture が done なら done 維持
 *      → エントリ有なら active → fixture status。
 * fixture done の lesson を再訪して部分閲覧しただけで done から active に
 * 落ちないように、 fixture done を partial entry より上に置く。
 */
export function resolveLessonStatus(lesson: Lesson, map: LessonProgressMap): LessonStatus {
  if (lesson.status === "locked") return "locked";
  const entry = map[lesson.id];
  if (entry?.completed) return "done";
  if (lesson.status === "done") return "done";
  if (entry) return "active";
  return lesson.status;
}

export interface NextLessonInfo {
  lesson: Lesson;
  /** 1-indexed セクション番号 */
  sectionNumber: number;
  /** ステージ内の通し番号 (1-indexed) */
  lessonNumber: number;
}

/**
 * ステージ内で最初の未完了レッスンを探す (進捗マップで実ステータスに解決してから)。
 * 「続きから」 の再開位置はここが唯一の判定元。 全完了 / レッスン無しなら null。
 */
export function findNextLesson(
  stage: Stage | undefined,
  map: LessonProgressMap,
): NextLessonInfo | null {
  if (!stage?.sections) return null;
  let flat = 0;
  for (let si = 0; si < stage.sections.length; si++) {
    const section = stage.sections[si];
    if (!section) continue;
    for (const lesson of section.lessons) {
      flat += 1;
      const status = resolveLessonStatus(lesson, map);
      if (status !== "done" && status !== "locked") {
        return { lesson, sectionNumber: si + 1, lessonNumber: flat };
      }
    }
  }
  return null;
}

/**
 * 「続きから」 で開くレッスン ID。 未完了があればそこ、 残りが完了済みなら
 * 最初の非 locked レッスンへ戻す (読み返しでボタンを死なせない / ロック行ガードを迂回しない)。
 * すべて locked / レッスン無しなら null。
 */
export function resumeLessonId(stage: Stage | undefined, map: LessonProgressMap): string | null {
  const next = findNextLesson(stage, map);
  if (next) return next.lesson.id;
  const lessons = stage?.sections?.flatMap((s) => s.lessons) ?? [];
  return lessons.find((l) => resolveLessonStatus(l, map) !== "locked")?.id ?? null;
}

/**
 * 進捗マップからステージの進捗率 (%) を導出して返す。
 * DB 由来ステージは `mapStageToUi` が progress=0 で返すため、 レッスン完了数から計算する。
 * レッスンを持たないステージはそのまま返す。
 */
export function deriveStageProgress(stage: Stage, map: LessonProgressMap): Stage {
  const lessons = stage.sections?.flatMap((s) => s.lessons) ?? [];
  if (lessons.length === 0) return stage;
  const done = lessons.filter((l) => resolveLessonStatus(l, map) === "done").length;
  const pct = stage.completed ? 100 : Math.round((done / lessons.length) * 100);
  return { ...stage, progress: pct };
}
