import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { sections, tasks, taskProgress } from "../db/schema.js";
import { chunk } from "./enrollment-bulk.js";

/** 手元の合格だけでは修了しない。確定した合格は教材更新後も保持する。 */
export async function taskCompletionCounts(db: Db, stageId: string, userIds: string[]) {
  const rows = await db
    .select({ id: tasks.id })
    .from(tasks)
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .where(and(eq(sections.stageId, stageId), eq(tasks.active, true)));
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
