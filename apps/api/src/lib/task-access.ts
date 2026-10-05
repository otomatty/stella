import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { enrollments, stages } from "../db/schema.js";
import type { Caller } from "./authz.js";

/** 小テストと同じく、公開中の同テナント教材への自己受講を要求する。 */
export async function canAccessTasks(db: Db, caller: Caller, stageId: string): Promise<boolean> {
  const rows = await db
    .select({ id: stages.id })
    .from(stages)
    .innerJoin(enrollments, eq(enrollments.stageId, stages.id))
    .where(
      and(
        eq(stages.id, stageId),
        eq(stages.tenantId, caller.tenantId),
        eq(stages.status, "published"),
        eq(stages.format, 2),
        eq(enrollments.userId, caller.id),
        eq(enrollments.status, "active"),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
