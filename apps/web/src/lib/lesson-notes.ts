/**
 * レッスンノートのローカルストア (Issue #78)。
 *
 * サーバ保存 (`/api/lesson-notes`) の手前に置くローカルキャッシュ。
 *   - 本文は従来どおり `lms_lesson_notes_v1:<lessonId>` に保存する
 *     (バックエンド未設定時は現行どおりこの localStorage だけで動く)
 *   - 端末間 LWW の比較用に、 更新時刻を `lms_lesson_notes_meta_v1` (lessonId → ISO) へ持つ
 *
 * 旧実装 (PR #71) の本文キーはそのまま読めるため、 既存ノートは失われない。
 * 時刻を持たない旧ノートは `updatedAt: null` として扱い、 サーバに行がある場合は
 * サーバ側を採用する (どちらが新しいか判定できないため)。
 */

const NOTE_PREFIX = 'lms_lesson_notes_v1:';
const META_KEY = 'lms_lesson_notes_meta_v1';
/** 直近に同期した user_id を記録し、 共有端末でのアカウント切替を検知する。 */
const OWNER_KEY = 'lms_lesson_notes_owner';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface LocalNote {
  body: string;
  /** ISO8601。 旧形式 (時刻なし) から読んだ場合は null。 */
  updatedAt: string | null;
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readMeta(): Record<string, string> {
  const store = storage();
  if (!store) return {};
  try {
    const raw = store.getItem(META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, string>;
    return {};
  } catch {
    return {};
  }
}

function writeMeta(meta: Record<string, string>): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(META_KEY, JSON.stringify(meta));
    return true;
  } catch {
    return false;
  }
}

export function readLocalNote(lessonId: string): LocalNote {
  const store = storage();
  if (!store) return { body: '', updatedAt: null };
  try {
    const body = store.getItem(`${NOTE_PREFIX}${lessonId}`) ?? '';
    const updatedAt = readMeta()[lessonId] ?? null;
    return { body, updatedAt };
  } catch {
    return { body: '', updatedAt: null };
  }
}

/**
 * ノートをローカルに保存する。 保存できたかを返す (QuotaExceeded / localStorage 無効)。
 * 呼び出し側は失敗を握り潰さず、 保存済みと誤って伝えないこと。
 */
export function writeLocalNote(
  lessonId: string,
  body: string,
  updatedAt: string,
): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(`${NOTE_PREFIX}${lessonId}`, body);
  } catch {
    return false;
  }
  // 更新時刻が書けないと「本文は新しいのに時刻は古い」不整合が残り、 次回の hydrate で
  // 古いサーバ行に差し替えられ得る。 本文だけ書けても成功扱いにはしない。
  // (本文は best-effort で残す — 消すと保存できたはずの内容まで失われるため)
  return writeMeta({ ...readMeta(), [lessonId]: updatedAt });
}

// ---------------------------------------------------------------
// 未送信の編集の退避 (所有者ごと)
//
// アカウント切替時、 サーバへ送れていない編集をそのまま破棄すると唯一のコピーが
// 失われる (共有端末対策で uuid キーのノートは破棄されるため)。 所有者ごとに分けて
// 退避し、 そのユーザーが戻ってきたときだけ復元する。
// ---------------------------------------------------------------

const PENDING_KEY = 'lms_lesson_notes_pending_v1';

export interface PendingNote {
  body: string;
  /** ISO8601 */
  updatedAt: string;
}

/** `userId` と `lessonId` は uuid なので、 区切り文字と衝突しない。 */
function pendingKey(userId: string, lessonId: string): string {
  return `${userId}|${lessonId}`;
}

function readPendingMap(): Record<string, PendingNote> {
  const store = storage();
  if (!store) return {};
  try {
    const raw = store.getItem(PENDING_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, PendingNote>;
    }
    return {};
  } catch {
    return {};
  }
}

