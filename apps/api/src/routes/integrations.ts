import { INTEGRATION_GROUP_KEY } from "@stella/shared/integrations/types";
import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { isValidEmail } from "@stella/shared/admin/types";
import type { IntegrationMemberResult } from "@stella/shared/integrations/types";
import { readIntegrationProgress, readIntegrationEvents } from "../lib/integration-read.js";
import { inviteUser } from "../lib/auth-users.js";
import {
  addGroupMemberStatement,
  createOrRenameGroup,
  removeGroupMember,
  replaceGroupStages,
} from "../lib/groups.js";
import { groupMembers, groupStages, profiles, stages } from "../db/schema.js";
import { errorResponse } from "../lib/authz.js";
import {
  authenticateIntegration,
  listIntegrationGroups,
  requireScope,
  requireOwnGroup,
  type IntegrationAuth,
} from "../lib/integrations.js";

export const integrationsRoute = new Hono<IntegrationAuth>();
integrationsRoute.onError((err, c) => errorResponse(c, err));
integrationsRoute.use("/api/integrations/v1/*", authenticateIntegration);
integrationsRoute.get("/api/integrations/v1/me", async (c) => {
  const client = c.get("integrationClient");
  const groups = await listIntegrationGroups(c.get("integrationDb"), client.id);
  return c.json({
    client: { name: client.name, scopes: client.scopes },
    groups: groups.map(({ key, name, memberCount }) => ({ key, name, memberCount })),
  });
});
integrationsRoute.put(
  "/api/integrations/v1/groups/:key",
  requireScope("groups:write"),
  async (c) => {
    try {
      const key = c.req.param("key");
      const body: unknown = await c.req.json().catch(() => null);
      if (
        !INTEGRATION_GROUP_KEY.test(key) ||
        !body ||
        typeof body !== "object" ||
        !("name" in body) ||
        typeof body.name !== "string" ||
        !body.name.trim() ||
        body.name.trim().length > 200
      )
        return c.json({ error: "Invalid key or name" }, 400);
      const db = c.get("integrationDb");
      const clientId = c.get("integrationClient").id;
      const group = await createOrRenameGroup(db, {
        clientId,
        externalKey: key,
        name: body.name.trim(),
      });
      c.set("integrationGroupId", group.id);
      c.set("integrationCounts", { groups: 1 });
      return c.json({ group: { key: group.externalKey, name: group.name } });
    } catch (err) {
      return errorResponse(c, err);
    }
  },
);

integrationsRoute.put(
  "/api/integrations/v1/groups/:key/members",
  requireScope("members:write"),
  async (c) => {
    const db = c.get("integrationDb");
    const client = c.get("integrationClient");
    const group = await requireOwnGroup(db, client.id, c.req.param("key"));
    c.set("integrationGroupId", group.id);
    const body = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (!body || !Array.isArray(body.members) || body.members.length > 100)
      return c.json({ error: "members must be an array of at most 100 people" }, 400);
    const results: IntegrationMemberResult[] = [];
    const currentMembers = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, group.id));
    const memberIds = new Set(currentMembers.map((member) => member.profileId));
    const externalByProfile = new Map(
      currentMembers.map((member) => [member.profileId, member.externalId]),
    );
    const profileByExternal = new Map(
      currentMembers.flatMap((member) =>
        member.externalId === null ? [] : [[member.externalId, member.profileId] as const],
      ),
    );
    const membershipWrites: { index: number; statement: D1PreparedStatement }[] = [];
    for (const [index, raw] of body.members.entries()) {
      const row =
        raw && typeof raw === "object" && !Array.isArray(raw)
          ? (raw as Record<string, unknown>)
          : {};
      const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
      const fail = (code: NonNullable<IntegrationMemberResult["code"]>) =>
        results.push({ index, status: "failed", id: null, code });
      if (!isValidEmail(email)) {
        fail("invalid_email");
        continue;
      }
      const peerName = typeof row.peerName === "string" ? row.peerName.trim() : row.peerName;
      if (
        (peerName !== undefined &&
          peerName !== null &&
          (typeof peerName !== "string" ||
            peerName.length === 0 ||
            [...peerName].length > 50 ||
            peerName.includes("\0"))) ||
        (row.displayName !== undefined &&
          (typeof row.displayName !== "string" || row.displayName.length > 200)) ||
        (row.externalId !== undefined &&
          row.externalId !== null &&
          (typeof row.externalId !== "string" ||
            !row.externalId.trim() ||
            row.externalId.length > 200))
      ) {
        fail("invalid_member");
        continue;
      }
      const externalId = typeof row.externalId === "string" ? row.externalId.trim() : null;
      let [existing] = await db
        .select()
        .from(profiles)
        .where(sql`lower(${profiles.email}) = ${email}`)
        .limit(1);
      if (existing && (existing.role !== "student" || existing.disabled)) {
        fail("not_invitable");
        continue;
      }
      if (externalId !== null) {
        const owner = profileByExternal.get(externalId);
        if (owner !== undefined && owner !== existing?.id) {
          fail("external_id_conflict");
          continue;
        }
      }
      let id = existing?.id;
      if (!id) {
        try {
          id = await inviteUser(db, {
            email,
            displayName:
              typeof row.displayName === "string" && row.displayName.trim()
                ? row.displayName.trim()
                : email.split("@")[0] || email,
            role: "student",
          });
        } catch {
          // 別の要求が同じ人を先に招待していたら、そのプロフィールで続ける。
          [existing] = await db
            .select()
            .from(profiles)
            .where(sql`lower(${profiles.email}) = ${email}`)
            .limit(1);
          if (!existing) {
            fail("invite_failed");
            continue;
          }
          if (existing.role !== "student" || existing.disabled) {
            fail("not_invitable");
            continue;
          }
          if (externalId !== null) {
            const owner = profileByExternal.get(externalId);
            const [savedOwner] = await db
              .select({ profileId: groupMembers.profileId })
              .from(groupMembers)
              .where(
                and(eq(groupMembers.groupId, group.id), eq(groupMembers.externalId, externalId)),
              )
              .limit(1);
            if (
              (owner !== undefined && owner !== existing.id) ||
              (savedOwner && savedOwner.profileId !== existing.id)
            ) {
              fail("external_id_conflict");
              continue;
            }
          }
          id = existing.id;
        }
      }
      const alreadyMember = memberIds.has(id);
      memberIds.add(id);
      if (row.externalId !== undefined) {
        const oldExternal = externalByProfile.get(id);
        if (oldExternal) profileByExternal.delete(oldExternal);
        externalByProfile.set(id, externalId);
        if (externalId !== null) profileByExternal.set(externalId, id);
      }
      membershipWrites.push({
        index,
        statement: addGroupMemberStatement(c.env.DB, group.id, id, {
          externalId: row.externalId === undefined ? undefined : externalId,
          peerName,
        }),
      });
      results.push({
        index,
        id,
        status: alreadyMember ? "already_member" : existing ? "existing" : "invited",
      });
    }
    if (membershipWrites.length > 0) {
      const writes = await c.env.DB.batch(membershipWrites.map(({ statement }) => statement));
      for (const [position, { index }] of membershipWrites.entries()) {
        if (writes[position]?.results.length === 0) {
          results[index] = { index, status: "failed", id: null, code: "not_invitable" };
        }
      }
    }
    c.set("integrationCounts", {
      requested: body.members.length,
      succeeded: results.filter((r) => r.status !== "failed").length,
    });
    return c.json({ results });
  },
);

