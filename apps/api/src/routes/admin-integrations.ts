import { isIntegrationScopes } from "@stella/shared/integrations/types";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { integrationClients } from "../db/schema.js";
import type { Env } from "../env.js";
import { ApiError, errorResponse, getCaller, requireAdmin } from "../lib/authz.js";
import { recordAudit } from "../lib/audit.js";
import { listIntegrationGroups, newIntegrationToken } from "../lib/integrations.js";

export const adminIntegrationsRoute = new Hono<{ Bindings: Env }>();
const publicClient = (r: typeof integrationClients.$inferSelect) => ({
  id: r.id,
  name: r.name,
  tokenPrefix: r.tokenPrefix,
  scopes: r.scopes,
  enabled: r.enabled,
  lastUsedAt: r.lastUsedAt,
  createdBy: r.createdBy,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});
// フィルターの選択肢は staff 全員が読む。クライアントの管理は platform_admin のみ。
adminIntegrationsRoute.get("/api/admin/integration-groups", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireAdmin(caller);
    return c.json({ groups: await listIntegrationGroups(db) });
  } catch (err) {
    return errorResponse(c, err);
  }
});
adminIntegrationsRoute.use("/api/admin/integrations/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  try {
    const { caller } = await getCaller(c);
    if (caller.role !== "platform_admin") throw new ApiError("権限がありません", 403);
    await next();
  } catch (err) {
    return errorResponse(c, err);
  }
});
adminIntegrationsRoute.get("/api/admin/integrations", async (c) => {
  try {
    const { db } = await getCaller(c);
    const rows = await db.select().from(integrationClients).orderBy(integrationClients.createdAt);
    return c.json({ clients: rows.map(publicClient) });
  } catch (err) {
    return errorResponse(c, err);
  }
});
adminIntegrationsRoute.post("/api/admin/integrations", async (c) => {
  try {
    const { db, caller } = await getCaller(c);
    const body = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (
      !body ||
      typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.trim().length > 200 ||
      !isIntegrationScopes(body.scopes)
    )
      return c.json({ error: "名前と scope を確認してください" }, 400);
    const { token, ...stored } = await newIntegrationToken();
    const [row] = await db
      .insert(integrationClients)
      .values({
        name: body.name.trim(),
        scopes: [...new Set(body.scopes)],
        createdBy: caller.id,
        ...stored,
      })
      .returning();
    if (!row) throw new ApiError("作成に失敗しました", 500);
    await recordAudit(db, caller, {
      action: "integration_client_create",
      targetType: "integration_client",
      targetId: row.id,
    });
    return c.json({ client: publicClient(row), token }, 201);
  } catch (err) {
    return errorResponse(c, err);
  }
});
adminIntegrationsRoute.get("/api/admin/integrations/:id/groups", async (c) => {
  try {
    const { db } = await getCaller(c);
    return c.json({ groups: await listIntegrationGroups(db, c.req.param("id")) });
  } catch (err) {
    return errorResponse(c, err);
  }
});
adminIntegrationsRoute.patch("/api/admin/integrations/:id", async (c) => {
  try {
    const { db, caller } = await getCaller(c);
    const body = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (
      !body ||
      (body.enabled !== undefined && typeof body.enabled !== "boolean") ||
      (body.scopes !== undefined && !isIntegrationScopes(body.scopes)) ||
      (body.enabled === undefined && body.scopes === undefined)
    )
      return c.json({ error: "変更内容を確認してください" }, 400);
    const changes = {
      ...(body.enabled !== undefined ? { enabled: body.enabled as boolean } : {}),
      ...(isIntegrationScopes(body.scopes) ? { scopes: [...new Set(body.scopes)] } : {}),
      updatedAt: new Date(),
    };
    const [row] = await db
      .update(integrationClients)
      .set(changes)
      .where(eq(integrationClients.id, c.req.param("id")))
      .returning();
    if (!row) throw new ApiError("見つかりません", 404);
    await recordAudit(db, caller, {
      action: "integration_client_update",
      targetType: "integration_client",
      targetId: row.id,
      metadata: changes,
    });
    return c.json({ client: publicClient(row) });
  } catch (err) {
    return errorResponse(c, err);
  }
});
adminIntegrationsRoute.post("/api/admin/integrations/:id/rotate", async (c) => {
  try {
    const { db, caller } = await getCaller(c);
    const { token, ...stored } = await newIntegrationToken();
    const [row] = await db
      .update(integrationClients)
      .set({ ...stored, updatedAt: new Date() })
      .where(eq(integrationClients.id, c.req.param("id")))
      .returning();
    if (!row) throw new ApiError("見つかりません", 404);
    await recordAudit(db, caller, {
      action: "integration_token_rotate",
      targetType: "integration_client",
      targetId: row.id,
    });
    return c.json({ client: publicClient(row), token });
  } catch (err) {
    return errorResponse(c, err);
  }
});
