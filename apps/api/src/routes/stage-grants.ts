/**
 * 専用ステージ (`audience = granted`) の受講者割当 API。
 *
 *   GET /api/stage-grants … granted ステージ一覧 + 割当先 + 受講者ピッカー用一覧
 *   PUT /api/stage-grants/:stageId … `{ profile_ids: string[] }` で grant を置換
 *
 * 割り当てはマップ掲載のみ。 enrollment は `POST /api/stages/:id/start` (自己開始) のまま。
 * 新たに割り当てた受講者には、線の親をたどった granted の祖先にも同じ割当を足す
 * (外したとき、および既にある割当は触らない)。catalog に着いたら止める。
 */

import { Hono } from "hono";
import { and, eq, inArray } from "drizzle-orm";

import { profiles, stageGrants, stages } from "../db/schema.js";
import { ApiError, errorResponse, getCaller, requireCanManageStageGrants } from "../lib/authz.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import { loadGrantedStagesForTenant, parentSlugFromRow } from "../lib/stage-audience.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";

interface GrantStageNode {
  id: string;
  slug: string;
  audience: string | null;
  parent: string | null;
  prerequisites: string | null;
}

/** 線の親をたどり、同テナントの published な granted 祖先を集める。catalog で止める。 */
async function loadGrantedAncestors(
  db: Db,
  tenantId: string,
  start: GrantStageNode,
): Promise<GrantStageNode[]> {
  const visited = new Set<string>([start.slug]);
  const found: GrantStageNode[] = [];
  let parentSlug = parentSlugFromRow(start);
  while (parentSlug && !visited.has(parentSlug)) {
    visited.add(parentSlug);
    const rows = await db
      .select({
        id: stages.id,
        slug: stages.slug,
        audience: stages.audience,
        parent: stages.parent,
        prerequisites: stages.prerequisites,
      })
      .from(stages)
      .where(
        and(
          eq(stages.tenantId, tenantId),
          eq(stages.slug, parentSlug),
          eq(stages.status, "published"),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (row?.audience !== "granted") break;
    found.push(row);
    parentSlug = parentSlugFromRow(row);
  }
  return found;
}

export const stageGrantsRoute = new Hono<{ Bindings: Env }>();

stageGrantsRoute.get("/api/stage-grants", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireCanManageStageGrants(caller);

    const grantedStages = await loadGrantedStagesForTenant(db, caller.tenantId);
    const grantRows =
      grantedStages.length === 0
        ? []
        : await db
            .select({
              stageId: stageGrants.stageId,
              profileId: stageGrants.profileId,
            })
            .from(stageGrants)
            .where(
              and(
                eq(stageGrants.tenantId, caller.tenantId),
                inArray(
                  stageGrants.stageId,
                  grantedStages.map((s) => s.id),
                ),
              ),
            );

    const grantsByStage = new Map<string, string[]>();
    const grantedProfileIds = new Set<string>();
    for (const row of grantRows) {
      const list = grantsByStage.get(row.stageId) ?? [];
      list.push(row.profileId);
      grantsByStage.set(row.stageId, list);
      grantedProfileIds.add(row.profileId);
    }

    const profileRows = await db
      .select({
        id: profiles.id,
        display_name: profiles.displayName,
        email: profiles.email,
        role: profiles.role,
        disabled: profiles.disabled,
      })
      .from(profiles)
      .where(eq(profiles.tenantId, caller.tenantId));

    const learners = profileRows
      .filter((row) => {
        const selectable = row.role === "student" && !row.disabled;
        return selectable || grantedProfileIds.has(row.id);
      })
      .sort((a, b) => a.display_name.localeCompare(b.display_name, "ja"))
      .map((row) => ({
        id: row.id,
        display_name: row.display_name,
        email: row.email,
        selectable: row.role === "student" && !row.disabled,
      }));

    return c.json({
      stages: grantedStages.map((stage) => ({
        id: stage.id,
        slug: stage.slug,
        title: stage.title,
        category: stage.category,
        profile_ids: grantsByStage.get(stage.id) ?? [],
      })),
      learners,
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

stageGrantsRoute.put("/api/stage-grants/:stageId", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireCanManageStageGrants(caller);
    const stageId = c.req.param("stageId");
    const body = (await c.req.json()) as { profile_ids?: unknown };

    if (
      !Array.isArray(body.profile_ids) ||
      !body.profile_ids.every((id) => typeof id === "string")
    ) {
      throw new ApiError("profile_ids は文字列の配列で指定してください", 400);
    }
    const profileIds = [
      ...new Set(body.profile_ids.map((id) => id.trim()).filter((id) => id !== "")),
    ];

    const stageRows = await db
      .select({
        id: stages.id,
        slug: stages.slug,
        audience: stages.audience,
        tenantId: stages.tenantId,
        parent: stages.parent,
        prerequisites: stages.prerequisites,
      })
      .from(stages)
      .where(eq(stages.id, stageId))
      .limit(1);
    const stage = stageRows[0];
    if (!stage || stage.tenantId !== caller.tenantId) {
      throw new ApiError("ステージが見つかりません", 404);
    }
    if (stage.audience !== "granted") {
      throw new ApiError("このステージは Option 講座 (audience=granted) ではありません", 400);
    }

    const existingGrantIds = new Set<string>();
    if (profileIds.length > 0) {
      const existingGrantRows = await db
        .select({ profileId: stageGrants.profileId })
        .from(stageGrants)
        .where(eq(stageGrants.stageId, stageId));
      for (const row of existingGrantRows) existingGrantIds.add(row.profileId);

      const profileRows = await db
        .select({ id: profiles.id, role: profiles.role, disabled: profiles.disabled })
        .from(profiles)
        .where(and(eq(profiles.tenantId, caller.tenantId), inArray(profiles.id, profileIds)));
      if (profileRows.length !== profileIds.length) {
        throw new ApiError("割当できない受講者が含まれています", 400);
      }
      const keepable = profileRows.every((row) => {
        const selectable = row.role === "student" && !row.disabled;
        return selectable || existingGrantIds.has(row.id);
      });
      if (!keepable) {
        throw new ApiError("割当できない受講者が含まれています", 400);
      }
    }

    const newlyAdded = profileIds.filter((id) => !existingGrantIds.has(id));
    const ancestorInserts: { stageId: string; profileId: string }[] = [];
    if (newlyAdded.length > 0) {
      const ancestors = await loadGrantedAncestors(db, caller.tenantId, stage);
      if (ancestors.length > 0) {
        const existingAncestorRows = await db
          .select({ stageId: stageGrants.stageId, profileId: stageGrants.profileId })
          .from(stageGrants)
          .where(
            and(
              eq(stageGrants.tenantId, caller.tenantId),
              inArray(
                stageGrants.stageId,
                ancestors.map((row) => row.id),
              ),
              inArray(stageGrants.profileId, newlyAdded),
            ),
          );
        const already = new Set(
          existingAncestorRows.map((row) => `${row.stageId}\0${row.profileId}`),
        );
        for (const ancestor of ancestors) {
          for (const profileId of newlyAdded) {
            if (already.has(`${ancestor.id}\0${profileId}`)) continue;
            ancestorInserts.push({ stageId: ancestor.id, profileId });
          }
        }
      }
    }

    const deleteOp = db.delete(stageGrants).where(eq(stageGrants.stageId, stageId));
    const insertRows = [
      ...profileIds.map((profileId) => ({ stageId, profileId })),
      ...ancestorInserts,
    ];
    const insertOps = insertRows.map((row) =>
      db.insert(stageGrants).values({
        tenantId: caller.tenantId,
        stageId: row.stageId,
        profileId: row.profileId,
        grantedBy: caller.id,
      }),
    );
    await db.batch([deleteOp, ...insertOps]);

    const ancestorGrants = new Map<string, string[]>();
    for (const row of ancestorInserts) {
      const list = ancestorGrants.get(row.stageId) ?? [];
      list.push(row.profileId);
      ancestorGrants.set(row.stageId, list);
    }
    await recordAudit(db, caller, {
      action: "stage_grants_replace",
      targetType: "stage",
      targetId: stageId,
      metadata: {
        profile_ids: profileIds,
        ...(ancestorGrants.size > 0
          ? {
              ancestor_grants: [...ancestorGrants.entries()].map(([ancestorStageId, ids]) => ({
                stage_id: ancestorStageId,
                profile_ids: ids,
              })),
            }
          : {}),
      },
      ip: clientIp(c),
    });

    return c.json({ stage_id: stageId, profile_ids: profileIds });
  } catch (err) {
    return errorResponse(c, err);
  }
});
