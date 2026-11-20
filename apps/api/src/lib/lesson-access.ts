import { READABLE_ENROLLMENT_STATUSES } from "@stella/shared/enrollment/access";
import { and, eq, exists, inArray, or } from "drizzle-orm";

import type { Db } from "../db/client.js";
import { enrollments, lessons, profiles, sections, stages } from "../db/schema.js";
import { ApiError, type Caller, STAFF_ROLES } from "./authz.js";
import { chunk, D1_MAX_BOUND_PARAMS } from "./enrollment-bulk.js";

function lessonStageQuery(db: Db) {
  return db
    .select({ stageStatus: stages.status, stageId: stages.id })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(stages, eq(stages.id, sections.stageId));
}

/** レッスンのステージ公開状態 / ステージ ID を join で解決する。 */
export async function lessonStageInfo(
  db: Db,
  lessonId: string,
): Promise<{ stageStatus: string; stageId: string } | null> {
  const [info] = await lessonStageQuery(db).where(eq(lessons.id, lessonId)).limit(1);
  return info ?? null;
}

/**
 * レッスンの閲覧認可。
 * - 有効な管理者: レッスンが存在すれば可
 * - 有効な受講者: published かつ当該ステージに閲覧可能な enrollment
 *   (`active` に加えて `completed`。 修了済みステージも受講者のステージ一覧に並ぶため、
 *    `active` だけにすると一覧に出ているステージの資料が 404 になる)
 */
function readableProfile(db: Db) {
  const enrollment = db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, profiles.id),
        eq(enrollments.stageId, stages.id),
        inArray(enrollments.status, [...READABLE_ENROLLMENT_STATUSES]),
      ),
    );
  return and(
    eq(profiles.disabled, false),
    or(
      inArray(profiles.role, [...STAFF_ROLES]),
      and(eq(profiles.role, "student"), eq(stages.status, "published"), exists(enrollment)),
    ),
  );
}

export async function assertLessonReadable(db: Db, caller: Caller, lessonId: string) {
  const [info] = await lessonStageQuery(db)
    .innerJoin(profiles, eq(profiles.id, caller.id))
    .where(and(eq(lessons.id, lessonId), readableProfile(db)));
  if (!info) throw new ApiError("教材が見つかりません", 404);
  return info;
}

/** 外側のクエリの profiles 行に対する閲覧条件。 */
export function lessonReadableByProfile(db: Db, lessonId: string) {
  return exists(lessonStageQuery(db).where(and(eq(lessons.id, lessonId), readableProfile(db))));
}

export async function readableUserIds(db: Db, lessonId: string, userIds: readonly string[]) {
  const readable = lessonReadableByProfile(db, lessonId);
  // ID のほかに教材 ID や閲覧条件もバインドされる。
  const idsPerQuery =
    D1_MAX_BOUND_PARAMS - db.select().from(profiles).where(readable).toSQL().params.length;
  const result = new Set<string>();
  for (const ids of chunk([...new Set(userIds)], idsPerQuery)) {
    const rows = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(inArray(profiles.id, ids), readable));
    for (const { id } of rows) result.add(id);
  }
  return result;
}
