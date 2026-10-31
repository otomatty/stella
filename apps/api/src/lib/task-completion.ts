import { and, count, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { sections, tasks, taskProgress } from "../db/schema.js";
import { chunk } from "./enrollment-bulk.js";

/**
 * 手元の合格だけでは修了しない。確定した合格は教材更新後も保持する。
 * 予備の類題 (#39) は講座の課題ではないので、分母にも分子にも数えない。
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