function writePendingMap(map: Record<string, PendingNote>): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(PENDING_KEY, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

/**
 * 未送信の編集を所有者ごとに退避する。 退避できたかを返す。
 *
 * 退避に失敗するとアカウント切替の purge で唯一のコピーを失うため、 容量超過時は
 * 他の退避を捨ててでもこの 1 件を残す (退避は本来 1〜数件しか無い想定)。
 */
export function savePendingNote(
  userId: string,
  lessonId: string,
  note: PendingNote,
): boolean {
  const key = pendingKey(userId, lessonId);
  if (writePendingMap({ ...readPendingMap(), [key]: note })) return true;
  return writePendingMap({ [key]: note });
}

/** 退避しておいた未送信の編集 (無ければ null)。 */
export function readPendingNote(
  userId: string,
  lessonId: string,
): PendingNote | null {
  const note = readPendingMap()[pendingKey(userId, lessonId)];
  if (!note || typeof note.body !== 'string' || typeof note.updatedAt !== 'string') {
    return null;
  }
  return note;
}

/** 復元済みの退避分を捨てる。 */
export function clearPendingNote(userId: string, lessonId: string): void {
  const map = readPendingMap();
  const key = pendingKey(userId, lessonId);
  if (!(key in map)) return;
  delete map[key];
  writePendingMap(map);
}

/**
 * 共有ブラウザで別アカウントにログインした場合、 localStorage に残った前ユーザーの
 * DB 連携ノート (uuid キー) を新ユーザーに見せない / 押し上げないよう破棄する。
 * fixture (非 uuid) レッスンのノートはサーバに送られないため保持する。
 *
 * 未送信の編集 (`PENDING_KEY`) は所有者ごとに分かれており、 復元は本人のときだけ
 * 行うため、 ここでは破棄しない。
 */
function purgeRemoteNotes(): void {
  const store = storage();
  if (!store) return;
  const meta = readMeta();
  let removed = false;
  try {
    for (const key of Object.keys(store)) {
      if (!key.startsWith(NOTE_PREFIX)) continue;
      const lessonId = key.slice(NOTE_PREFIX.length);
      if (!UUID_RE.test(lessonId)) continue;
      store.removeItem(key);
      delete meta[lessonId];
      removed = true;
    }
  } catch {
    return;
  }
  if (removed) writeMeta(meta);
}

/**
 * 進捗同期 (Issue #21) が記録している所有者。 ノート側の owner が未記録のときの
 * 手掛かりに使う。 こちらは本機能より前から記録されている。
 */
const PROGRESS_OWNER_KEY = 'lms_lesson_progress_owner';

/**
 * モジュール読込時点の進捗同期 owner。
 *
 * `configureRemoteSync` (App の effect) がログイン中のユーザーで上書きしてしまうため、
 * 読み取りは effect より前 — モジュール評価時 — に済ませておく必要がある。
 */
const ownerBeforeThisSession = ((): string | null => {
  const store = storage();
  if (!store) return null;
  try {
    return store.getItem(PROGRESS_OWNER_KEY);
  } catch {
    return null;
  }
})();

/**
 * ノート同期の所有者を設定する。 別ユーザーに切り替わったら前ユーザーのノートを破棄する。
 * `null` (ログアウト等) では何もしない (ローカルキャッシュは保持)。
 *
 * owner 未記録 (本機能の導入直後) のときは、 残っている uuid ノートが誰のものか
 * 分からない。 そのまま残すと、 共有端末で最初にログインした人にそれが見え、
 * サーバ未保存なら その人のアカウントへ移行されてしまう。 進捗同期の owner を
 * 手掛かりにして、 同じユーザーだと確認できたときだけ残す (確認できなければ破棄)。
 */
export function configureNotesSync(userId: string | null): void {
  const store = storage();
  if (!store || !userId) return;
  try {
    const prevOwner = store.getItem(OWNER_KEY);
    if (prevOwner === null) {
      if (ownerBeforeThisSession !== userId) purgeRemoteNotes();
    } else if (prevOwner !== userId) {
      purgeRemoteNotes();
    }
    store.setItem(OWNER_KEY, userId);
  } catch {
    // ignore
  }
}
