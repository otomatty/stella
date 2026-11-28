import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import {
  loadProblemRevisionHashes,
  countableProblemResults,
  type ProblemHashCache,
} from "./task-problem-hashes.js";
import { readTaskDefinition } from "./task-problem-submission.js";
import { sections, tasks, taskProgress, submissions, taskProblemResults } from "../db/schema.js";
import { chunk } from "./enrollment-bulk.js";

/**
 * 手元の合格だけでは修了しない。確定した合格は教材更新後も保持する。
 * 予備の類題 (#39) はステージの課題ではないので、分母にも分子にも数えない。
 */
export async function taskCompletionCounts(db: Db, stageId: string, userIds: string[]) {
  const rows = await db
    .select({ id: tasks.id })
    .from(tasks)
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .where(and(eq(sections.stageId, stageId), eq(tasks.active, true), isNull(tasks.variantOf)));
  const passed = new Map<string, Set<string>>();
  for (const users of chunk(userIds, 50)) {
    const progress = await db
      .select({ userId: taskProgress.userId, taskId: taskProgress.taskId })
      .from(taskProgress)
      .innerJoin(tasks, eq(tasks.id, taskProgress.taskId))
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .where(
        and(
          eq(sections.stageId, stageId),
          eq(tasks.active, true),
          isNull(tasks.variantOf),
          inArray(taskProgress.status, ["passed", "ai-passed"]),
          inArray(taskProgress.userId, users),
        ),
      );
    for (const p of progress) {
      const set = passed.get(p.userId) ?? new Set<string>();
      set.add(p.taskId);
      passed.set(p.userId, set);
    }
  }
  return { total: rows.length, passed };
}

/**
 * 受講登録、または 1 人分の指定ステージについて、進捗表示の課題総数と合格数を集計する。
 *
 * 進捗の 100% と星のクリアを食い違わせないよう、修了を判定する `taskCompletionCounts` と
 * 同じ条件で数える。有効な通常課題だけを分母に入れ、予備の類題 (#39) は分母にも分子にも
 * 入れない。分子には確定した合格 (`passed` / `ai-passed`) を数え、教材更新後も保持する。
 * 手元の合格は分子に入れない。課題のない組は返さない (呼び出し側では 0 件として扱う)。
 */
export async function taskCountsByUserStage(
  db: Db,
  scope: { userIds: readonly string[] } | { userId: string; stageIds: readonly string[] },
) {
  const pairs =
    "userIds" in scope
      ? sql`select user_id, stage_id from enrollments
          where user_id in (select value from json_each(${JSON.stringify(scope.userIds)}))
          and status in ('active', 'completed')`
      : sql`select ${scope.userId} user_id, value stage_id
          from json_each(${JSON.stringify([...new Set(scope.stageIds)])})`;
  return db.all<{ userId: string; stageId: string; total: number; passed: number }>(sql`
    with user_stages as (${pairs})
    select us.user_id userId, us.stage_id stageId, count(*) total, count(p.task_id) passed
    from user_stages us
    join sections s on s.stage_id = us.stage_id
    join tasks t on t.section_id = s.id and t.active = 1 and t.variant_of is null
    left join task_progress p on p.task_id = t.id and p.user_id = us.user_id
      and p.status in ('passed', 'ai-passed')
    group by us.user_id, us.stage_id
  `);
}

/**
 * 1 受講者 × 複数ステージの進捗表示に使う課題総数と合格数。
 * `taskCountsByUserStage` を使い、修了判定に合わせた数をステージ ID ごとに返す。
 * 課題のないステージは呼び出し側で 0 件として扱う。
 */
export async function taskCountsForUser(
  db: Db,
  userId: string,
  stageIds: readonly string[],
): Promise<Map<string, { total: number; passed: number }>> {
  if (stageIds.length === 0) return new Map();
  const rows = await taskCountsByUserStage(db, { userId, stageIds });
  return new Map(rows.map(({ stageId, total, passed }) => [stageId, { total, passed }]));
}

