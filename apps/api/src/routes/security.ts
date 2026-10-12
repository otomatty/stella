/**
 * セキュリティ監視 API (管理者のみ。テナントは caller に固定)。
 *
 *   GET   /api/security/overview                    … 件数・未対応のアラート・設定の状態
 *   GET   /api/security/alerts?status=              … アラート一覧 (既定は未対応 + 確認中)
 *   PATCH /api/security/alerts/:id                  … 状態 (確認中・解決済み) とメモ
 *   GET   /api/security/events?kind=&days=&q=&before=  … 出来事の一覧 (サインイン履歴もここ)
 *   GET   /api/security/accounts                    … アカウントの棚卸し (最終サインイン・休眠)
 *   POST  /api/security/accounts/:id/revoke         … Access のセッションを失効
 *   POST  /api/security/scan                        … Access のログ取り込みと検知を今すぐ流す
 */

import { Hono } from "hono";
import { and, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";

import {
  isSecurityAlertStatus,
  isSecurityEventKind,
  type SecurityAccountRow,
  type SecurityEventKind,
  type SecurityOverview,
  type SecuritySeverity,
} from "@stella/shared/security/types";

import { profiles, securityAlerts, securityEvents, securitySessions } from "../db/schema.js";
import { accessConfig } from "../lib/access-auth.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import { ApiError, errorResponse, getCaller, requireTenantAdmin } from "../lib/authz.js";
import {
  ACCESS_LOG_IMPORTED_AT,
  cloudflareAccessApiConfigured,
  importAccessLogs,
  revokeAccessSessions,
} from "../lib/security-cloudflare.js";
import { detectSecurityAlerts, LAST_SCAN_AT } from "../lib/security-detect.js";
import {
  deferSecurityEvent,
  readSecurityState,
  SECURITY_EVENT_RETENTION_DAYS,
} from "../lib/security-events.js";
import type { Env } from "../env.js";

export const securityRoute = new Hono<{ Bindings: Env }>();

const DAY = 86_400_000;
const PRIVILEGED = new Set(["instructor", "admin", "platform_admin", "sales"]);

function stateDate(raw: string | null): string | null {
  const n = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(n) ? new Date(n).toISOString() : null;
}

async function adminCtx(c: Parameters<typeof getCaller>[0]) {
  const ctx = await getCaller(c);
  requireTenantAdmin(ctx.caller);
  return ctx;
}

securityRoute.get("/api/security/overview", async (c) => {
  try {
    const { caller, db } = await adminCtx(c);
    const tenant = caller.tenantId;
    const now = Date.now();

    const openRows = await db
      .select({ severity: securityAlerts.severity, n: sql<number>`count(*)` })
      .from(securityAlerts)
      .where(and(eq(securityAlerts.tenantId, tenant), eq(securityAlerts.status, "open")))
      .groupBy(securityAlerts.severity);
    const open_alerts: Record<SecuritySeverity, number> = { high: 0, medium: 0, low: 0 };
    for (const r of openRows) open_alerts[r.severity] = Number(r.n);

    const recentRows = await db
      .select({ kind: securityEvents.kind, n: sql<number>`count(*)` })
      .from(securityEvents)
      .where(
        and(
          eq(securityEvents.tenantId, tenant),
          gte(securityEvents.createdAt, new Date(now - DAY)),
        ),
      )
      .groupBy(securityEvents.kind);
    const last24h: Partial<Record<SecurityEventKind, number>> = {};
    for (const r of recentRows) if (isSecurityEventKind(r.kind)) last24h[r.kind] = Number(r.n);

    // 日本時間の日ごと (直近 7 日)。
    const dayExpr = sql<string>`strftime('%Y-%m-%d', (${securityEvents.createdAt} / 1000) + 32400, 'unixepoch')`;
    const dailyRows = await db
      .select({ day: dayExpr, kind: securityEvents.kind, n: sql<number>`count(*)` })
      .from(securityEvents)
      .where(
        and(
          eq(securityEvents.tenantId, tenant),
          gte(securityEvents.createdAt, new Date(now - 7 * DAY)),
          inArray(securityEvents.kind, [
            "session.start",
            "access.denied",
            "authz.forbidden",
            "server_error",
          ]),
        ),
      )
      .groupBy(dayExpr, securityEvents.kind);
    const daily: SecurityOverview["daily"] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * DAY + 9 * 3_600_000).toISOString().slice(0, 10);
      const of = (kind: string) =>
        Number(dailyRows.find((r) => r.day === date && r.kind === kind)?.n ?? 0);
      daily.push({
        date,
        sign_ins: of("session.start"),
        denied: of("access.denied"),
        forbidden: of("authz.forbidden"),
        errors: of("server_error"),
      });
    }

    const accountRows = await db
      .select({
        role: profiles.role,
        disabled: profiles.disabled,
        createdAt: profiles.createdAt,
        lastSessionAt: securitySessions.lastSessionAt,
      })
      .from(profiles)
      .leftJoin(securitySessions, eq(securitySessions.profileId, profiles.id))
      .where(eq(profiles.tenantId, tenant));
    const isDormant = (r: (typeof accountRows)[number]) =>
      PRIVILEGED.has(r.role) && !r.disabled && isDormantAt(r.lastSessionAt, r.createdAt, now);

    const overview: SecurityOverview = {
      config: {
        access_enforced: accessConfig(c.env) !== null,
        access_logs_import: cloudflareAccessApiConfigured(c.env),
        session_revoke: cloudflareAccessApiConfigured(c.env),
        webhook: Boolean(c.env.SECURITY_ALERT_WEBHOOK_URL?.trim()),
        last_scan_at: stateDate(await readSecurityState(db, LAST_SCAN_AT)),
        last_access_log_import_at: stateDate(await readSecurityState(db, ACCESS_LOG_IMPORTED_AT)),
        retention_days: SECURITY_EVENT_RETENTION_DAYS,
      },
      open_alerts,
      last24h,
      daily,
      accounts: {
        total: accountRows.length,
        privileged: accountRows.filter((r) => PRIVILEGED.has(r.role)).length,
        admins: accountRows.filter(
          (r) => (r.role === "admin" || r.role === "platform_admin") && !r.disabled,
        ).length,
        dormant_privileged: accountRows.filter(isDormant).length,
        disabled: accountRows.filter((r) => r.disabled).length,
      },
    };
    return c.json(overview);
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 権限のあるアカウントが 90 日サインインしていない (作って 90 日たっても一度も無いものを含む)。 */
function isDormantAt(lastSessionAt: Date | null, createdAt: Date, now: number): boolean {
  const limit = now - 90 * DAY;
  if (lastSessionAt) return lastSessionAt.getTime() < limit;
  return createdAt.getTime() < limit;
}

securityRoute.get("/api/security/alerts", async (c) => {
  try {
    const { caller, db } = await adminCtx(c);
    const status = c.req.query("status") ?? "active";
    const conds = [eq(securityAlerts.tenantId, caller.tenantId)];
    if (status === "active") conds.push(inArray(securityAlerts.status, ["open", "acknowledged"]));
    else if (isSecurityAlertStatus(status)) conds.push(eq(securityAlerts.status, status));
    else if (status !== "all") throw new ApiError("status が不正です", 400);
    const rows = await db
      .select({
        id: securityAlerts.id,
        rule: securityAlerts.rule,
        severity: securityAlerts.severity,
        status: securityAlerts.status,
        title: securityAlerts.title,
        detail: securityAlerts.detail,
        subject: securityAlerts.subject,
        event_count: securityAlerts.eventCount,
        first_seen_at: securityAlerts.firstSeenAt,
        last_seen_at: securityAlerts.lastSeenAt,
        notified_at: securityAlerts.notifiedAt,
        status_changed_by: securityAlerts.statusChangedBy,
        status_changed_at: securityAlerts.statusChangedAt,
        note: securityAlerts.note,
      })
      .from(securityAlerts)
      .where(and(...conds))
      .orderBy(desc(securityAlerts.lastSeenAt))
      .limit(200);
    return c.json({ rows });
  } catch (err) {
    return errorResponse(c, err);
  }
});

const MAX_NOTE = 1000;

securityRoute.patch("/api/security/alerts/:id", async (c) => {
  try {
    const { caller, db } = await adminCtx(c);
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || !isSecurityAlertStatus(body.status)) {
      throw new ApiError("status は open / acknowledged / resolved のいずれかです", 400);
    }
    const note = typeof body.note === "string" ? body.note.trim() : null;
    if (note && note.length > MAX_NOTE) {
      throw new ApiError(`メモは${MAX_NOTE}文字以内で入力してください`, 400);
    }
    const id = c.req.param("id");
    const updated = await db
      .update(securityAlerts)
      .set({
        status: body.status,
        ...(note !== null ? { note: note || null } : {}),
        statusChangedBy: caller.name,
        statusChangedAt: new Date(),
      })
      .where(and(eq(securityAlerts.id, id), eq(securityAlerts.tenantId, caller.tenantId)))
      .returning({ id: securityAlerts.id, rule: securityAlerts.rule });
    if (!updated[0]) throw new ApiError("アラートが見つかりません", 404);
    await recordAudit(db, caller, {
      action: "security_alert_update",
      targetType: "security_alert",
      targetId: id,
      ip: clientIp(c),
      metadata: { status: body.status, rule: updated[0].rule },
    });
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

securityRoute.get("/api/security/events", async (c) => {
  try {
    const { caller, db } = await adminCtx(c);
    const q = c.req.query();
    const days = Math.min(Math.max(Number(q.days) || 7, 1), SECURITY_EVENT_RETENTION_DAYS);
    const limit = Math.min(Math.max(Number(q.limit) || 100, 1), 500);
    const conds = [
      eq(securityEvents.tenantId, caller.tenantId),
      gte(securityEvents.createdAt, new Date(Date.now() - days * DAY)),
    ];
    if (q.kind) {
      const kinds = q.kind.split(",").filter(isSecurityEventKind);
      if (kinds.length === 0) throw new ApiError("kind が不正です", 400);
      conds.push(inArray(securityEvents.kind, kinds));
    }
    if (q.actorId) conds.push(eq(securityEvents.actorId, q.actorId));
    if (q.before) {
      const before = new Date(q.before);
      if (Number.isNaN(before.getTime())) throw new ApiError("before が不正です", 400);
      conds.push(lt(securityEvents.createdAt, before));
    }
    const search = q.q?.trim().toLowerCase();
    if (search) {
      const like = `%${search.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      const cond = or(
        sql`lower(${securityEvents.email}) like ${like} escape '\\'`,
        sql`${securityEvents.ip} like ${like} escape '\\'`,
        sql`lower(${profiles.displayName}) like ${like} escape '\\'`,
      );
      if (cond) conds.push(cond);
    }
    const rows = await db
      .select({
        id: securityEvents.id,
        kind: securityEvents.kind,
        source: securityEvents.source,
        actor_id: securityEvents.actorId,
        actor_name: profiles.displayName,
        actor_role: securityEvents.actorRole,
        email: securityEvents.email,
        ip: securityEvents.ip,
        country: securityEvents.country,
        user_agent: securityEvents.userAgent,
        method: securityEvents.method,
        path: securityEvents.path,
        status: securityEvents.status,
        metadata: securityEvents.metadata,
        created_at: securityEvents.createdAt,
      })
      .from(securityEvents)
      .leftJoin(profiles, eq(profiles.id, securityEvents.actorId))
      .where(and(...conds))
      .orderBy(desc(securityEvents.createdAt))
      .limit(limit);
    return c.json({ rows });
  } catch (err) {
    return errorResponse(c, err);
  }
});

securityRoute.get("/api/security/accounts", async (c) => {
  try {
    const { caller, db } = await adminCtx(c);
    const now = Date.now();
    const sessions30d = db
      .select({
        actorId: securityEvents.actorId,
        n: sql<number>`count(*)`.as("n"),
      })
      .from(securityEvents)
      .where(
        and(
          eq(securityEvents.tenantId, caller.tenantId),
          eq(securityEvents.kind, "session.start"),
          gte(securityEvents.createdAt, new Date(now - 30 * DAY)),
        ),
      )
      .groupBy(securityEvents.actorId)
      .as("sessions30d");
    const rows = await db
      .select({
        id: profiles.id,
        displayName: profiles.displayName,
        email: profiles.email,
        role: profiles.role,
        disabled: profiles.disabled,
        createdAt: profiles.createdAt,
        lastSessionAt: securitySessions.lastSessionAt,
        lastSeenAt: securitySessions.lastSeenAt,
        lastIp: securitySessions.lastIp,
        lastCountry: securitySessions.lastCountry,
        sessions: sessions30d.n,
      })
      .from(profiles)
      .leftJoin(securitySessions, eq(securitySessions.profileId, profiles.id))
      .leftJoin(sessions30d, eq(sessions30d.actorId, profiles.id))
      .where(eq(profiles.tenantId, caller.tenantId));
    const out: SecurityAccountRow[] = rows.map((r) => {
      const privileged = PRIVILEGED.has(r.role);
      return {
        id: r.id,
        display_name: r.displayName,
        email: r.email,
        role: r.role,
        disabled: r.disabled,
        created_at: r.createdAt.toISOString(),
        last_session_at: r.lastSessionAt?.toISOString() ?? null,
        last_seen_at: r.lastSeenAt?.toISOString() ?? null,
        last_ip: r.lastIp,
        last_country: r.lastCountry,
        sessions_30d: Number(r.sessions ?? 0),
        privileged,
        dormant: privileged && !r.disabled && isDormantAt(r.lastSessionAt, r.createdAt, now),
      };
    });
    // 権限のあるアカウントを先に、その中は最終サインインの古い順 (棚卸しで見る順)。
    out.sort((a, b) => {
      if (a.privileged !== b.privileged) return a.privileged ? -1 : 1;
      return (a.last_session_at ?? "").localeCompare(b.last_session_at ?? "");
    });
    return c.json({ rows: out });
  } catch (err) {
    return errorResponse(c, err);
  }
});

securityRoute.post("/api/security/accounts/:id/revoke", async (c) => {
  try {
    const { caller, db } = await adminCtx(c);
    if (!cloudflareAccessApiConfigured(c.env)) {
      throw new ApiError(
        "Access のセッションを失効するには CF_ACCESS_API_TOKEN の設定が必要です",
        503,
      );
    }
    const target = (
      await db
        .select({
          id: profiles.id,
          email: profiles.email,
          role: profiles.role,
          tenantId: profiles.tenantId,
        })
        .from(profiles)
        .where(and(eq(profiles.id, c.req.param("id")), eq(profiles.tenantId, caller.tenantId)))
        .limit(1)
    )[0];
    if (!target) throw new ApiError("ユーザーが見つかりません", 404);
    if (target.role === "platform_admin" && caller.role !== "platform_admin") {
      throw new ApiError("プラットフォーム管理者のセッションは失効できません", 403);
    }
    if (!target.email) throw new ApiError("メールアドレスの無いユーザーです", 400);
    try {
      await revokeAccessSessions(c.env, target.email);
    } catch {
      throw new ApiError("Cloudflare Access でのセッションの失効に失敗しました", 502);
    }
    deferSecurityEvent(c, {
      kind: "session.revoke",
      tenantId: caller.tenantId,
      actorId: target.id,
      actorRole: target.role,
      email: target.email,
      metadata: { revoked_by: caller.id },
    });
    await recordAudit(db, caller, {
      action: "security_session_revoke",
      targetType: "user",
      targetId: target.id,
      ip: clientIp(c),
    });
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

securityRoute.post("/api/security/scan", async (c) => {
  try {
    const { caller, db } = await adminCtx(c);
    let accessLogError = false;
    try {
      await importAccessLogs(c.env, db);
    } catch (err) {
      accessLogError = true;
      console.error(
        "[security] access log import failed",
        err instanceof Error ? err.message : err,
      );
    }
    const created = await detectSecurityAlerts(db, c.env);
    return c.json({
      new_alerts: created.filter((a) => a.tenantId === caller.tenantId).length,
      access_log_error: accessLogError,
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});
