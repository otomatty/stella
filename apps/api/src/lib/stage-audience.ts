/**
 * スキルツリーのカタログ掲載範囲 (`stages.audience` + `effective_stage_grants`)。
 *
 * `catalog` = 全受講者のカタログ候補。`granted` = 割当がある受講者だけ。
 * 評価器の前でフィルタする — DEV_MODE でも未割り当ての専用星は出さない。
 */

import { and, eq, exists, inArray, isNotNull, or, sql } from "drizzle-orm";
import { READABLE_ENROLLMENT_STATUSES } from "@stella/shared/enrollment/access";
import { isIslandWithoutRequirements } from "@stella/shared/skill-map/islands";

import type { Db } from "../db/client.js";
import { enrollments, effectiveStageGrants, stages } from "../db/schema.js";
import {
  effectiveGuidanceColumns,
  firstGuidanceBy,
  guidancePriority,
} from "./stage-grant-guidance.js";

export type StageAudience = "catalog" | "granted";

export function isCatalogAudience(audience: string | null | undefined): boolean {
  return audience !== "granted";
}

export function parentSlugFromRow(row: AudienceStageRow): string | undefined {
  const explicit = row.parent?.trim();
  if (explicit) return explicit;
  if (!row.prerequisites) return undefined;
  try {
    const parsed: unknown = JSON.parse(row.prerequisites);
    if (Array.isArray(parsed)) {
      const first = parsed.find((v): v is string => typeof v === "string" && v.trim() !== "");
      return first?.trim();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/** 表示条件のない島では、前提のない星の親はツリー上の配置だけに使う。 */
export function hasNoIslandPrerequisites(row: {
  category?: string | null;
  prerequisites: string | null;
}): boolean {
  return (
    isIslandWithoutRequirements(row.category) &&
    (!row.prerequisites || /^[ \t\r\n]*\[[ \t\r\n]*\][ \t\r\n]*$/.test(row.prerequisites))
  );
}

/** 実効の割り当てと、公開中で読める受講登録がある Extra を受講者向けに読む。 */
export async function loadLearnerExtraStages(db: Db, profileId: string) {
  const readableEnrollment = db
    .select({ exists: sql`1` })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, profileId),
        eq(enrollments.stageId, stages.id),
        inArray(enrollments.status, [...READABLE_ENROLLMENT_STATUSES]),
      ),
    );
  const rows = await db
    .select({
      stage_id: stages.id,
      title: stages.title,
      category: stages.category,
      status: stages.status,
      ...effectiveGuidanceColumns,
    })
    .from(stages)
    .leftJoin(
      effectiveStageGrants,
      and(
        eq(effectiveStageGrants.stageId, stages.id),
        eq(effectiveStageGrants.profileId, profileId),
      ),
    )
    .where(
      and(
        eq(stages.audience, "granted"),
        or(
          isNotNull(effectiveStageGrants.profileId),
          and(eq(stages.status, "published"), exists(readableEnrollment)),
        ),
      ),
    )
    .orderBy(stages.title, stages.id, ...guidancePriority);
  return firstGuidanceBy(rows, (row) => row.stage_id);
}

export async function loadGrantedStageIds(db: Db, profileId: string): Promise<Set<string>> {
  return new Set((await loadLearnerExtraStages(db, profileId)).keys());
}

/**
 * 受講者が専用星のメタデータ (題名・修了条件など) を見てよいか。
 * 割当がある、または読める enrollment があるときだけ true。
 * staff は呼び出し側でこの判定をスキップする。
 */
export function isGrantedStageVisibleToLearner(
  hasGrant: boolean,
  hasReadableEnrollment: boolean,
): boolean {
  return hasGrant || hasReadableEnrollment;
}

export async function learnerCanSeeGrantedStage(
  db: Db,
  userId: string,
  stageId: string,
): Promise<boolean> {
  const grantRows = await db
    .select({ stageId: effectiveStageGrants.stageId })
    .from(effectiveStageGrants)
    .where(
      and(eq(effectiveStageGrants.profileId, userId), eq(effectiveStageGrants.stageId, stageId)),
    )
    .limit(1);
  if (grantRows[0]) return true;
  const enrolled = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, userId),
        eq(enrollments.stageId, stageId),
        inArray(enrollments.status, [...READABLE_ENROLLMENT_STATUSES]),
      ),
    )
    .limit(1);
  return isGrantedStageVisibleToLearner(false, enrolled.length > 0);
}

export interface AudienceStageRow {
  id: string;
  slug: string;
  audience: string | null;
  prerequisites: string | null;
  parent: string | null;
}

/**
 * `audience = granted` は grant がある行だけ残す。`catalog` は従来どおり全員。
 */
export function filterStagesByAudience<T extends AudienceStageRow>(
  rows: T[],
  grantedStageIds: Set<string>,
): T[] {
  return rows.filter((row) => {
    if (isCatalogAudience(row.audience)) return true;
    return grantedStageIds.has(row.id);
  });
}

/**
 * 親 slug が残った行に無い未受講の granted 星を落とす (島フィルタ後の孤児)。
 * 表示条件の無い島の前提なしの星は根として残す。
 * granted どうしの多段の鎖では、直接の親が同じ処理で落ちた子も残さない。
 * 落とすものが無くなるまで繰り返す。catalog は常に残す。
 */
export function dropOrphanGrantedStages<T extends AudienceStageRow & { category?: string | null }>(
  rows: T[],
  enrolledStageIds?: ReadonlySet<string>,
): T[] {
  let current = rows;
  for (;;) {
    const slugSet = new Set(current.map((row) => row.slug));
    const next = current.filter((row) => {
      if (isCatalogAudience(row.audience) || enrolledStageIds?.has(row.id)) return true;
      if (hasNoIslandPrerequisites(row)) return true;
      const parent = parentSlugFromRow(row);
      return parent !== undefined && slugSet.has(parent);
    });
    if (next.length === current.length) return next;
    current = next;
  }
}

/** staff 一覧用: 公開済みの granted ステージ。 */
export async function loadGrantedStages(
  db: Db,
): Promise<{ id: string; slug: string; title: string; category: string | null }[]> {
  return db
    .select({
      id: stages.id,
      slug: stages.slug,
      title: stages.title,
      category: stages.category,
    })
    .from(stages)
    .where(and(eq(stages.status, "published"), eq(stages.audience, "granted")));
}
