/**
 * 専用ステージ (`audience = granted`) のユーザー割当 API。
 *
 *   GET /api/stage-grants … granted ステージ一覧 + 割当先 + 前提を免除したユーザー
 *     + 前提をクリア済みのユーザー + ユーザーピッカー用一覧
 *   GET /api/stage-grants/:stageId/learners … 1 ステージのユーザーを検索・絞り込み・50 人ずつ返す。
 *   PUT /api/stage-grants/:stageId … `{ profile_ids, unlocked_profile_ids? }` で grant を置換。
 *   PATCH /api/stage-grants/:stageId … `{ add, remove, exempt, unexempt }` の差分を 1 回の batch で書く。
 *     応答は `{ stage_id, profile_ids, unlocked_profile_ids, ancestor_grants }`。ancestor_grants は
 *     今回自動で足した祖先の割当 (無ければ空配列。監査ログの ancestor_grants と同じ内容)。
 *
 * `unlocked_profile_ids` は、割り当てたユーザーのうち前提を免除する人 (`stage_unlocks.via = staff`)。
 * 指定すると、そのステージの staff の行のうち指定に無い人だけを消し、指定された人を足す
 * (残した行の日時はそのまま)。省くと、割当から外した人の前提の免除だけを外す。
 * 腕試し (`skill_check`) で開いた行は消さず、上書きもしない。
 * 割り当ても前提の免除も、受講開始は自己開始のまま (`POST /api/stages/:id/start`)。
 * 新たに割り当てたユーザーには、線の親と前提をたどった Extra (granted) のステージにも同じ割当を足す
 * (外したとき、および既にある割当は触らない)。catalog に着いたらそこから先はたどらない。
 * 自動で足す側の insert だけ、同時保存で祖先が重複しても一意制約で失敗しない。
 *
 * `prerequisites_cleared_profile_ids` は、応答の learners のうちそのステージの前提
 * (`stages.prerequisites` の slug すべて) をクリアしている人。前提が空なら全員。
 * 解けない slug は満たしていない。PUT はこの配列を見ない。
 */

import { Hono } from "hono";
import { and, eq, inArray, notInArray } from "drizzle-orm";

import type { Db } from "../db/client.js";
import {
  certificates,
  enrollments,
  learnerInstructors,
  profiles,
  stageGrants,
  stageUnlocks,
  stages,
} from "../db/schema.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import { ApiError, errorResponse, getCaller, requireCanManageStageGrants } from "../lib/authz.js";
import { chunk } from "../lib/enrollment-bulk.js";
import { loadClearedStageIdsByUser } from "../lib/skill-map-data.js";
import { loadGrantedStages, parentSlugFromRow } from "../lib/stage-audience.js";
import {
  ancestorGrantRows,
  assignmentAfterDiff,
  grantRowsByStageStatements,
  groupAncestorGrants,
  parseStageGrantDiff,
  planStageGrantWriteStatements,
  prepareStageGrantDiff,
  stageIdListChunkSize,
} from "../lib/stage-grant-diff.js";
import {
  countStageGrantLearners,
  isAssignableStageGrantProfile,
  listStageGrantLearners,
  parseStageGrantLearnerQuery,
} from "../lib/stage-grant-learners.js";
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

/**
 * 前提 slug をすべてステージ id に解けてクリアしているユーザー。
 * 前提が空なら全員。行が無い (undefined) ときは誰も載せない。解けない slug は未達。
 */
