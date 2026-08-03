/**
 * 監査ログ API (旧 audit_logs 直 SELECT + RLS の置き換え / Issue #27)。
 *
 * 読み取り専用。 旧 RLS は「同テナントの instructor/admin のみ SELECT、 append-only」。
 * アプリ層で requireRole(instructor, admin) + tenant 突合を行う。 記録は管理 API 側で行う。
 */

import { Hono } from "hono";
import { and, desc, eq, gte, lte } from "drizzle-orm";

import { auditLogs } from "../db/schema.js";
import { errorResponse, getCaller, requireRole } from "../lib/authz.js";
import type { Env } from "../env.js";

export const auditLogsRoute = new Hono<{ Bindings: Env }>();

const SELECT = {
  id: auditLogs.id,
  tenant_id: auditLogs.tenantId,
  actor_id: auditLogs.actorId,
  actor_name: auditLogs.actorName,
  actor_role: auditLogs.actorRole,
  action: auditLogs.action,
  target_type: auditLogs.targetType,
  target_id: auditLogs.targetId,
  ip: auditLogs.ip,
  metadata: auditLogs.metadata,
  created_at: auditLogs.createdAt,
} as const;

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 1000;

auditLogsRoute.get("/api/audit-logs", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");

    const q = c.req.query();
    // tenant は常に caller のテナントに固定する (クエリの tenantId は無視)。
    const conds = [eq(auditLogs.tenantId, caller.tenantId)];
    if (q.from) conds.push(gte(auditLogs.createdAt, new Date(q.from)));
    if (q.to) conds.push(lte(auditLogs.createdAt, new Date(q.to)));
    if (q.actorId) conds.push(eq(auditLogs.actorId, q.actorId));
    if (q.action) conds.push(eq(auditLogs.action, q.action));

    const limit = Math.min(Number(q.limit) || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = Number(q.offset) || 0;

    const rows = await db
      .select(SELECT)
      .from(auditLogs)
      .where(and(...conds))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
    return c.json({ rows });
  } catch (err) {
    return errorResponse(c, err);
  }
});
