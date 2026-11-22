import { and, count, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "../db/client.js";
import {
  loadProblemRevisionHashes,
  problemResultCounts,
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
 * 1 受講者 × 複数ステージの課題の数と合格の数 (進捗の表示用)。
 *
 * 数え方は `taskCompletionCounts` (修了の判定) と同じ — 合格 (`passed` / `ai-passed`) だけを数え、
 * 予備の類題は分母にも分子にも入れない。進捗の 100% と星のクリアを食い違わせないため。
 * 課題の無いステージは返さない (呼び出し側は 0 件として扱う)。
 */
export async function taskCountsForUser(
  db: Db,
  userId: string,
  stageIds: readonly string[],
): Promise<Map<string, { total: number; passed: number }>> {
  const out = new Map<string, { total: number; passed: number }>();
  for (const ids of chunk([...new Set(stageIds)], 90)) {
    const totals = await db
      .select({ stageId: sections.stageId, total: count() })
      .from(tasks)
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .where(and(inArray(sections.stageId, ids), eq(tasks.active, true), isNull(tasks.variantOf)))
      .groupBy(sections.stageId);
    for (const row of totals) out.set(row.stageId, { total: row.total, passed: 0 });
    if (totals.length === 0) continue;
    const passed = await db
      .select({ stageId: sections.stageId, passed: count() })
      .from(taskProgress)
      .innerJoin(tasks, eq(tasks.id, taskProgress.taskId))
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .where(
        and(
          eq(taskProgress.userId, userId),
          inArray(sections.stageId, ids),
          eq(tasks.active, true),
          isNull(tasks.variantOf),
          inArray(taskProgress.status, ["passed", "ai-passed"]),
        ),
      )
      .groupBy(sections.stageId);
    for (const row of passed) {
      const entry = out.get(row.stageId);
      if (entry) entry.passed = row.passed;
    }
  }
  return out;
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
      !problemResultCounts(
        row,
        current.hash,
        row.status === "passed" || row.status === "ai-passed",
        hashes.get(row.taskId),
      )
    )
      continue;
    const entry = out.get(row.userId);
    if (entry) entry.manual_problems++;
  }
  return out;
}
