import { timingSafeEqual } from "node:crypto";
import type { IntegrationScope } from "@stella/shared/integrations/types";
import { and, eq, isNull, lt, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import type { Db } from "../db/client.js";
import { getDb } from "../db/client.js";
import {
  integrationClients,
  integrationGroups,
  integrationGroupMembers,
  profiles,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { ApiError, errorResponse } from "./authz.js";
import { recordAudit } from "./audit.js";
import { enforceIntegrationRateLimit } from "./rate-limit.js";

export const INTEGRATION_TOKEN_PATTERN = /^stella_int_[a-f0-9]{64}$/;
export async function hashIntegrationToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
export async function newIntegrationToken() {
  const token = `stella_int_${Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("")}`;
  return { token, tokenHash: await hashIntegrationToken(token), tokenPrefix: token.slice(0, 18) };
}
/** ハッシュは固定長。比較はランタイムの定数時間比較を使う。 */
export function equalTokenHash(a: string, b: string): boolean {
  return (
    a.length === 64 &&
    b.length === 64 &&
    timingSafeEqual(new TextEncoder().encode(a), new TextEncoder().encode(b))
  );
}
export type IntegrationAuth = {
  Bindings: Env;
  Variables: {
    integrationClient: typeof integrationClients.$inferSelect;
    integrationDb: Db;
    integrationGroupId: string | null;
  };
};
export const authenticateIntegration = createMiddleware<IntegrationAuth>(async (c, next) => {
  c.header("Cache-Control", "no-store");
  try {
    const match = /^Bearer (stella_int_[a-f0-9]{64})$/i.exec(c.req.header("Authorization") ?? "");
    const token = match?.[1];
    if (!token || !INTEGRATION_TOKEN_PATTERN.test(token)) throw new ApiError("Unauthorized", 401);
    const db = getDb(c.env);
    const hash = await hashIntegrationToken(token);
    const [client] = await db
      .select()
      .from(integrationClients)
      .where(eq(integrationClients.tokenHash, hash))
      .limit(1);
    if (!equalTokenHash(hash, client?.tokenHash ?? "0".repeat(64)) || !client?.enabled)
      throw new ApiError("Unauthorized", 401);
    c.set("integrationClient", client);
    c.set("integrationDb", db);
    c.set("integrationGroupId", null);
    const limited = await enforceIntegrationRateLimit(c, client.id);
    try {
      if (limited) c.res = limited;
      else await next();
    } finally {
      await recordAudit(
        db,
        { id: client.id, name: "連携クライアント", role: "integration" },
        {
          action: "integration_request",
          targetType: "integration_group",
          targetId: c.get("integrationGroupId"),
          metadata: {
            clientId: client.id,
            operation: `${c.req.method} ${c.req.routePath}`,
            status: c.res.status,
          },
        },
      );
      const now = new Date();
      if (!client.lastUsedAt || now.getTime() - client.lastUsedAt.getTime() >= 300_000) {
        await db
          .update(integrationClients)
          .set({ lastUsedAt: now, updatedAt: sql`${integrationClients.updatedAt}` })
          .where(
            and(
              eq(integrationClients.id, client.id),
              or(
                isNull(integrationClients.lastUsedAt),
                lt(integrationClients.lastUsedAt, new Date(now.getTime() - 300_000)),
              ),
            ),
          );
      }
    }
    return limited ?? c.res;
  } catch (err) {
    return errorResponse(c, err);
  }
});
export function requireScope(scope: IntegrationScope) {
  return createMiddleware<IntegrationAuth>(async (c, next) => {
    if (!c.get("integrationClient").scopes.includes(scope)) {
      c.res = c.json({ error: "Forbidden" }, 403);
      return;
    }
    await next();
  });
}
/** 必ず所有者を条件に含める。他クライアントのキーも不存在と同じ扱い。 */
export async function requireOwnGroup(db: Db, clientId: string, key: string) {
  const [group] = await db
    .select()
    .from(integrationGroups)
    .where(and(eq(integrationGroups.clientId, clientId), eq(integrationGroups.key, key)))
    .limit(1);
  if (!group) throw new ApiError("Not found", 404);
  return group;
}
/** グループと所有者を再確認してから受講者を返す。範囲外の存在を明かさない。 */
export async function requireOwnGroupMember(
  db: Db,
  clientId: string,
  key: string,
  profileId: string,
) {
  const group = await requireOwnGroup(db, clientId, key);
  const [member] = await db
    .select({ id: profiles.id })
    .from(integrationGroupMembers)
    .innerJoin(profiles, eq(profiles.id, integrationGroupMembers.profileId))
    .where(
      and(
        eq(integrationGroupMembers.groupId, group.id),
        eq(integrationGroupMembers.profileId, profileId),
        eq(profiles.role, "student"),
      ),
    )
    .limit(1);
  if (!member) throw new ApiError("Not found", 404);
  return member;
}
/** staff の認可を済ませた一覧クエリに追加する条件。ID を IN に展開しない。 */
export function integrationGroupFilter(
  profileId: AnyColumn | SQL,
  groupId?: string,
): SQL | undefined {
  if (!groupId) return undefined;
  return sql`${profileId} in (select ${integrationGroupMembers.profileId} from ${integrationGroupMembers} where ${integrationGroupMembers.groupId} = ${groupId})`;
}
export async function listIntegrationGroups(db: Db, clientId?: string) {
  return db
    .select({
      id: integrationGroups.id,
      clientId: integrationGroups.clientId,
      key: integrationGroups.key,
      name: integrationGroups.name,
      memberCount: sql<number>`(select count(*) from integration_group_members m inner join profiles p on p.id = m.profile_id where m.group_id = integration_groups.id and p.role = 'student')`,
    })
    .from(integrationGroups)
    .where(clientId ? eq(integrationGroups.clientId, clientId) : undefined)
    .orderBy(integrationGroups.name, integrationGroups.id);
}
