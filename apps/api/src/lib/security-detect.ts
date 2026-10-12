/**
 * セキュリティの検知ルール。security_events と audit_logs からアラート (security_alerts) を出し、
 * 新しいアラートを管理者へ知らせる (アプリ内の通知 + 任意の Webhook)。
 *
 * cron (15 分ごと) と、管理画面の「今すぐ検査」から呼ぶ。ルールの意味と最初の対応は
 * `@stella/shared/security/types` の `SECURITY_RULES` に書いてある。
 *
 * 同じ出来事で何度もアラートを出さないよう、アラートは `dedupe_key` (ルール・対象・日) で
 * 1 件にまとめ、件数と最後に見た時刻だけを更新する。知らせるのは新しく出たときの 1 回だけ。
 */

import { and, eq, gt, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";

import {
  SECURITY_RULES,
  SECURITY_SEVERITY_LABELS,
  type SecurityRule,
  type SecuritySeverity,
} from "@stella/shared/security/types";

import type { Db } from "../db/client.js";
import {
  auditLogs,
  notifications,
  profiles,
  securityAlerts,
  securityEvents,
} from "../db/schema.js";
import type { Env } from "../env.js";
import {
  readSecurityState,
  securityFallbackTenant,
  writeSecurityState,
} from "./security-events.js";

const DETECT_CURSOR = "detect_cursor";
export const LAST_SCAN_AT = "last_scan_at";
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const STAFF_ROLES = new Set(["admin", "platform_admin", "instructor", "sales"]);
const ADMIN_ROLES = new Set(["admin", "platform_admin"]);

/** しきい値 (1 時間あたり)。 */
export const THRESHOLDS = {
  accessDenied: 5,
  forbidden: 20,
  rateLimited: 30,
  invalidTokenOther: 10,
  errorSpikeMin: 20,
  errorSpikeRatio: 3,
  bulkExport: 5,
} as const;

/** 日本時間の日付 (YYYY-MM-DD)。アラートを日ごとにまとめる区切り。 */
export function jstDate(at: Date): string {
  return new Date(at.getTime() + 9 * HOUR).toISOString().slice(0, 10);
}

function jstHour(at: Date): number {
  return new Date(at.getTime() + 9 * HOUR).getUTCHours();
}

export interface AlertCandidate {
  tenantId: string;
  rule: SecurityRule;
  severity: SecuritySeverity;
  /** 誰・どこ (利用者 ID・メールアドレス・IP)。 */
  subject: string | null;
  dedupeKey: string;
  count: number;
  /** `max` = 窓の件数で置き換える / `add` = 足していく。 */
  countMode: "max" | "add";
  detail: Record<string, unknown>;
  at: Date;
}

function titleOf(c: AlertCandidate): string {
  return SECURITY_RULES[c.rule].label;
}

// ---------------------------------------------------------------------------
// ルール
// ---------------------------------------------------------------------------

type EventRow = typeof securityEvents.$inferSelect;

async function eventsSince(db: Db, kinds: string[], since: Date, until: Date): Promise<EventRow[]> {
  return db
    .select()
    .from(securityEvents)
    .where(
      and(
        inArray(securityEvents.kind, kinds),
        gt(securityEvents.createdAt, since),
        lt(securityEvents.createdAt, new Date(until.getTime() + 1)),
      ),
    )
    .limit(5000);
}

/** いつもと違う国からのサインイン・深夜帯の管理者のサインイン。 */
async function sessionRules(db: Db, since: Date, until: Date): Promise<AlertCandidate[]> {
  const out: AlertCandidate[] = [];
  const sessions = await eventsSince(db, ["session.start"], since, until);
  for (const ev of sessions) {
    if (!ev.actorId) continue;
    const role = ev.actorRole ?? "";
    if (ev.country) {
      const history = await db
        .select({ country: securityEvents.country })
        .from(securityEvents)
        .where(
          and(
            eq(securityEvents.kind, "session.start"),
            eq(securityEvents.actorId, ev.actorId),
            isNotNull(securityEvents.country),
            gte(securityEvents.createdAt, new Date(ev.createdAt.getTime() - 30 * DAY)),
            lt(securityEvents.createdAt, ev.createdAt),
          ),
        )
        .limit(500);
      // 初めてのサインイン (比べる履歴が無い) は「いつもと違う」とは言えないので出さない。
      if (history.length > 0 && !history.some((h) => h.country === ev.country)) {
        out.push({
          tenantId: ev.tenantId,
          rule: "new_location",
          severity: STAFF_ROLES.has(role) ? "high" : "medium",
          subject: ev.actorId,
          dedupeKey: `new_location:${ev.actorId}:${ev.country}:${jstDate(ev.createdAt)}`,
          count: 1,
          countMode: "add",
          detail: {
            actor_id: ev.actorId,
            role,
            email: ev.email,
            country: ev.country,
            ip: ev.ip,
            usual_countries: [...new Set(history.map((h) => h.country))],
          },
          at: ev.createdAt,
        });
      }
    }
    const hour = jstHour(ev.createdAt);
    if (ADMIN_ROLES.has(role) && hour < 5) {
      out.push({
        tenantId: ev.tenantId,
        rule: "off_hours_admin",
        severity: "low",
        subject: ev.actorId,
        dedupeKey: `off_hours_admin:${ev.actorId}:${jstDate(ev.createdAt)}`,
        count: 1,
        countMode: "add",
        detail: {
          actor_id: ev.actorId,
          email: ev.email,
          ip: ev.ip,
          country: ev.country,
          jst_hour: hour,
        },
        at: ev.createdAt,
      });
    }
  }
  return out;
}

/** 出来事 1 件ごとに数えるルール (未招待・無効化済み・認証トークンなし)。 */
async function perEventRules(db: Db, since: Date, until: Date): Promise<AlertCandidate[]> {
  const out: AlertCandidate[] = [];
  const rows = await eventsSince(
    db,
    ["auth.no_profile", "auth.disabled", "auth.invalid_token"],
    since,
    until,
  );
  for (const ev of rows) {
    const date = jstDate(ev.createdAt);
    if (ev.kind === "auth.no_profile") {
      const subject = ev.email ?? ev.ip ?? "unknown";
      out.push({
        tenantId: ev.tenantId,
        rule: "uninvited_identity",
        severity: "medium",
        subject,
        dedupeKey: `uninvited_identity:${subject}:${date}`,
        count: 1,
        countMode: "add",
        detail: { email: ev.email, ip: ev.ip, country: ev.country, path: ev.path },
        at: ev.createdAt,
      });
    } else if (ev.kind === "auth.disabled") {
      const subject = ev.actorId ?? ev.email ?? "unknown";
      out.push({
        tenantId: ev.tenantId,
        rule: "disabled_account_access",
        severity: "high",
        subject,
        dedupeKey: `disabled_account_access:${subject}:${date}`,
        count: 1,
        countMode: "add",
        detail: { actor_id: ev.actorId, email: ev.email, ip: ev.ip, country: ev.country },
        at: ev.createdAt,
      });
    } else {
      // Access のトークンが無い・検証に通らないリクエストは、Access を迂回する経路がある兆候なので
      // 1 件でも出す。それ以外の 401 (接続コードの打ち間違いなど) は数がまとまったときだけ下で出す。
      const reason = typeof ev.metadata?.reason === "string" ? ev.metadata.reason : null;
      if (reason !== "missing" && reason !== "invalid") continue;
      const subject = ev.ip ?? "unknown";
      out.push({
        tenantId: ev.tenantId,
        rule: "invalid_token",
        severity: "high",
        subject,
        dedupeKey: `invalid_token:${subject}:${date}`,
        count: 1,
        countMode: "add",
        detail: { ip: ev.ip, country: ev.country, path: ev.path, reason, user_agent: ev.userAgent },
        at: ev.createdAt,
      });
    }
  }
  return out;
}

/** 直近 1 時間に `kind` を `group` ごとに数え、`threshold` 以上の組を返す。 */
async function burst(
  db: Db,
  kind: string,
  group: "actor" | "ip" | "email",
  threshold: number,
  until: Date,
  extra?: ReturnType<typeof sql>,
): Promise<Array<{ tenantId: string; key: string; count: number; last: Date }>> {
  const column =
    group === "actor"
      ? securityEvents.actorId
      : group === "ip"
        ? securityEvents.ip
        : securityEvents.email;
  const rows = await db
    .select({
      tenantId: securityEvents.tenantId,
      key: column,
      count: sql<number>`count(*)`,
      last: sql<number>`max(${securityEvents.createdAt})`,
    })
    .from(securityEvents)
    .where(
      and(
        eq(securityEvents.kind, kind),
        isNotNull(column),
        gt(securityEvents.createdAt, new Date(until.getTime() - HOUR)),
        lt(securityEvents.createdAt, new Date(until.getTime() + 1)),
        ...(extra ? [extra] : []),
      ),
    )
    .groupBy(securityEvents.tenantId, column)
    .having(sql`count(*) >= ${threshold}`);
  return rows
    .filter((r): r is typeof r & { key: string } => typeof r.key === "string")
    .map((r) => ({
      tenantId: r.tenantId,
      key: r.key,
      count: Number(r.count),
      last: new Date(Number(r.last)),
    }));
}

async function burstRules(db: Db, until: Date): Promise<AlertCandidate[]> {
  const out: AlertCandidate[] = [];
  const date = jstDate(until);
  const push = (
    rows: Awaited<ReturnType<typeof burst>>,
    rule: SecurityRule,
    severity: SecuritySeverity,
    label: string,
  ) => {
    for (const r of rows) {
      out.push({
        tenantId: r.tenantId,
        rule,
        severity,
        subject: r.key,
        dedupeKey: `${rule}:${label}:${r.key}:${date}`,
        count: r.count,
        countMode: "max",
        detail: { [label]: r.key, count_last_hour: r.count },
        at: r.last,
      });
    }
  };
  push(
    await burst(db, "access.denied", "email", THRESHOLDS.accessDenied, until),
    "access_denied_burst",
    "high",
    "email",
  );
  push(
    await burst(db, "access.denied", "ip", THRESHOLDS.accessDenied, until),
    "access_denied_burst",
    "high",
    "ip",
  );
  push(
    await burst(db, "authz.forbidden", "actor", THRESHOLDS.forbidden, until),
    "forbidden_burst",
    "high",
    "actor_id",
  );
  push(
    await burst(db, "authz.forbidden", "ip", THRESHOLDS.forbidden, until),
    "forbidden_burst",
    "high",
    "ip",
  );
  push(
    await burst(db, "rate_limited", "ip", THRESHOLDS.rateLimited, until),
    "rate_limit_burst",
    "medium",
    "ip",
  );
  push(
    await burst(
      db,
      "auth.invalid_token",
      "ip",
      THRESHOLDS.invalidTokenOther,
      until,
      sql`coalesce(json_extract(${securityEvents.metadata}, '$.reason'), '') not in ('missing', 'invalid')`,
    ),
    "invalid_token",
    "medium",
    "ip",
  );
  push(
    await burst(db, "data.export", "actor", THRESHOLDS.bulkExport, until),
    "bulk_export",
    "medium",
    "actor_id",
  );
  return out;
}

/** 直近 1 時間のサーバーエラーが、過去 7 日の平均より大きく多い。 */
async function errorSpikeRule(
  db: Db,
  env: Pick<Env, "SECURITY_TENANT_ID" | "PUBLIC_CONTENT_TENANT_ID">,
  until: Date,
): Promise<AlertCandidate[]> {
  const count = async (from: Date, to: Date) =>
    Number(
      (
        await db
          .select({ n: sql<number>`count(*)` })
          .from(securityEvents)
          .where(
            and(
              eq(securityEvents.kind, "server_error"),
              gt(securityEvents.createdAt, from),
              lt(securityEvents.createdAt, to),
            ),
          )
      )[0]?.n ?? 0,
    );
  const end = new Date(until.getTime() + 1);
  const lastHour = await count(new Date(until.getTime() - HOUR), end);
  if (lastHour < THRESHOLDS.errorSpikeMin) return [];
  const week = await count(
    new Date(until.getTime() - 7 * DAY - HOUR),
    new Date(until.getTime() - HOUR),
  );
  const hourlyAverage = week / (7 * 24);
  if (lastHour < hourlyAverage * THRESHOLDS.errorSpikeRatio) return [];
  const hourKey = new Date(until.getTime() + 9 * HOUR).toISOString().slice(0, 13);
  return [
    {
      tenantId: securityFallbackTenant(env),
      rule: "error_spike",
      severity: "medium",
      subject: null,
      dedupeKey: `error_spike:${hourKey}`,
      count: lastHour,
      countMode: "max",
      detail: { count_last_hour: lastHour, hourly_average_7d: Math.round(hourlyAverage * 10) / 10 },
      at: until,
    },
  ];
}

/** 管理者権限の付与・無効化したアカウントの復帰 (監査ログから)。 */
async function privilegeRules(db: Db, since: Date, until: Date): Promise<AlertCandidate[]> {
  const rows = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        inArray(auditLogs.action, ["user_role_change", "user_enable"]),
        gt(auditLogs.createdAt, since),
        lt(auditLogs.createdAt, new Date(until.getTime() + 1)),
      ),
    )
    .limit(1000);
  const out: AlertCandidate[] = [];
  for (const row of rows) {
    const newRole = typeof row.metadata?.new_role === "string" ? row.metadata.new_role : null;
    const isGrant =
      row.action === "user_role_change" && newRole != null && ADMIN_ROLES.has(newRole);
    if (row.action === "user_role_change" && !isGrant) continue;
    out.push({
      tenantId: row.tenantId,
      rule: "privilege_grant",
      severity: isGrant ? "high" : "medium",
      subject: row.targetId,
      dedupeKey: `privilege_grant:${row.id}`,
      count: 1,
      countMode: "add",
      detail: {
        action: row.action,
        target_id: row.targetId,
        new_role: newRole,
        previous_role: row.metadata?.previous_role ?? null,
        actor_id: row.actorId,
        actor_name: row.actorName,
        ip: row.ip,
      },
      at: row.createdAt,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// アラートの保存と通知
// ---------------------------------------------------------------------------

export type SecurityAlertRecord = typeof securityAlerts.$inferSelect;

/** 候補を保存する。新しく出たアラートを返す。 */
export async function saveAlerts(
  db: Db,
  candidates: AlertCandidate[],
): Promise<SecurityAlertRecord[]> {
  const created: SecurityAlertRecord[] = [];
  // 同じ実行の中で同じキーが重なったら先にまとめる。
  const merged = new Map<string, AlertCandidate>();
  for (const c of candidates) {
    const key = `${c.tenantId}\u0000${c.dedupeKey}`;
    const prev = merged.get(key);
    if (!prev) merged.set(key, { ...c });
    else {
      prev.count = c.countMode === "add" ? prev.count + c.count : Math.max(prev.count, c.count);
      if (c.at > prev.at) prev.at = c.at;
    }
  }
  for (const c of merged.values()) {
    const existing = (
      await db
        .select()
        .from(securityAlerts)
        .where(
          and(eq(securityAlerts.tenantId, c.tenantId), eq(securityAlerts.dedupeKey, c.dedupeKey)),
        )
        .limit(1)
    )[0];
    if (existing) {
      await db
        .update(securityAlerts)
        .set({
          eventCount:
            c.countMode === "add"
              ? existing.eventCount + c.count
              : Math.max(existing.eventCount, c.count),
          lastSeenAt: c.at > existing.lastSeenAt ? c.at : existing.lastSeenAt,
          detail: { ...existing.detail, ...c.detail },
        })
        .where(eq(securityAlerts.id, existing.id));
      continue;
    }
    const inserted = await db
      .insert(securityAlerts)
      .values({
        tenantId: c.tenantId,
        rule: c.rule,
        severity: c.severity,
        title: titleOf(c),
        detail: c.detail,
        subject: c.subject,
        dedupeKey: c.dedupeKey,
        eventCount: c.count,
        firstSeenAt: c.at,
        lastSeenAt: c.at,
      })
      .onConflictDoNothing()
      .returning();
    if (inserted[0]) created.push(inserted[0]);
  }
  return created;
}

type NotifyEnv = Pick<
  Env,
  "SECURITY_ALERT_WEBHOOK_URL" | "INVITE_REDIRECT_URL" | "ALLOWED_ORIGINS"
>;

function appBaseUrl(env: NotifyEnv): string | null {
  const raw = env.INVITE_REDIRECT_URL || env.ALLOWED_ORIGINS?.split(",")[0];
  if (!raw) return null;
  try {
    return new URL(raw.trim()).origin;
  } catch {
    return null;
  }
}

/**
 * 新しいアラートを知らせる。重要度「高」「中」だけ。アプリ内の通知は組織の管理者全員へ。
 * Webhook には個人の情報 (メールアドレス・IP) を載せず、種類・重要度・件数と画面への案内だけを送る。
 */
export async function notifyAlerts(
  db: Db,
  env: NotifyEnv,
  alerts: SecurityAlertRecord[],
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const targets = alerts.filter((a) => a.severity !== "low");
  if (targets.length === 0) return;
  const base = appBaseUrl(env);
  const link = base ? `${base}/admin/security` : null;

  const byTenant = new Map<string, SecurityAlertRecord[]>();
  for (const a of targets) byTenant.set(a.tenantId, [...(byTenant.get(a.tenantId) ?? []), a]);
  for (const [tenantId, list] of byTenant) {
    const admins = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(
        and(
          eq(profiles.tenantId, tenantId),
          inArray(profiles.role, ["admin", "platform_admin"]),
          eq(profiles.disabled, false),
        ),
      );
    if (admins.length === 0) continue;
    const values = list.flatMap((a) =>
      admins.map((admin) => ({
        userId: admin.id,
        tenantId,
        type: "security_alert" as const,
        title: `セキュリティ: ${a.title}`,
        body: `重要度「${SECURITY_SEVERITY_LABELS[a.severity]}」のアラートが出ました。セキュリティ画面で内容を確認してください。`,
        payload: { alert_id: a.id, rule: a.rule, severity: a.severity },
      })),
    );
    for (let i = 0; i < values.length; i += 10) {
      await db.insert(notifications).values(values.slice(i, i + 10));
    }
  }

  const webhook = env.SECURITY_ALERT_WEBHOOK_URL?.trim();
  if (webhook) {
    const lines = targets.map(
      (a) => `・重要度「${SECURITY_SEVERITY_LABELS[a.severity]}」${a.title} (${a.eventCount} 件)`,
    );
    const text = [
      `[STELLA セキュリティ] 新しいアラートが ${targets.length} 件あります`,
      ...lines,
      ...(link ? [`確認: ${link}`] : []),
    ].join("\n");
    try {
      const res = await fetchImpl(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) console.error("[security] alert webhook failed", res.status);
    } catch (err) {
      console.error("[security] alert webhook failed", err instanceof Error ? err.name : "error");
    }
  }

  const ids = targets.map((a) => a.id);
  for (let i = 0; i < ids.length; i += 90) {
    await db
      .update(securityAlerts)
      .set({ notifiedAt: new Date() })
      .where(inArray(securityAlerts.id, ids.slice(i, i + 90)));
  }
}

/**
 * 前回の続きから検知ルールを流す。新しく出たアラートを返す (通知も済ませる)。
 */
export async function detectSecurityAlerts(
  db: Db,
  env: NotifyEnv & Pick<Env, "SECURITY_TENANT_ID" | "PUBLIC_CONTENT_TENANT_ID">,
  now = new Date(),
  fetchImpl: typeof fetch = fetch,
): Promise<SecurityAlertRecord[]> {
  const cursorRaw = await readSecurityState(db, DETECT_CURSOR);
  const cursorMs = cursorRaw ? Number(cursorRaw) : Number.NaN;
  // 初回と、長く止まっていたあとは 1 日までさかのぼる。
  const since = new Date(
    Math.max(Number.isFinite(cursorMs) ? cursorMs : now.getTime() - HOUR, now.getTime() - DAY),
  );
  const candidates = [
    ...(await sessionRules(db, since, now)),
    ...(await perEventRules(db, since, now)),
    ...(await privilegeRules(db, since, now)),
    ...(await burstRules(db, now)),
    ...(await errorSpikeRule(db, env, now)),
  ];
  const created = await saveAlerts(db, candidates);
  await notifyAlerts(db, env, created, fetchImpl);
  await writeSecurityState(db, DETECT_CURSOR, String(now.getTime()));
  await writeSecurityState(db, LAST_SCAN_AT, String(now.getTime()));
  return created;
}
