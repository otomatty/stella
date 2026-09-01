/**
 * スキルツリーのカタログ掲載範囲 (`stages.audience` + `stage_grants`)。
 *
 * `catalog` = 全受講者のカタログ候補。`granted` = 割当がある受講者だけ。
 * 評価器の前でフィルタする — DEV_MODE でも未割り当ての専用星は出さない。
 */

import { and, eq, inArray } from "drizzle-orm";
import { READABLE_ENROLLMENT_STATUSES } from "@falcon/shared/enrollment/access";

import type { Db } from "../db/client.js";
import { enrollments, stageGrants, stages } from "../db/schema.js";

export type StageAudience = "catalog" | "granted";

export function isCatalogAudience(audience: string | null | undefined): boolean {
  return audience !== "granted";
}

function parentSlugFromRow(row: AudienceStageRow): string | undefined {
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

/** caller に割り当てられた `audience = granted` ステージ id。 */
export async function loadGrantedStageIds(db: Db, profileId: string): Promise<Set<string>> {
  const rows = await db
    .select({ stageId: stageGrants.stageId })
    .from(stageGrants)
    .where(eq(stageGrants.profileId, profileId));
  return new Set(rows.map((r) => r.stageId));
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
  profileId: string,
  tenantId: string,
  stageId: string,
): Promise<boolean> {
  const grantRows = await db
    .select({ stageId: stageGrants.stageId })
    .from(stageGrants)
    .where(and(eq(stageGrants.profileId, profileId), eq(stageGrants.stageId, stageId)))
    .limit(1);
  if (grantRows[0]) return true;
  const enrolled = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, profileId),
        eq(enrollments.tenantId, tenantId),
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
 * 親 slug がカタログに無い granted 星を落とす (島フィルタ後の孤児)。
 */
export function dropOrphanGrantedStages<T extends AudienceStageRow>(rows: T[]): T[] {
  const slugSet = new Set(rows.map((r) => r.slug));
  return rows.filter((row) => {
    if (isCatalogAudience(row.audience)) return true;
    const parent = parentSlugFromRow(row);
    return parent !== undefined && slugSet.has(parent);
  });
}

/** staff 一覧用: テナントの granted ステージ。 */
export async function loadGrantedStagesForTenant(
  db: Db,
  tenantId: string,
): Promise<{ id: string; slug: string; title: string; category: string | null }[]> {
  return db
    .select({
      id: stages.id,
      slug: stages.slug,
      title: stages.title,
      category: stages.category,
    })
    .from(stages)
    .where(
      and(
        eq(stages.tenantId, tenantId),
        eq(stages.status, "published"),
        eq(stages.audience, "granted"),
      ),
    );
}
