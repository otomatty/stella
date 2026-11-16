import { INTEGRATION_GROUP_KEY } from "@stella/shared/integrations/types";
import { Hono } from "hono";
import { integrationGroups } from "../db/schema.js";
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
      return c.json({ group: { key: group.key, name: group.name } });
    } catch (err) {
      return errorResponse(c, err);
    }
  },
);
