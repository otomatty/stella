/**
 * 専用ステージ (`audience = granted`) の受講者割当 API。
 *
 *   GET /api/stage-grants … granted ステージ一覧 + 割当先 + 受講者ピッカー用一覧
 *   PUT /api/stage-grants/:stageId … `{ profile_ids: string[] }` で grant を置換
 *
 * 割り当てはマップ掲載のみ。 enrollment は `POST /api/stages/:id/start` (自己開始) のまま。
 */

import { Hono } from "hono";
import { and, eq, inArray } from "drizzle-orm";

import { profiles, stageGrants, stages } from "../db/schema.js";
import { ApiError, errorResponse, getCaller, requireCanManageStageGrants } from "../lib/authz.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import { loadGrantedStagesForTenant } from "../lib/stage-audience.js";
import type { Env } from "../env.js";

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
      .select({ id: stages.id, audience: stages.audience, tenantId: stages.tenantId })
      .from(stages)
      .where(eq(stages.id, stageId))
      .limit(1);
    const stage = stageRows[0];
    if (!stage || stage.tenantId !== caller.tenantId) {
      throw new ApiError("ステージが見つかりません", 404);
    }
    if (stage.audience !== "granted") {
      throw new ApiError("このステージは専用教材 (audience=granted) ではありません", 400);
    }

    if (profileIds.length > 0) {
      const existingGrantRows = await db
        .select({ profileId: stageGrants.profileId })
        .from(stageGrants)
        .where(eq(stageGrants.stageId, stageId));
      const existingGrantIds = new Set(existingGrantRows.map((row) => row.profileId));

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

    const deleteOp = db.delete(stageGrants).where(eq(stageGrants.stageId, stageId));
    const insertOps = profileIds.map((profileId) =>
      db.insert(stageGrants).values({
        tenantId: caller.tenantId,
        stageId,
        profileId,
        grantedBy: caller.id,
      }),
    );
    await db.batch([deleteOp, ...insertOps]);

    await recordAudit(db, caller, {
      action: "stage_grants_replace",
      targetType: "stage",
      targetId: stageId,
      metadata: { profile_ids: profileIds },
      ip: clientIp(c),
    });

    return c.json({ stage_id: stageId, profile_ids: profileIds });
  } catch (err) {
    return errorResponse(c, err);
  }
});