export function stageTaskState(
  contentHash: string,
  progress: Pick<typeof taskProgress.$inferSelect, "status" | "contentHash"> | null | undefined,
) {
  return progress &&
    (progress.contentHash === contentHash || ["passed", "ai-passed"].includes(progress.status))
    ? progress.status
    : "not-started";
}

/** 進捗として数えている現行の問題と、残っている手動合格の数。日々の活動とは区別する。 */
export async function manualCompletionCounts(
  db: Db,
  stageId: string,
  userIds: string[],
  cache?: ProblemHashCache,
) {
  const out = new Map<string, { manual_tasks: number; manual_problems: number }>();
  if (userIds.length === 0) return out;
  // 大きな定義を問題の行に繰り返し載せず、利用者の分割より前に課題ごとに一度だけ解析する。
  const stageTasks = await db
    .select({ id: tasks.id, hash: tasks.contentHash, definition: tasks.definition })
    .from(tasks)
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .where(and(eq(sections.stageId, stageId), eq(tasks.active, true), isNull(tasks.variantOf)));
  const currentByTask = new Map(
    stageTasks.map((task) => [
      task.id,
      {
        hash: task.hash,
        problemIds: new Set(readTaskDefinition(task.definition).problems?.map((p) => p.id) ?? []),
      },
    ]),
  );
  const manualProblems = [];
  for (const users of chunk(userIds, 50)) {
    const rows = await db
      .select({ userId: submissions.studentId, taskId: submissions.taskId })
      .from(submissions)
      .innerJoin(tasks, eq(tasks.id, submissions.taskId))
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .where(
        and(
          eq(sections.stageId, stageId),
          eq(tasks.active, true),
          isNull(tasks.variantOf),
          inArray(submissions.studentId, users),
          eq(submissions.verdict, "pass"),
          eq(submissions.reviewSource, "manual"),
        ),
      );
    for (const userId of users)
      out.set(userId, {
        manual_tasks: new Set(rows.filter((row) => row.userId === userId).map((row) => row.taskId))
          .size,
        manual_problems: 0,
      });
    const problems = await db
      .select({
        userId: taskProblemResults.userId,
        taskId: taskProblemResults.taskId,
        problemId: taskProblemResults.problemId,
        contentHash: taskProblemResults.contentHash,
        source: taskProblemResults.source,
        status: taskProgress.status,
      })
      .from(taskProblemResults)
      .innerJoin(tasks, eq(tasks.id, taskProblemResults.taskId))
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .leftJoin(
        taskProgress,
        and(eq(taskProgress.taskId, tasks.id), eq(taskProgress.userId, taskProblemResults.userId)),
      )
      .where(
        and(
          eq(sections.stageId, stageId),
          eq(tasks.active, true),
          isNull(tasks.variantOf),
          inArray(taskProblemResults.userId, users),
          eq(taskProblemResults.source, "manual"),
        ),
      );
    manualProblems.push(...problems);
  }
  const hashes = await loadProblemRevisionHashes(
    db,
    manualProblems.flatMap((row) => {
      const current = currentByTask.get(row.taskId);
      return current?.problemIds.has(row.problemId)
        ? [
            {
              taskId: row.taskId,
              currentHash: current.hash,
              rows: [row],
              taskPassed: row.status === "passed" || row.status === "ai-passed",
            },
          ]
        : [];
    }),
    cache,
  );
  for (const row of manualProblems) {
    const current = currentByTask.get(row.taskId);
    if (!current?.problemIds.has(row.problemId)) continue;
    if (
      countableProblemResults(
        [row],
        current.hash,
        row.status === "passed" || row.status === "ai-passed",
        hashes.get(row.taskId),
      ).length === 0
    )
      continue;
    const entry = out.get(row.userId);
    if (entry) entry.manual_problems++;
  }
  return out;
}
