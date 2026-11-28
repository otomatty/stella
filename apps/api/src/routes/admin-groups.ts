import type { AuditAction } from "@stella/shared/admin/audit-actions";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { Hono, type Context } from "hono";
import type { Db } from "../db/client.js";
import {
  groupMembers,
  groups,
  groupStages,
  integrationClients,
  profiles,
  stages,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import { ApiError, errorResponse, getCaller, requireAdmin, type Caller } from "../lib/authz.js";
import {
  createOrRenameGroup,
  deleteAdminGroup,
  patchAdminGroupMembers,
  replaceGroupStages,
  setGroupPeerName,
} from "../lib/groups.js";
import { readGroupProgress } from "../lib/integration-read.js";
import { learnerOnly } from "../lib/learner-scope.js";

type AdminGroupsEnv = { Bindings: Env; Variables: { caller: Caller; db: Db } };
export const adminGroupsRoute = new Hono<AdminGroupsEnv>();

const ROOT = "/api/admin/groups";

adminGroupsRoute.onError((err, c) => errorResponse(c, err));
adminGroupsRoute.use(`${ROOT}/*`, async (c, next) => {
  c.header("Cache-Control", "no-store");
  const { caller, db } = await getCaller(c);
  requireAdmin(caller);
  c.set("caller", caller);
  c.set("db", db);
  await next();
});

function groupSummaries(db: Db, filter?: SQL) {
  return db
    .select({
      id: groups.id,
      name: groups.name,
      kind: sql<
        "admin" | "integration"
      >`case when ${groups.clientId} is null then 'admin' else 'integration' end`,
      clientName: integrationClients.name,
      key: groups.externalKey,
      memberCount: sql<number>`(select count(*) from ${groupMembers}
        where ${groupMembers.groupId} = ${groups.id} and ${learnerOnly(groupMembers.profileId)})`,
      stageCount: sql<number>`(select count(*) from ${groupStages} where ${groupStages.groupId} = ${groups.id})`,
      shareProgress: groups.shareProgress,
      shareActivity: groups.shareActivity,
      updatedAt: groups.updatedAt,
    })
    .from(groups)
    .leftJoin(integrationClients, eq(integrationClients.id, groups.clientId))
    .where(filter)
    .orderBy(groups.name, groups.id);
}

async function requireGroup(db: Db, id: string) {
  const [group] = await db
    .select({ id: groups.id, clientId: groups.clientId })
    .from(groups)
    .where(eq(groups.id, id));
  if (!group) throw new ApiError("Not found", 404);
  return group;
}

function requireAdminOwnedGroup(group: { clientId: string | null }) {
  if (group.clientId !== null) throw new ApiError("連携のグループは連携 API で編集します", 403);
}

async function readBody(c: Context<AdminGroupsEnv>) {
  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new ApiError("変更内容はオブジェクトで指定してください", 400);
  return body;
}

function readName(value: unknown, limit: number, label: string) {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name || [...name].length > limit || name.includes("\0"))
    throw new ApiError(`${label}は1〜${limit}文字で指定してください`, 400);
  return name;
}

function readProfileIds(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((id) => typeof id === "string"))
    throw new ApiError("プロフィール ID は文字列の配列で指定してください", 400);
  return value;
}

function auditGroup(
  c: Context<AdminGroupsEnv>,
  action: AuditAction,
  id: string,
  metadata?: Record<string, unknown>,
) {
  return recordAudit(c.get("db"), c.get("caller"), {
    action,
    targetType: "group",
    targetId: id,
    ip: clientIp(c),
    metadata,
  });
}

adminGroupsRoute.get(ROOT, async (c) => {
  const clientId = c.req.query("clientId");
  return c.json({
    groups: await groupSummaries(
      c.get("db"),
      clientId === undefined ? undefined : eq(groups.clientId, clientId),
    ),
  });
});

adminGroupsRoute.post(ROOT, async (c) => {
  const db = c.get("db");
  const body = await readBody(c);
  const saved = await createOrRenameGroup(db, {
    name: readName(body.name, 200, "グループ名"),
    createdBy: c.get("caller").id,
  });
  await auditGroup(c, "group_create", saved.id);
  return c.json(
    {
      group: {
        id: saved.id,
        name: saved.name,
        kind: "admin" as const,
        clientName: null,
        key: null,
        memberCount: 0,
        stageCount: 0,
        shareProgress: saved.shareProgress,
        shareActivity: saved.shareActivity,
        updatedAt: saved.updatedAt,
      },
    },
    201,
  );
});

