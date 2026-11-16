import { INTEGRATION_GROUP_KEY } from "@stella/shared/integrations/types";
import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { isValidEmail } from "@stella/shared/admin/types";
import type {
  IntegrationMemberResult,
  IntegrationStageInput,
} from "@stella/shared/integrations/types";
import { readIntegrationProgress, readIntegrationEvents } from "../lib/integration-read.js";
import { parentSlugFromRow } from "../lib/stage-audience.js";
import { inviteUser } from "../lib/auth-users.js";
import {
  applyGroupStageStatements,
  removeGroupGrantStatements,
  parseIntegrationStage,
} from "../lib/integration-write.js";
import {
  integrationGroups,
  integrationGroupMembers,
  integrationGroupStages,
  profiles,
  stages,
} from "../db/schema.js";
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
      await db
        .insert(integrationGroups)
        .values({ clientId, key, name: body.name.trim() })
        .onConflictDoUpdate({
          target: [integrationGroups.clientId, integrationGroups.key],
          set: { name: body.name.trim(), updatedAt: new Date() },
        });
      const group = await requireOwnGroup(db, clientId, key);
      c.set("integrationGroupId", group.id);
      c.set("integrationCounts", { groups: 1 });
      return c.json({ group: { key: group.key, name: group.name } });
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
      .from(integrationGroupMembers)
      .where(eq(integrationGroupMembers.groupId, group.id));
    const memberIds = new Set(currentMembers.map((member) => member.profileId));
    const externalByProfile = new Map(
      currentMembers.map((member) => [member.profileId, member.externalId]),
    );
    const profileByExternal = new Map(
      currentMembers.flatMap((member) =>
        member.externalId === null ? [] : [[member.externalId, member.profileId] as const],
      ),
    );
    const membershipStatements: D1PreparedStatement[] = [];
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
      if (
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
      const [existing] = await db
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
          fail("invite_failed");
          continue;
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
      const binding = c.env.DB;
      const membership =
        row.externalId === undefined
          ? binding.prepare(
              "INSERT INTO integration_group_members(group_id, profile_id, external_id, joined_at) VALUES (?, ?, ?, ?) ON CONFLICT(group_id, profile_id) DO NOTHING",
            )
          : binding.prepare(
              "INSERT INTO integration_group_members(group_id, profile_id, external_id, joined_at) VALUES (?, ?, ?, ?) ON CONFLICT(group_id, profile_id) DO UPDATE SET external_id = excluded.external_id",
            );
      membershipStatements.push(membership.bind(group.id, id, externalId, Date.now()));
      results.push({
        index,
        id,
        status: alreadyMember ? "already_member" : existing ? "existing" : "invited",
      });
    }
    if (membershipStatements.length > 0)
      await c.env.DB.batch([
        ...membershipStatements,
        ...applyGroupStageStatements(c.env.DB, group.id, client.name),
      ]);
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
      .from(integrationGroupMembers)
      .where(
        and(
          eq(integrationGroupMembers.groupId, group.id),
          eq(
            by === "external"
              ? integrationGroupMembers.externalId
              : integrationGroupMembers.profileId,
            c.req.param("id"),
          ),
        ),
      )
      .limit(1);
    if (!member) return c.json({ error: "Not found" }, 404);
    await c.env.DB.batch([
      ...removeGroupGrantStatements(c.env.DB, group.id, member.profileId),
      c.env.DB.prepare(
        "DELETE FROM integration_group_members WHERE group_id = ? AND profile_id = ?",
      ).bind(group.id, member.profileId),
    ]);
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
        due_at: integrationGroupStages.dueAt,
        message: integrationGroupStages.message,
        exempt: integrationGroupStages.exempt,
      })
      .from(integrationGroupStages)
      .innerJoin(stages, eq(stages.id, integrationGroupStages.stageId))
      .where(eq(integrationGroupStages.groupId, group.id))
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
    const errors: { slug: unknown; code: string }[] = [];
    const settings: (Required<IntegrationStageInput> & { stageId: string })[] = [];
    const seen = new Set<string>();
    const stageRows = new Map<string, typeof stages.$inferSelect>();
    for (const raw of body.stages) {
      let input: Required<IntegrationStageInput>;
      try {
        input = parseIntegrationStage(raw);
      } catch {
        errors.push({
          slug:
            raw && typeof raw === "object" ? ((raw as Record<string, unknown>).slug ?? null) : null,
          code: "invalid_stage",
        });
        continue;
      }
      if (seen.has(input.slug)) {
        errors.push({ slug: input.slug, code: "duplicate_slug" });
        continue;
      }
      seen.add(input.slug);
      if (!client.allowedStagePrefixes.some((prefix) => input.slug.startsWith(prefix))) {
        errors.push({ slug: input.slug, code: "prefix_not_allowed" });
        continue;
      }
      const [stage] = await db.select().from(stages).where(eq(stages.slug, input.slug)).limit(1);
      if (stage?.audience !== "granted") {
        errors.push({ slug: input.slug, code: "not_granted" });
        continue;
      }
      stageRows.set(stage.slug, stage);
      settings.push({ ...input, stageId: stage.id });
    }
    if (errors.length) return c.json({ error: "Invalid stages", errors }, 400);
    // 親を自動で割り当てると、クライアントに許した接頭辞の外まで広がりうる。
    // 同じ要求に granted の祖先がすべて含まれることを、書き込み前に確かめる。
    const included = new Set(settings.map((setting) => setting.slug));
    const missingParents = new Set<string>();
    for (const setting of settings) {
      let row = stageRows.get(setting.slug);
      const visited = new Set<string>([setting.slug]);
      while (row) {
        const parentSlug = parentSlugFromRow(row);
        if (!parentSlug || visited.has(parentSlug)) break;
        visited.add(parentSlug);
        row = stageRows.get(parentSlug);
        if (!row) {
          [row] = await db.select().from(stages).where(eq(stages.slug, parentSlug)).limit(1);
          if (row) stageRows.set(parentSlug, row);
        }
        if (row?.audience === "granted" && !included.has(parentSlug))
          missingParents.add(parentSlug);
      }
    }
    for (const slug of missingParents) errors.push({ slug, code: "parent_not_included" });
    if (errors.length) return c.json({ error: "Invalid stages", errors }, 400);
    const binding = c.env.DB;
    await binding.batch([
      binding.prepare("DELETE FROM integration_group_stages WHERE group_id = ?").bind(group.id),
      ...settings.map((s) =>
        binding
          .prepare(
            "INSERT INTO integration_group_stages(group_id, stage_id, due_at, message, exempt) VALUES (?, ?, ?, ?, ?)",
          )
          .bind(group.id, s.stageId, s.due_at, s.message, s.exempt ? 1 : 0),
      ),
      ...removeGroupGrantStatements(binding, group.id),
      ...applyGroupStageStatements(binding, group.id, client.name),
    ]);
    c.set("integrationCounts", { stages: settings.length });
    return c.json({ stages: settings.map(({ stageId: _, ...setting }) => setting) });
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