integrationsRoute.delete(
  "/api/integrations/v1/groups/:key/members/:id",
  requireScope("members:write"),
  async (c) => {
    const db = c.get("integrationDb");
    const group = await requireOwnGroup(db, c.get("integrationClient").id, c.req.param("key"));
    c.set("integrationGroupId", group.id);
    const by = c.req.query("by");
    if (by !== undefined && by !== "external") return c.json({ error: "Invalid by" }, 400);
    const [member] = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, group.id),
          eq(
            by === "external" ? groupMembers.externalId : groupMembers.profileId,
            c.req.param("id"),
          ),
        ),
      )
      .limit(1);
    if (!member) return c.json({ error: "Not found" }, 404);
    await removeGroupMember(db, group.id, member.profileId);
    c.set("integrationCounts", { removed: 1 });
    return c.json({ removed: true });
  },
);

integrationsRoute.get(
  "/api/integrations/v1/groups/:key/stages",
  requireScope("stages:write"),
  async (c) => {
    const db = c.get("integrationDb");
    const group = await requireOwnGroup(db, c.get("integrationClient").id, c.req.param("key"));
    c.set("integrationGroupId", group.id);
    const rows = await db
      .select({
        slug: stages.slug,
        due_at: groupStages.dueAt,
        message: groupStages.message,
        exempt: groupStages.exempt,
      })
      .from(groupStages)
      .innerJoin(stages, eq(stages.id, groupStages.stageId))
      .where(eq(groupStages.groupId, group.id))
      .orderBy(stages.slug);
    return c.json({ stages: rows });
  },
);

integrationsRoute.put(
  "/api/integrations/v1/groups/:key/stages",
  requireScope("stages:write"),
  async (c) => {
    const db = c.get("integrationDb");
    const client = c.get("integrationClient");
    const group = await requireOwnGroup(db, client.id, c.req.param("key"));
    c.set("integrationGroupId", group.id);
    const body = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (!body || !Array.isArray(body.stages) || body.stages.length > 100)
      return c.json({ error: "stages must be an array of at most 100 stages" }, 400);
    const result = await replaceGroupStages(db, group, body.stages, client.allowedStagePrefixes);
    if (!result.ok) return c.json({ error: "Invalid stages", errors: result.errors }, 400);
    c.set("integrationCounts", { stages: result.stages.length });
    return c.json({ stages: result.stages });
  },
);

for (const kind of ["progress", "events"] as const) {
  integrationsRoute.get(
    `/api/integrations/v1/groups/:key/${kind}`,
    requireScope(`${kind}:read`),
    async (c) => {
      const db = c.get("integrationDb");
      const group = await requireOwnGroup(db, c.get("integrationClient").id, c.req.param("key"));
      c.set("integrationGroupId", group.id);
      return c.json(
        kind === "progress"
          ? await readIntegrationProgress(db, group.id, {
              stage: c.req.query("stage"),
              at: c.req.query("at"),
              cursor: c.req.query("cursor"),
            })
          : await readIntegrationEvents(db, group.id, c.req.query("after")),
      );
    },
  );
}
