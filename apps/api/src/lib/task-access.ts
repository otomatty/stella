import { and, eq, inArray } from "drizzle-orm";
import { READABLE_ENROLLMENT_STATUSES } from "@stella/shared/enrollment/access";
import type { Db } from "../db/client.js";
import { enrollments, stages } from "../db/schema.js";
import type { Caller } from "./authz.js";

/** 修了後も教材は読める。手元の結果を書き込めるのは受講中だけ。 */
export async function canAccessTasks(
  db: Db,
  caller: Caller,
  stageId: string,
  access: "read" | "write" = "read",
): Promise<boolean> {
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
        eq(enrollments.tenantId, caller.tenantId),
        eq(enrollments.userId, caller.id),
        inArray(
          enrollments.status,
          access === "write" ? ["active"] : [...READABLE_ENROLLMENT_STATUSES],
        ),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