adminGroupsRoute.get(`${ROOT}/:id`, async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const [group] = await groupSummaries(db, eq(groups.id, id));
  if (!group) throw new ApiError("Not found", 404);
  const [members, settings] = await Promise.all([
    db
      .select({
        id: profiles.id,
        displayName: profiles.displayName,
        email: profiles.email,
        peerName: groupMembers.peerName,
        externalId: groupMembers.externalId,
        joinedAt: groupMembers.joinedAt,
      })
      .from(groupMembers)
      .innerJoin(profiles, eq(profiles.id, groupMembers.profileId))
      .where(and(eq(groupMembers.groupId, id), learnerOnly(profiles.id)))
      .orderBy(profiles.displayName, profiles.id),
    db
      .select({
        id: stages.id,
        slug: stages.slug,
        title: stages.title,
        dueAt: groupStages.dueAt,
        message: groupStages.message,
        exempt: groupStages.exempt,
      })
      .from(groupStages)
      .innerJoin(stages, eq(stages.id, groupStages.stageId))
      .where(eq(groupStages.groupId, id))
      .orderBy(stages.title, stages.id),
  ]);
  return c.json({ group, members, stages: settings });
});

adminGroupsRoute.patch(`${ROOT}/:id`, async (c) => {
  const db = c.get("db");
  const group = await requireGroup(db, c.req.param("id"));
  const { name, shareProgress, shareActivity } = await readBody(c);
  if (name !== undefined) requireAdminOwnedGroup(group);
  if (shareProgress !== undefined && typeof shareProgress !== "boolean")
    throw new ApiError("shareProgress は真偽値で指定してください", 400);
  if (shareActivity !== undefined && typeof shareActivity !== "boolean")
    throw new ApiError("shareActivity は真偽値で指定してください", 400);
  if (name !== undefined) {
    await createOrRenameGroup(db, {
      id: group.id,
      name: readName(name, 200, "グループ名"),
      shareProgress,
      shareActivity,
    });
  } else if (shareProgress !== undefined) {
    await createOrRenameGroup(db, { id: group.id, shareProgress, shareActivity });
  } else if (shareActivity !== undefined) {
    await createOrRenameGroup(db, { id: group.id, shareActivity });
  } else {
    throw new ApiError("変更内容を指定してください", 400);
  }
  await auditGroup(c, "group_update", group.id, {
    renamed: name !== undefined,
    shareProgress,
    shareActivity,
  });
  return c.json({ ok: true });
});

adminGroupsRoute.delete(`${ROOT}/:id`, async (c) => {
  const db = c.get("db");
  const group = await requireGroup(db, c.req.param("id"));
  requireAdminOwnedGroup(group);
  await deleteAdminGroup(db, group.id);
  await auditGroup(c, "group_delete", group.id);
  return c.json({ ok: true });
});

adminGroupsRoute.patch(`${ROOT}/:id/members`, async (c) => {
  const db = c.get("db");
  const group = await requireGroup(db, c.req.param("id"));
  requireAdminOwnedGroup(group);
  const body = await readBody(c);
  const add = readProfileIds(body.add);
  const remove = readProfileIds(body.remove);
  if (add.length + remove.length > 100) throw new ApiError("追加と削除は合計100件までです", 400);
  const addedIds = new Set(add);
  const { invalidIds, added, removed } = await patchAdminGroupMembers(
    db,
    group.id,
    [...addedIds],
    remove.filter((id) => !addedIds.has(id)),
  );
  if (invalidIds.length)
    return c.json({ error: "追加できない受講者が含まれています", invalidIds }, 400);
  if (added || removed) await auditGroup(c, "group_members_update", group.id, { added, removed });
  return c.json({ ok: true });
});

adminGroupsRoute.patch(`${ROOT}/:id/members/:profileId`, async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const profileId = c.req.param("profileId");
  const body = await readBody(c);
  const peerName = body.peerName === null ? null : readName(body.peerName, 50, "呼び名");
  await setGroupPeerName(db, id, profileId, peerName);
  await auditGroup(c, "group_peer_name_update", id, { profileId, cleared: peerName === null });
  return c.json({ ok: true });
});

adminGroupsRoute.put(`${ROOT}/:id/stages`, async (c) => {
  const db = c.get("db");
  const group = await requireGroup(db, c.req.param("id"));
  requireAdminOwnedGroup(group);
  const body = await readBody(c);
  if (!Array.isArray(body.stages)) throw new ApiError("stages must be an array", 400);
  const result = await replaceGroupStages(db, group, body.stages);
  if (!result.ok) return c.json({ error: "Invalid stages", errors: result.errors }, 400);
  await auditGroup(c, "group_stages_replace", group.id, { count: result.stages.length });
  return c.json({ stages: result.stages });
});

adminGroupsRoute.get(`${ROOT}/:id/progress`, async (c) => {
  const db = c.get("db");
  const group = await requireGroup(db, c.req.param("id"));
  return c.json(
    await readGroupProgress(db, group.id, {
      stage: c.req.query("stage"),
      cursor: c.req.query("cursor"),
    }),
  );
});
