/**
 * レッスン進捗 upsert ペイロードの正規化 (Issue #73)。
 *
 * `POST /api/lesson-progress` は複数端末・オフライン分をまとめて送ってくるため、
 * DB へ書く前にここで揃える:
 *
 *   - `lesson_id` が無い / `updated_at` が解釈できない行を捨てる
 *     (捨てないと Invalid Date がそのまま INSERT され、 日付計算も破綻する)
 *   - 同一 `lesson_id` は `updated_at` が最新の 1 行に集約する
 *     (SQLite の upsert は 1 文の中で同じ行を 2 度更新できず失敗するため)
 *   - 日別学習ログを計上し得る行かどうかと、 計上先の日付を決める
 *
 * 実際の加算量 (視聴秒数の増分 / 完了への遷移) は DB 側で書き込み時に判定する。
 * ここで差分を先に計算してしまうと、 読み取りと書き込みの間に別リクエストが割り込んだとき
 * 進捗と日別ログがズレるため (read-modify-write)。
 */

import { toStudyDate } from "./activity.js";

/**
 * `POST /api/lesson-progress` が 1 リクエストで受け付ける進捗行数の上限。
 *
 * 値の根拠は D1 のクエリ収支 (`apps/api/src/lib/lesson-progress-write.ts` の JSDoc)。
 * **クライアント (進捗ストアの flush) はこの単位に刻んで送る** — サーバだけが持つと、
 * オフラインで溜めた分が上限超過の 400 を受け、同じ塊を再送し続けて永遠に届かない。
 * 行は端末間 LWW でべき等なので、分割送信の途中で失敗・再送しても壊れない。
 */
export const MAX_PROGRESS_SYNC_ROWS = 600;

/** クライアントから届く進捗 1 行 (snake_case のまま)。 */
export interface ProgressSyncInput {
  lesson_id: string;
  completed: boolean;
  last_page: number | null;
  viewed_pages: number[];
  watched_sec: number | null;
  updated_at: string;
}

/** 正規化後の進捗 1 行。 */
export interface NormalizedProgressRow {
  lessonId: string;
  completed: boolean;
  lastPage: number | null;
  viewedPages: number[];
  watchedSec: number | null;
  /** `updated_at` の epoch ミリ秒。 */
  updatedAtMs: number;
  /**
   * 日別学習ログの加算対象になり得るか。 視聴秒数が正でも完了でもない行は
   * 増分が必ず 0 になるので、 DB へ問い合わせるまでもなく除外する。
   */
  countsTowardActivity: boolean;
  /** 加算先の日 (アプリ基準 TZ の `YYYY-MM-DD`)。 */
  activityDate: string;
}

/**
 * 進捗ペイロードを正規化する。 入力順 (同一 lesson_id は初出位置) を保った配列を返す。
 */
export function normalizeProgressRows(
  inputs: readonly ProgressSyncInput[],
): NormalizedProgressRow[] {
  const byLesson = new Map<string, NormalizedProgressRow>();

  for (const input of inputs) {
    const lessonId = input?.lesson_id;
    if (typeof lessonId !== "string" || lessonId === "") continue;
    const updatedAtMs = Date.parse(input.updated_at);
    if (!Number.isFinite(updatedAtMs)) continue;

    const watchedSec =
      typeof input.watched_sec === "number" && Number.isFinite(input.watched_sec)
        ? input.watched_sec
        : null;
    const completed = Boolean(input.completed);

    const row: NormalizedProgressRow = {
      lessonId,
      completed,
      lastPage: input.last_page ?? null,
      viewedPages: Array.isArray(input.viewed_pages) ? input.viewed_pages : [],
      watchedSec,
      updatedAtMs,
      countsTowardActivity: completed || (watchedSec ?? 0) > 0,
      activityDate: toStudyDate(updatedAtMs),
    };

    const prev = byLesson.get(lessonId);
    if (prev && prev.updatedAtMs > row.updatedAtMs) continue;
    byLesson.set(lessonId, row);
  }

  return [...byLesson.values()];
}
