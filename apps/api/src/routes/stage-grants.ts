/**
 * 専用ステージ (`audience = granted`) の受講者割当 API。
 *
 *   GET /api/stage-grants … granted ステージ一覧 + 割当先 + 入口を開けた受講者 + 受講者ピッカー用一覧
 *   PUT /api/stage-grants/:stageId … `{ profile_ids, unlocked_profile_ids? }` で grant を置換。
 *     応答は `{ stage_id, profile_ids, unlocked_profile_ids, ancestor_grants }`。ancestor_grants は
 *     今回自動で足した祖先の割当 (無ければ空配列。監査ログの ancestor_grants と同じ内容)。
 *
 * `unlocked_profile_ids` は、割り当てた受講者のうち入口を開ける人 (`stage_unlocks.via = staff`)。
 * 指定すると、その講座の staff の行のうち指定に無い人だけを消し、指定された人を足す
 * (残した行の日時はそのまま)。省くと、割当から外した人の入口だけを閉じる。
 * 腕試し (`skill_check`) で開いた行は消さず、上書きもしない。
 * 割り当ても入口も、受講開始は自己開始のまま (`POST /api/stages/:id/start`)。
 * 新たに割り当てた受講者には、線の親と前提をたどった Extra (granted) の講座にも同じ割当を足す
 * (外したとき、および既にある割当は触らない)。catalog に着いたらそこから先はたどらない。
 * 自動で足す側の insert だけ、同時保存で祖先が重複しても一意制約で失敗しない。
 */

import { Hono } from "hono";
import { and, eq, inArray, notInArray } from "drizzle-orm";

import { profiles, stageGrants, stageUnlocks, stages } from "../db/schema.js";
import { ApiError, errorResponse, getCaller, requireCanManageStageGrants } from "../lib/authz.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import { loadGrantedStages, parentSlugFromRow } from "../lib/stage-audience.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";

interface GrantStageNode {
  id: string;
  slug: string;
  audience: string | null;
  parent: string | null;
  prerequisites: string | null;
}

/** 配列でなければ空。文字列以外と空文字は捨てる。壊れた JSON も空。 */
function prerequisiteSlugsFromRow(row: { prerequisites: string | null }): string[] {
  if (!row.prerequisites) return [];
  try {
    const parsed: unknown = JSON.parse(row.prerequisites);
    if (!Array.isArray(parsed)) return [];
    const slugs: string[] = [];
    for (const value of parsed) {
      if (typeof value !== "string") continue;
      const slug = value.trim();
      if (slug !== "") slugs.push(slug);
    }
    return slugs;
  } catch {
    return [];
  }
}

/** trim・空文字除去・重複除去。文字列の配列でなければ 400。 */
function cleanIdList(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || !value.every((id) => typeof id === "string")) {
    throw new ApiError(`${label} は文字列の配列で指定してください`, 400);
  }
  return [...new Set(value.map((id) => id.trim()).filter((id) => id !== ""))];
}

/** 線の親を先に、続けて prerequisites の slug。重複は除く。 */
function neighborSlugs(row: GrantStageNode): string[] {
  const slugs: string[] = [];
  const seen = new Set<string>();
  const parent = parentSlugFromRow(row);
  if (parent) {
    slugs.push(parent);
    seen.add(parent);
  }
  for (const slug of prerequisiteSlugsFromRow(row)) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    slugs.push(slug);
  }
  return slugs;
}

/**
 * 線の親と prerequisites をたどり、published な granted の前提講座を集める。
 * catalog に着いたらそこから先はたどらない。起点は含めない。訪問済みで循環と重複を止める。
 */
async function loadGrantedPrerequisites(db: Db, start: GrantStageNode): Promise<GrantStageNode[]> {
  const visited = new Set<string>();
  if (start.slug) visited.add(start.slug);
  const found: GrantStageNode[] = [];
  const queue = neighborSlugs(start);
  let head = 0;
  while (head < queue.length) {
    const slug = queue[head];
    head += 1;
    if (!slug || visited.has(slug)) continue;
    visited.add(slug);
    const rows = await db
      .select({
        id: stages.id,
        slug: stages.slug,
        audience: stages.audience,
        parent: stages.parent,
        prerequisites: stages.prerequisites,
      })
      .from(stages)
      .where(and(eq(stages.slug, slug), eq(stages.status, "published")))
      .limit(1);
    const row = rows[0];
    if (row?.audience !== "granted") continue;
    found.push(row);
    for (const next of neighborSlugs(row)) {
      if (!visited.has(next)) queue.push(next);
    }
  }
  return found;
}

export const stageGrantsRoute = new Hono<{ Bindings: Env }>();

