/**
 * レッスン進捗の upsert 文を D1 のバインド上限内に分割する。
 *
 * 1 文に 12 行以上を載せると `D1_ERROR: too many SQL variables` で 500 になる
 * (1 行 9 変数、 上限 100)。 日別ログの加算は更新前の `lesson_progress` を読むため、
 * 同じチャンクの進捗 upsert より前に置き、 チャンクごとに batch する
 * (途中失敗して再送しても LWW で増分は 0 になる)。
 */

import { type SQL, sql } from "drizzle-orm";
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
 * 問題のステップは書き込み時に提出を再確認するため 2 bind を足し、最大 9 行。
 * N + ceil(N/9) + ceil(N/90) + 275 + headroom <= 1000 → N <= 628。 余裕を見て 600。
 */
export { MAX_PROGRESS_SYNC_ROWS };

export function assertProgressSyncSize(count: number): void {
  if (count > MAX_PROGRESS_SYNC_ROWS) {
    throw new ApiError(`一度に同期できる進捗は ${MAX_PROGRESS_SYNC_ROWS} 件までです`, 400);
  }
}

/** ステップの提出を確認する。課題の合格後は旧版の提出も数える。それ以外のレッスンは null。 */
export function problemStepCompletion(userId: string | SQL, lessonId: string | SQL) {
  return sql<boolean | null>`(
    select exists (
      select 1 from task_problem_results r
      inner join tasks t on t.id = p.task_id
      left join task_progress tp on tp.user_id = r.user_id and tp.task_id = r.task_id
      where r.user_id = ${userId} and r.task_id = p.task_id and r.problem_id = p.problem_id
        and (t.content_hash = r.content_hash or tp.status in ('passed', 'ai-passed'))
    )
    from task_problem_steps p
    where p.step_lesson_id = ${lessonId}
  )`;
}

/** 問題結果の書き込みと同じ batch に追加できる、完了フラグだけの差分 upsert。 */
export function planProblemStepProgressWrites(
  db: Db,
  userId: string,
  lessonIds: readonly string[],
  now = new Date(),
) {
  const values = [...new Set(lessonIds)].map((lessonId) => ({
    userId,
    lessonId,
    completed: sql<boolean>`coalesce(${problemStepCompletion(userId, lessonId)}, 0)`,
    updatedAt: now,
  }));
  const upsert = (batch: typeof values) =>
    db
      .insert(lessonProgress)
      .values(batch)
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        set: {
          completed: sql`excluded.completed`,
          updatedAt: sql`max(excluded.updated_at, ${lessonProgress.updatedAt})`,
        },
        setWhere: sql`excluded.completed <> ${lessonProgress.completed}`,
      });
  if (!values.length) return [];
  const perInsert = rowsPerInsert((n) => upsert(values.slice(0, n)));
  return chunk(values, perInsert).map(upsert);
}

type ProgressValue = {
  userId: string;
  lessonId: string;
  completed: boolean | SQL;
  lastPage: number | null;
  viewedPages: number[];
  watchedSec: number | null;
  updatedAt: Date;
};

function toValues(
  userId: string,
  rows: readonly NormalizedProgressRow[],
  problemStepLessonIds: ReadonlySet<string>,
): ProgressValue[] {
  return rows.map((r) => ({
    userId,
    lessonId: r.lessonId,
    completed: problemStepLessonIds.has(r.lessonId)
      ? sql`coalesce(${problemStepCompletion(userId, r.lessonId)}, 0)`
      : r.completed,
    lastPage: r.lastPage,
    viewedPages: r.viewedPages,
    watchedSec: r.watchedSec,
    updatedAt: new Date(r.updatedAtMs),
  }));
}

/**
 * コードレッスンの完了は、書き込むその文の中でレビューの合格から決め直す
 * (`reviewedProgressRows` と同じ条件: 提出の課題がレッスンの課題と一致する合格)。
 * 合格を先に読んでから書くと、その間に講師が合格を訂正したとき、端末の時刻が LWW で
 * 勝てば古い「合格あり」で訂正を上書きしてしまう。新規行は端末の値を入れるが、
 * 訂正側の同期 (`syncReviewedLesson`) が判定の保存のあとに必ず決め直す。
 * 定数は SQL に直に書き、1 行あたりのバインド数を増やさない。
 */
const reviewedCompleted = sql`case when exists (
  select 1 from lessons l
  where l.id = excluded.lesson_id and l.type = 'code'
) then exists (
  select 1 from submissions s
  inner join lessons l on l.id = s.lesson_id and l.assignment_id = s.assignment_id
  where s.student_id = excluded.user_id
    and s.lesson_id = excluded.lesson_id and s.verdict = 'pass'
) else excluded.completed end`;

function buildProgressUpsert(db: Db, values: ProgressValue[]) {
  const newer = sql`excluded.updated_at > ${lessonProgress.updatedAt}`;
  const problemCompleted = problemStepCompletion(sql`excluded.user_id`, sql`excluded.lesson_id`);
  return db
    .insert(lessonProgress)
    .values(values)
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: {
        completed: sql`coalesce(${problemCompleted}, ${reviewedCompleted})`,
        lastPage: sql`case when ${newer} then excluded.last_page else ${lessonProgress.lastPage} end`,
        viewedPages: sql`case when ${newer} then excluded.viewed_pages else ${lessonProgress.viewedPages} end`,
        watchedSec: sql`case when ${newer} then excluded.watched_sec else ${lessonProgress.watchedSec} end`,
        updatedAt: sql`max(excluded.updated_at, ${lessonProgress.updatedAt})`,
      },
      // 問題の完了は古い端末の同期でも提出から決め、ほかの進捗は端末の時刻順を保つ。
      setWhere: sql`${newer} or ${problemCompleted} <> ${lessonProgress.completed}`,
    });
}

/**
 * 進捗行を D1 上限内の batch に分割する。 各 batch は
 * `[study_activity 加算…, lesson_progress upsert]` の順。
 */
export function planLessonProgressWrites(
  db: Db,
  userId: string,
  rows: readonly NormalizedProgressRow[],
  problemStepLessonIds: ReadonlySet<string> = new Set(),
) {
  if (rows.length === 0) return [];
  const values = toValues(userId, rows, problemStepLessonIds);
  const stepValue = values.find((value) => typeof value.completed === "object");
  const perInsert = rowsPerInsert((n) =>
    buildProgressUpsert(
      db,
      stepValue ? Array.from({ length: n }, () => stepValue) : values.slice(0, n),
    ),
  );
  return chunk([...rows], perInsert).map((rowChunk) => {
    const increments = rowChunk
      .filter((r) => r.countsTowardActivity)
      .map((r) => buildStudyActivityIncrement(db, userId, r));
    return [
      ...increments,
      buildProgressUpsert(db, toValues(userId, rowChunk, problemStepLessonIds)),
    ];
  });
}

export async function executeLessonProgressWrites(
  db: Db,
  userId: string,
  rows: readonly NormalizedProgressRow[],
  problemStepLessonIds: ReadonlySet<string> = new Set(),
): Promise<void> {
  for (const statements of planLessonProgressWrites(db, userId, rows, problemStepLessonIds)) {
    const [first, ...rest] = statements;
    if (first === undefined) continue;
    if (rest.length === 0) await first;
    else await db.batch([first, ...rest]);
  }
}