function prerequisitesClearedProfileIds(
  prerequisiteSlugs: readonly string[] | undefined,
  idBySlug: ReadonlyMap<string, string>,
  learnerIds: readonly string[],
  clearedByUser: ReadonlyMap<string, ReadonlySet<string>>,
): string[] {
  if (prerequisiteSlugs === undefined) return [];
  return learnerIds.filter((userId) =>
    prerequisiteSlugs.every((slug) => {
      const stageId = idBySlug.get(slug);
      return stageId !== undefined && (clearedByUser.get(userId)?.has(stageId) ?? false);
    }),
  );
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
 * 線の親と prerequisites をたどり、published な granted の前提ステージを集める。
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
        const selectable = isAssignableStageGrantProfile(row);
        return selectable || grantedProfileIds.has(row.id);
      })
      .sort((a, b) => a.display_name.localeCompare(b.display_name, "ja"))
      .map((row) => ({
        id: row.id,
        display_name: row.display_name,
        email: row.email,
        selectable: isAssignableStageGrantProfile(row),
      }));

    const learnerIds = learners.map((row) => row.id);
    const clearedByUser =
      learnerIds.length === 0 || grantedStages.length === 0
        ? new Map<string, Set<string>>()
        : await loadClearedStageIdsByUser(db, learnerIds);
    const stageRows =
      learnerIds.length === 0 || grantedStages.length === 0
        ? []
        : await db
            .select({
              id: stages.id,
              slug: stages.slug,
              prerequisites: stages.prerequisites,
            })
            .from(stages);
    const idBySlug = new Map<string, string>();
    const prerequisitesByStageId = new Map<string, string[]>();
    for (const row of stageRows) {
      if (!idBySlug.has(row.slug)) idBySlug.set(row.slug, row.id);
      prerequisitesByStageId.set(row.id, prerequisiteSlugsFromRow(row));
    }

    return c.json({
      stages: grantedStages.map((stage) => ({
        id: stage.id,
        slug: stage.slug,
        title: stage.title,
        category: stage.category,
        profile_ids: grantsByStage.get(stage.id) ?? [],
        unlocked_profile_ids: unlockedByStage.get(stage.id) ?? [],
        prerequisites_cleared_profile_ids: prerequisitesClearedProfileIds(
          prerequisitesByStageId.get(stage.id),
          idBySlug,
          learnerIds,
          clearedByUser,
        ),
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
    // 省いたとき (undefined) は古い画面。空配列は「前提の免除を全員外す」で、省略とは別。
    const requestedUnlocks =
      body.unlocked_profile_ids === undefined
        ? undefined
        : cleanIdList(body.unlocked_profile_ids, "unlocked_profile_ids");
    if (requestedUnlocks !== undefined) {
      const assigned = new Set(profileIds);
      if (requestedUnlocks.some((id) => !assigned.has(id))) {
        throw new ApiError("前提を免除できるのは、割り当てるユーザーだけです", 400);
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
      throw new ApiError("このステージは Extra ステージ (audience=granted) ではありません", 400);
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
        throw new ApiError("割当できないユーザーが含まれています", 400);
      }
      const keepable = profileRows.every(
        (row) => isAssignableStageGrantProfile(row) || existingGrantIds.has(row.id),
      );
      if (!keepable) {
        throw new ApiError("割当できないユーザーが含まれています", 400);
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

async function loadGrantStage(db: Db, stageId: string) {
  const rows = await db
    .select({
      id: stages.id,
      slug: stages.slug,
      title: stages.title,
      category: stages.category,
      audience: stages.audience,
      parent: stages.parent,
      prerequisites: stages.prerequisites,
    })
    .from(stages)
    .where(eq(stages.id, stageId))
    .limit(1);
  const stage = rows[0];
  if (!stage) throw new ApiError("ステージが見つかりません", 404);
  if (stage.audience !== "granted") {
    throw new ApiError("このステージは Extra ステージ (audience=granted) ではありません", 400);
  }
  return stage;
}

function rememberStage(map: Map<string, Set<string>>, userId: string, stageId: string) {
  const set = map.get(userId);
  if (set) set.add(stageId);
  else map.set(userId, new Set([stageId]));
}

/** 前提 slug を id と題名に解く。ユーザー id は並べない。 */
async function loadStagesBySlug(db: Db, slugs: readonly string[]) {
  const map = new Map<string, { id: string; title: string }>();
  const unique = [...new Set(slugs)];
  if (unique.length === 0) return map;
  const size = stageIdListChunkSize((database, ids) =>
    database
      .select({ id: stages.id, slug: stages.slug, title: stages.title })
      .from(stages)
      .where(inArray(stages.slug, ids)),
  );
  for (const part of chunk(unique, size)) {
    const rows = await db
      .select({ id: stages.id, slug: stages.slug, title: stages.title })
      .from(stages)
      .where(inArray(stages.slug, part));
    for (const row of rows) {
      if (!map.has(row.slug)) map.set(row.slug, { id: row.id, title: row.title });
    }
  }
  return map;
}

/**
 * 前提ステージ (数個) の受講登録と、取り消されていない修了証。
 * クリアは `loadClearedStageIds` と同じ (completed か有効な修了証)。
 */
async function loadPrerequisiteProgress(db: Db, stageIds: readonly string[]) {
  const cleared = new Map<string, Set<string>>();
  const enrolled = new Map<string, Set<string>>();
  if (stageIds.length === 0) return { cleared, enrolled };
  const enrollmentSize = stageIdListChunkSize((database, ids) =>
    database
      .select({
        userId: enrollments.userId,
        stageId: enrollments.stageId,
        status: enrollments.status,
      })
      .from(enrollments)
      .where(inArray(enrollments.stageId, ids)),
  );
  const certificateSize = stageIdListChunkSize((database, ids) =>
    database
      .select({ userId: certificates.userId, stageId: certificates.stageId })
      .from(certificates)
      .where(and(inArray(certificates.stageId, ids), eq(certificates.revoked, false))),
  );
  for (const part of chunk([...stageIds], enrollmentSize)) {
    const rows = await db
      .select({
        userId: enrollments.userId,
        stageId: enrollments.stageId,
        status: enrollments.status,
      })
      .from(enrollments)
      .where(inArray(enrollments.stageId, part));
    for (const row of rows) {
      rememberStage(enrolled, row.userId, row.stageId);
      if (row.status === "completed") rememberStage(cleared, row.userId, row.stageId);
    }
  }
  for (const part of chunk([...stageIds], certificateSize)) {
    const rows = await db
      .select({ userId: certificates.userId, stageId: certificates.stageId })
      .from(certificates)
      .where(and(inArray(certificates.stageId, part), eq(certificates.revoked, false)));
    for (const row of rows) rememberStage(cleared, row.userId, row.stageId);
  }
  return { cleared, enrolled };
}

async function loadExistingGrantKeys(db: Db, stageIds: readonly string[]) {
  const keys = new Set<string>();
  for (const statement of grantRowsByStageStatements(db, stageIds)) {
    const rows = await statement;
    for (const row of rows) keys.add(`${row.stageId}\0${row.profileId}`);
  }
  return keys;
}

stageGrantsRoute.get("/api/stage-grants/:stageId/learners", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireCanManageStageGrants(caller);
    const parsed = parseStageGrantLearnerQuery({
      q: c.req.query("q"),
      status: c.req.query("status"),
      instructor: c.req.query("instructor"),
      prereq: c.req.query("prereq"),
      offset: c.req.query("offset"),
      limit: c.req.query("limit"),
    });
    if (!parsed.ok) throw new ApiError(parsed.error, 400);

    const stage = await loadGrantStage(db, c.req.param("stageId"));
    const slugs = prerequisiteSlugsFromRow(stage);
    const [profileRows, grantRows, unlockRows, links, stagesBySlug] = await Promise.all([
      db
        .select({
          id: profiles.id,
          display_name: profiles.displayName,
          email: profiles.email,
          role: profiles.role,
          disabled: profiles.disabled,
        })
        .from(profiles),
      db
        .select({ profileId: stageGrants.profileId })
        .from(stageGrants)
        .where(eq(stageGrants.stageId, stage.id)),
      db
        .select({ userId: stageUnlocks.userId, via: stageUnlocks.via })
        .from(stageUnlocks)
        .where(eq(stageUnlocks.stageId, stage.id)),
      db
        .select({
          learnerId: learnerInstructors.learnerId,
          instructorId: learnerInstructors.instructorId,
        })
        .from(learnerInstructors),
      loadStagesBySlug(db, slugs),
    ]);
    const prereqIds = [
      ...new Set(
        slugs.flatMap((slug) => {
          const id = stagesBySlug.get(slug)?.id;
          return id === undefined ? [] : [id];
        }),
      ),
    ];
    const progress = await loadPrerequisiteProgress(db, prereqIds);
    const listed = listStageGrantLearners(
      {
        profiles: profileRows,
        instructorLinks: links,
        assignedIds: new Set(grantRows.map((row) => row.profileId)),
        staffUnlockIds: new Set(
          unlockRows.filter((row) => row.via === "staff").map((row) => row.userId),
        ),
        skillCheckUnlockIds: new Set(
          unlockRows.filter((row) => row.via === "skill_check").map((row) => row.userId),
        ),
        prerequisiteSlugs: slugs,
        stagesBySlug,
        clearedByUser: progress.cleared,
        enrolledByUser: progress.enrolled,
      },
      parsed.value,
      caller.id,
    );
    return c.json({
      stage: {
        id: stage.id,
        slug: stage.slug,
        title: stage.title,
        category: stage.category,
        prerequisites: listed.prerequisites,
      },
      counts: listed.counts,
      instructors: listed.instructors,
      total: listed.total,
      next_offset: listed.next_offset,
      learners: listed.learners,
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

stageGrantsRoute.patch("/api/stage-grants/:stageId", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireCanManageStageGrants(caller);
    const stageId = c.req.param("stageId");
    const parsed = parseStageGrantDiff(await c.req.json());
    if (!parsed.ok) throw new ApiError(parsed.error, 400);

    const stage = await loadGrantStage(db, stageId);
    const [profileRows, grantRows, unlockRows] = await Promise.all([
      db
        .select({ id: profiles.id, role: profiles.role, disabled: profiles.disabled })
        .from(profiles),
      db
        .select({ profileId: stageGrants.profileId })
        .from(stageGrants)
        .where(eq(stageGrants.stageId, stageId)),
      db
        .select({ userId: stageUnlocks.userId, via: stageUnlocks.via })
        .from(stageUnlocks)
        .where(eq(stageUnlocks.stageId, stageId)),
    ]);
    const prepared = prepareStageGrantDiff(
      parsed.value,
      new Map(profileRows.map((row) => [row.id, row])),
      new Set(grantRows.map((row) => row.profileId)),
      new Set(unlockRows.filter((row) => row.via !== "staff").map((row) => row.userId)),
    );
    if (!prepared.ok) throw new ApiError(prepared.error, 400);
    const plan = prepared.value;

    let ancestorRows: { stageId: string; profileId: string }[] = [];
    if (plan.added.length > 0) {
      const ancestors = await loadGrantedPrerequisites(db, stage);
      if (ancestors.length > 0) {
        ancestorRows = ancestorGrantRows(
          ancestors.map((row) => row.id),
          plan.added,
          await loadExistingGrantKeys(
            db,
            ancestors.map((row) => row.id),
          ),
        );
      }
    }
    const statements = planStageGrantWriteStatements(db, {
      stageId,
      grantedBy: caller.id,
      grantRows: [...plan.added.map((profileId) => ({ stageId, profileId })), ...ancestorRows],
      removeProfileIds: plan.removed,
      deleteStaffUserIds: plan.deleteStaffIds,
      exemptUserIds: plan.exempted,
    });
    const [first, ...rest] = statements;
    if (first) await db.batch([first, ...rest]);

    const assigned = new Set(grantRows.map((row) => row.profileId));
    const staffUnlocks = new Set(
      unlockRows.filter((row) => row.via === "staff").map((row) => row.userId),
    );
    const next = assignmentAfterDiff(assigned, staffUnlocks, plan);
    const counts = countStageGrantLearners(profileRows, next.assigned, next.staffUnlocks);
    const ancestorGrants = groupAncestorGrants(ancestorRows);
    await recordAudit(db, caller, {
      action: "stage_grants_update",
      targetType: "stage",
      targetId: stageId,
      metadata: {
        added: plan.added,
        removed: plan.removed,
        exempted: plan.exempted,
        unexempted: plan.unexempted,
        ...(ancestorGrants.length > 0 ? { ancestor_grants: ancestorGrants } : {}),
      },
      ip: clientIp(c),
    });
    return c.json({ stage_id: stageId, counts, ancestor_grants: ancestorGrants });
  } catch (err) {
    return errorResponse(c, err);
  }
});
