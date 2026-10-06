import { and, eq, inArray } from "drizzle-orm";
import { READABLE_ENROLLMENT_STATUSES } from "@stella/shared/enrollment/access";
import type { Db } from "../db/client.js";
import { enrollments, stages, variantReviews } from "../db/schema.js";
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

/** 受講者にこの類題を出題したか (出した・合格した)。テナントと本人で絞る。 */
export async function isVariantIssuedTo(db: Db, caller: Caller, taskId: string): Promise<boolean> {
  const [issued] = await db
    .select({ id: variantReviews.id })
    .from(variantReviews)
    .where(
      and(
        eq(variantReviews.tenantId, caller.tenantId),
        eq(variantReviews.userId, caller.id),
        eq(variantReviews.variantTaskId, taskId),
        inArray(variantReviews.status, ["issued", "passed"]),
      ),
    )
    .limit(1);
  return Boolean(issued);
}

/**
 * 課題 1 つを読める・書き込めるか。課題 ID で 1 件を引く入口 (配布・ヘルプ・提出・手元の結果・
 * AI チャット) はすべてここを通す。
 *
 * 類題 (#39) は、出題した受講者にだけ配る。出題 (`variant_reviews`) より前は、課題文・starter・
 * tests・解答例をどの入口からも返さない (課題があるかどうかも返さない)。時間を空けた類題は講座を
 * 修了したあとにも出すので、出題した類題は修了後も書き込める (読める受講登録は要る)。
 */
export async function canAccessTask(
  db: Db,
  caller: Caller,
  task: { id: string; stageId: string; variantOf: string | null },
  access: "read" | "write" = "read",
): Promise<boolean> {
  if (task.variantOf === null) return canAccessTasks(db, caller, task.stageId, access);
  return (
    (await isVariantIssuedTo(db, caller, task.id)) &&
    (await canAccessTasks(db, caller, task.stageId, "read"))
  );
}