stageGrantsRoute.get("/api/stage-grants", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireCanManageStageGrants(caller);

    const grantedStages = await loadGrantedStages(db);
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
              inArray(
                stageGrants.stageId,
                grantedStages.map((s) => s.id),
              ),
            );

    const unlockRows =
      grantedStages.length === 0
        ? []
        : await db
            .select({
              stageId: stageUnlocks.stageId,
              userId: stageUnlocks.userId,
            })
            .from(stageUnlocks)
            .where(
              and(
                eq(stageUnlocks.via, "staff"),
                inArray(
                  stageUnlocks.stageId,
                  grantedStages.map((stage) => stage.id),
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
    const unlockedByStage = new Map<string, string[]>();
    for (const row of unlockRows) {
      const list = unlockedByStage.get(row.stageId) ?? [];
      list.push(row.userId);
      unlockedByStage.set(row.stageId, list);
    }

    const profileRows = await db
      .select({
        id: profiles.id,
        display_name: profiles.displayName,
        email: profiles.email,
        role: profiles.role,
        disabled: profiles.disabled,
      })
      .from(profiles);

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
        unlocked_profile_ids: unlockedByStage.get(stage.id) ?? [],
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
    const body = (await c.req.json()) as {
      profile_ids?: unknown;
      unlocked_profile_ids?: unknown;
    };

    if (
      !Array.isArray(body.profile_ids) ||
      !body.profile_ids.every((id) => typeof id === "string")
    ) {
      throw new ApiError("profile_ids は文字列の配列で指定してください", 400);
    }
    const profileIds = [
      ...new Set(body.profile_ids.map((id) => id.trim()).filter((id) => id !== "")),
    ];
    // 省いたとき (undefined) は古い画面。空配列は「入口を全員閉じる」で、省略とは別。
    const requestedUnlocks =
      body.unlocked_profile_ids === undefined
        ? undefined
        : cleanIdList(body.unlocked_profile_ids, "unlocked_profile_ids");
    if (requestedUnlocks !== undefined) {
      const assigned = new Set(profileIds);
      if (requestedUnlocks.some((id) => !assigned.has(id))) {
        throw new ApiError("入口を開けられるのは、割り当てる受講者だけです", 400);
      }
    }

    const stageRows = await db
      .select({
        id: stages.id,
        slug: stages.slug,
        audience: stages.audience,
        parent: stages.parent,
        prerequisites: stages.prerequisites,
      })
      .from(stages)
      .where(eq(stages.id, stageId))
      .limit(1);
    const stage = stageRows[0];
    if (!stage) {
      throw new ApiError("ステージが見つかりません", 404);
    }
    if (stage.audience !== "granted") {
      throw new ApiError("このステージは Extra 講座 (audience=granted) ではありません", 400);
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
        .where(inArray(profiles.id, profileIds));
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
      const ancestors = await loadGrantedPrerequisites(db, stage);
      if (ancestors.length > 0) {
        const existingAncestorRows = await db
          .select({ stageId: stageGrants.stageId, profileId: stageGrants.profileId })
          .from(stageGrants)
          .where(
            and(
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
    const valuesFor = (row: { stageId: string; profileId: string }) => ({
      stageId: row.stageId,
      profileId: row.profileId,
      grantedBy: caller.id,
    });
    const stageInserts = profileIds.map((profileId) =>
      db.insert(stageGrants).values(valuesFor({ stageId, profileId })),
    );
    const ancestorOps = ancestorInserts.map((row) =>
      db.insert(stageGrants).values(valuesFor(row)).onConflictDoNothing(),
    );

    const existingUnlocks = await db
      .select({ userId: stageUnlocks.userId, via: stageUnlocks.via })
      .from(stageUnlocks)
      .where(eq(stageUnlocks.stageId, stageId));
    const assigned = new Set(profileIds);
    // 一意制約は user × stage。腕試しの行がある人へ staff は入らない (上書きしない)。
    const blockedByOtherVia = new Set(
      existingUnlocks.filter((row) => row.via !== "staff").map((row) => row.userId),
    );
    const savedUnlocks =
      requestedUnlocks === undefined
        ? existingUnlocks
            .filter((row) => row.via === "staff" && assigned.has(row.userId))
            .map((row) => row.userId)
        : requestedUnlocks.filter((id) => !blockedByOtherVia.has(id));
    // 指定があるときは requestedUnlocks に無い人だけ消す (空なら staff をすべて)。
    // 省いたとき (古い画面) は、割当 (profileIds) から外した人だけ消す。
    const retainedStaffIds = requestedUnlocks ?? profileIds;
    const deleteAllStaff = retainedStaffIds.length === 0;
    const deleteUnlocks = deleteAllStaff
      ? db
          .delete(stageUnlocks)
          .where(and(eq(stageUnlocks.stageId, stageId), eq(stageUnlocks.via, "staff")))
      : db
          .delete(stageUnlocks)
          .where(
            and(
              eq(stageUnlocks.stageId, stageId),
              eq(stageUnlocks.via, "staff"),
              notInArray(stageUnlocks.userId, retainedStaffIds),
            ),
          );
    const unlockInserts = (requestedUnlocks ?? []).map((userId) =>
      db
        .insert(stageUnlocks)
        .values({
          userId,
          stageId,
          via: "staff",
          unlockedAt: new Date(),
        })
        .onConflictDoNothing({ target: [stageUnlocks.userId, stageUnlocks.stageId] }),
    );
    await db.batch([deleteOp, ...stageInserts, ...ancestorOps, deleteUnlocks, ...unlockInserts]);

    const ancestorGrants = new Map<string, string[]>();
    for (const row of ancestorInserts) {
      const list = ancestorGrants.get(row.stageId) ?? [];
      list.push(row.profileId);
      ancestorGrants.set(row.stageId, list);
    }
    const ancestorGrantList = [...ancestorGrants.entries()].map(([ancestorStageId, ids]) => ({
      stage_id: ancestorStageId,
      profile_ids: ids,
    }));
    await recordAudit(db, caller, {
      action: "stage_grants_replace",
      targetType: "stage",
      targetId: stageId,
      metadata: {
        profile_ids: profileIds,
        unlocked_profile_ids: savedUnlocks,
        ...(ancestorGrantList.length > 0 ? { ancestor_grants: ancestorGrantList } : {}),
      },
      ip: clientIp(c),
    });

    return c.json({
      stage_id: stageId,
      profile_ids: profileIds,
      unlocked_profile_ids: savedUnlocks,
      ancestor_grants: ancestorGrantList,
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});
