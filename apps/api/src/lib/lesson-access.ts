import { READABLE_ENROLLMENT_STATUSES } from "@stella/shared/enrollment/access";
import { and, eq, inArray } from "drizzle-orm";

import type { Db } from "../db/client.js";
import { enrollments, lessons, sections, stages } from "../db/schema.js";
import { ApiError, type Caller, isStaffRole } from "./authz.js";

/** レッスンのステージ公開状態 / ステージ ID を join で解決する。 */
export async function lessonStageInfo(
  db: Db,
  lessonId: string,
): Promise<{ stageStatus: string; stageId: string } | null> {
  const rows = await db
    .select({
      stageStatus: stages.status,
      stageId: stages.id,
    })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(stages, eq(stages.id, sections.stageId))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * レッスンの閲覧認可。
 * - staff: レッスンが存在すれば可
 * - student: published かつ当該ステージに閲覧可能な enrollment
 *   (`active` に加えて `completed`。 修了済みステージも受講者のステージ一覧に並ぶため、
 *    `active` だけにすると一覧に出ているステージの資料が 404 になる)
 */
export async function assertLessonReadable(db: Db, caller: Caller, lessonId: string) {
  const info = await lessonStageInfo(db, lessonId);
  if (!info) {
    throw new ApiError("教材が見つかりません", 404);
  }
  if (isStaffRole(caller.role)) return info;
  if (info.stageStatus !== "published") {
    throw new ApiError("教材が見つかりません", 404);
  }
  const enrolled = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, caller.id),
        eq(enrollments.stageId, info.stageId),
        inArray(enrollments.status, [...READABLE_ENROLLMENT_STATUSES]),
      ),
    )
    .limit(1);
  if (!enrolled[0]) throw new ApiError("教材が見つかりません", 404);
  return info;
}
