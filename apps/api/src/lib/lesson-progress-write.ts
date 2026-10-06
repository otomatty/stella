/**
 * レッスン進捗の upsert 文を D1 のバインド上限内に分割する。
 *
 * 1 文に 12 行以上を載せると `D1_ERROR: too many SQL variables` で 500 になる
 * (1 行 9 変数、 上限 100)。 日別ログの加算は更新前の `lesson_progress` を読むため、
 * 同じチャンクの進捗 upsert より前に置き、 チャンクごとに batch する
 * (途中失敗して再送しても LWW で増分は 0 になる)。
 */

import { sql } from "drizzle-orm";
import {
  MAX_PROGRESS_SYNC_ROWS,
  type NormalizedProgressRow,
} from "@stella/shared/study/progress-sync";

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
 * 受付上限 `MAX_PROGRESS_SYNC_ROWS` (= 600) の根拠。 正本は `@stella/shared` に置く —
 * クライアント (進捗ストアの flush) が同じ値で分割送信するため。
 *
 * 最悪は全行が study_activity 対象。 1 チャンク = 行数ぶんの加算 + upsert 1 文。
 * 進捗 1 行は bind 9 個なので upsert は最大 11 行 (D1_MAX_BOUND_PARAMS=100)。
 *
 * 進捗の書き込み後に **修了条件の自動判定** (`stage-auto-complete.ts`) が同じ呼び出しの
 * 中で走るため、 その分のクエリも収支に入れる: レッスン→ステージ解決 ceil(N/90)、
 * 候補全ステージの達成判定の読み出し ~80、 発行 1 ステージあたりロック取得 (2) +
 * ロック内の再確認 (登録 1 + 再判定 ~5) + batch(2) + 監査 1 + クリア通知 1 + 解放 1
 * ≒ 13 で、 発行数は `MAX_ISSUES_PER_CALL` (15) で頭打ち → 判定側の最悪 ~275。
 * N + ceil(N/11) + ceil(N/90) + 275 + headroom <= 1000 → N <= 640。 余裕を見て 600。
 */
export { MAX_PROGRESS_SYNC_ROWS };

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

/**
 * 同テナントのコードレッスンの完了は、書き込むその文の中でレビューの合格から決め直す
 * (`reviewedProgressRows` と同じ条件: 提出の課題がレッスンの課題と一致する合格)。
 * 合格を先に読んでから書くと、その間に講師が合格を訂正したとき、端末の時刻が LWW で
 * 勝てば古い「合格あり」で訂正を上書きしてしまう。新規行は端末の値を入れるが、
 * 訂正側の同期 (`syncReviewedLesson`) が判定の保存のあとに必ず決め直す。
 * 定数は SQL に直に書き、1 行あたりのバインド数を増やさない。
 */
const reviewedCompleted = sql`case when exists (
  select 1 from lessons l
  inner join sections se on se.id = l.section_id
  inner join stages st on st.id = se.stage_id
  where l.id = excluded.lesson_id and l.type = 'code' and st.tenant_id = excluded.tenant_id
) then exists (
  select 1 from submissions s
  inner join lessons l on l.id = s.lesson_id and l.assignment_id = s.assignment_id
  where s.tenant_id = excluded.tenant_id and s.student_id = excluded.user_id
    and s.lesson_id = excluded.lesson_id and s.verdict = 'pass'
) else excluded.completed end`;

function buildProgressUpsert(db: Db, values: ProgressValue[]) {
  return db
    .insert(lessonProgress)
    .values(values)
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: {
        completed: reviewedCompleted,
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
