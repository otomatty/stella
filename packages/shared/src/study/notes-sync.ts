/**
 * レッスンノート upsert ペイロードの正規化 (Issue #78)。
 *
 * `POST /api/lesson-notes` は端末間 / 旧 localStorage からの移行分をまとめて送ってくるため、
 * DB へ書く前にここで揃える (`progress-sync.ts` と同方針):
 *
 *   - `lesson_id` が無い / `body` が文字列でない / `updated_at` が解釈できない行を捨てる
 *     (捨てないと Invalid Date や null がそのまま INSERT される)
 *   - 同一 `lesson_id` は `updated_at` が最新の 1 行に集約する
 *     (SQLite の upsert は 1 文の中で同じ行を 2 度更新できず失敗するため)
 *   - 本文が長すぎる場合は切り詰める (1 行あたりの D1 書き込みサイズを抑える)
 */

/** 保存できるノート本文の最大文字数。 超過分は切り詰める。 */
export const MAX_NOTE_LENGTH = 20_000;

/**
 * 本文を保存上限に丸める。 サーバ (`normalizeNoteRows`) と同じ規則をクライアントでも
 * 使えるようにする。 送信前に clamp しておかないと、 サーバが切り詰めた本文が返って
 * きたときに「別端末で更新された」と誤検知する。
 */
export function clampNoteBody(body: string): string {
  return body.slice(0, MAX_NOTE_LENGTH);
}

/** クライアントから届くノート 1 行 (snake_case のまま)。 */
export interface NoteSyncInput {
  lesson_id: string;
  body: string;
  updated_at: string;
}

/** 正規化後のノート 1 行。 */
export interface NormalizedNoteRow {
  lessonId: string;
  body: string;
  /** `updated_at` の epoch ミリ秒。 */
  updatedAtMs: number;
}

/**
 * ノートペイロードを正規化する。 入力順 (同一 lesson_id は初出位置) を保った配列を返す。
 *
 * `nowMs` (サーバ時刻) より未来の `updated_at` はサーバ時刻に丸める。 `updated_at` は
 * ブラウザの時計なので、 進んだ時計の端末がそのまま勝ち続けると、 正しい時計の端末からは
 * 実時間が追いつくまでノートを書けなくなる。 丸めても LWW の意味論 (新しい方が勝つ) は
 * 変わらず、 スキューの影響を「サーバ時刻まで」に閉じ込められる。
 */
export function normalizeNoteRows(
  inputs: readonly NoteSyncInput[],
  nowMs: number = Date.now(),
): NormalizedNoteRow[] {
  const byLesson = new Map<string, NormalizedNoteRow>();

  for (const input of inputs) {
    const lessonId = input?.lesson_id;
    if (typeof lessonId !== "string" || lessonId === "") continue;
    if (typeof input.body !== "string") continue;
    const parsedMs = Date.parse(input.updated_at);
    if (!Number.isFinite(parsedMs)) continue;
    const updatedAtMs = Number.isFinite(nowMs) ? Math.min(parsedMs, nowMs) : parsedMs;

    const row: NormalizedNoteRow = {
      lessonId,
      body: clampNoteBody(input.body),
      updatedAtMs,
    };

    const prev = byLesson.get(lessonId);
    if (prev && prev.updatedAtMs > row.updatedAtMs) continue;
    byLesson.set(lessonId, row);
  }

  return [...byLesson.values()];
}
