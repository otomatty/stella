/**
 * レッスン進捗の upsert 文を D1 のバインド上限内に分割する。
 *
 * 1 文に 12 行以上を載せると `D1_ERROR: too many SQL variables` で 500 になる
 * (1 行 9 変数、 上限 100)。 日別ログの加算は更新前の `lesson_progress` を読むため、
 * 同じチャンクの進捗 upsert より前に置き、 チャンクごとに batch する
 * (途中失敗して再送しても LWW で増分は 0 になる)。
 */

import { sql } from "drizzle-orm";
import type { NormalizedProgressRow } from "@falcon/shared/study/progress-sync";

import type { Db } from "../db/client.js";
import { lessonProgress } from "../db/schema.js";
import { ApiError } from "./authz.js";
import { chunk, rowsPerInsert } from "./enrollment-bulk.js";
import { buildStudyActivityIncrement } from "./study-activity.js";

/** D1 の Worker 1 呼び出しあたりのクエリ上限 (有料プラン)。 batch の各文が 1 カウント。 */
export const D1_MAX_QUERIES_PER_INVOCATION = 1000;
/** getCaller など進捗書き込み以外のクエリ。 */
export const PROGRESS_WRITE_QUERY_HEADROOM = 20;
/**
 * 最悪は全行が study_activity 対象。 1 チャンク = 行数ぶんの加算 + upsert 1 文。
 * 進捗 1 行は bind 9 個なので upsert は最大 11 行 (D1_MAX_BOUND_PARAMS=100)。
 * N + ceil(N/11) + headroom <= 1000 → N <= 898。 余裕を見て 800。
 */
export const MAX_PROGRESS_SYNC_ROWS = 800;

export function assertProgressSyncSize(count: number): void {
  if (count > MAX_PROGRESS_SYNC_ROWS) {
    throw new ApiError(`一度に同期できる進捗は ${MAX_PROGRESS_SYNC_ROWS} 件までです`, 400);
  }
}

type ProgressValue = {
  tenantId: string;
  userId: string;
  lessonId: string;
  completed: boolean;
  lastPage: number | null;
  viewedPages: number[];
  watchedSec: number | null;
  updatedAt: Date;
};

function toValues(
  tenantId: string,
  userId: string,
  rows: readonly NormalizedProgressRow[],
): ProgressValue[] {
  return rows.map((r) => ({
    tenantId,
    userId,
    lessonId: r.lessonId,
    completed: r.completed,
    lastPage: r.lastPage,
    viewedPages: r.viewedPages,
    watchedSec: r.watchedSec,
    updatedAt: new Date(r.updatedAtMs),
  }));
}

function buildProgressUpsert(db: Db, values: ProgressValue[]) {
  return db
    .insert(lessonProgress)
    .values(values)
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: {
        completed: sql`excluded.completed`,
        lastPage: sql`excluded.last_page`,
        viewedPages: sql`excluded.viewed_pages`,
        watchedSec: sql`excluded.watched_sec`,
        updatedAt: sql`excluded.updated_at`,
      },
      setWhere: sql`excluded.updated_at > ${lessonProgress.updatedAt}`,
    });
}

/**
 * 進捗行を D1 上限内の batch に分割する。 各 batch は
 * `[study_activity 加算…, lesson_progress upsert]` の順。
 */
export function planLessonProgressWrites(
  db: Db,
  tenantId: string,
  userId: string,
  rows: readonly NormalizedProgressRow[],
) {
  if (rows.length === 0) return [];
  const values = toValues(tenantId, userId, rows);
  const perInsert = rowsPerInsert((n) => buildProgressUpsert(db, values.slice(0, n)));
  return chunk([...rows], perInsert).map((rowChunk) => {
    const increments = rowChunk
      .filter((r) => r.countsTowardActivity)
      .map((r) => buildStudyActivityIncrement(db, tenantId, userId, r));
    return [...increments, buildProgressUpsert(db, toValues(tenantId, userId, rowChunk))];
  });
}

export async function executeLessonProgressWrites(
  db: Db,
  tenantId: string,
  userId: string,
  rows: readonly NormalizedProgressRow[],
): Promise<void> {
  for (const statements of planLessonProgressWrites(db, tenantId, userId, rows)) {
    const [first, ...rest] = statements;
    if (first === undefined) continue;
    if (rest.length === 0) await first;
    else await db.batch([first, ...rest]);
  }
}
