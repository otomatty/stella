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

import { and, asc, eq, gt, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";

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
import { ACCESS_BACKFILL_FROM, importAccessLogs } from "./security-cloudflare.js";
import {
  acquireSecurityLock,
  readSecurityState,
  releaseSecurityLock,
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
  invalidToken: 10,
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

/** 1 回の検査で 1 つの問い合わせから読む上限。 */
const SCAN_LIMIT = 5000;

/**
 * 1 回の検査の読み取り範囲。上限まで読んだ問い合わせがあれば、読み切れた時刻を `readThrough`
 * に縮める — 検査のカーソルをそこまでしか進めず、残りを次の検査で読む (読まずに飛ばさない)。
 */
interface Scan {
  since: Date;
  until: Date;
  readThrough: Date;
}

function noteTruncation(scan: Scan, rows: readonly { createdAt: Date }[]): void {
  if (rows.length < SCAN_LIMIT) return;
  const last = rows[rows.length - 1];
  if (!last) return;
  // 最後の行と同じ時刻の行が上限の外に残っていてもよいよう、1 ms 手前までを読み切ったとする。
  // ただし上限の行がすべて since の直後の同じ時刻なら、それでは次の検査が同じ行を読み直して先へ
  // 進めなくなる。そのときはその時刻まで読み切ったとする (止まらないことを優先し、その時刻の
  // 上限の外の行は読まない)。
  const through = new Date(Math.max(last.createdAt.getTime() - 1, scan.since.getTime() + 1));
  if (through < scan.readThrough) scan.readThrough = through;
}

async function eventsSince(db: Db, kinds: string[], scan: Scan): Promise<EventRow[]> {
  const rows = await db
    .select()
    .from(securityEvents)
    .where(
      and(
        inArray(securityEvents.kind, kinds),
        gt(securityEvents.createdAt, scan.since),
        lt(securityEvents.createdAt, new Date(scan.until.getTime() + 1)),
      ),
    )
    .orderBy(asc(securityEvents.createdAt))
    .limit(SCAN_LIMIT);
  noteTruncation(scan, rows);
  return rows;
}

/** いつもと違う国かを比べるサインインの履歴の長さ。 */
const LOCATION_HISTORY_MS = 30 * DAY;
/** サインインの履歴を引くときに 1 回で渡す利用者の数 (D1 のバインドの上限 100 の内側)。 */
const HISTORY_ACTORS_PER_QUERY = 90;

/** いつもと違う国からのサインイン・深夜帯の管理者のサインイン。 */
async function sessionRules(db: Db, scan: Scan): Promise<AlertCandidate[]> {
  const out: AlertCandidate[] = [];
  const sessions = await eventsSince(db, ["session.start"], scan);

  // 比べる履歴 (各サインインの前 30 日の国) を、サインインごとではなく利用者ごとにまとめて引く
  // (サインインが多い検査で D1 の 1 回の呼び出しあたりの問い合わせ数の上限に当たらないように)。
  // 検査の範囲より前は「国ごとの最後のサインインの時刻」を引き、範囲の中は読んだ行を順に見ていく。
  const actorIds = [
    ...new Set(sessions.filter((ev) => ev.actorId && ev.country).map((ev) => ev.actorId ?? "")),
  ];
  const before = new Map<string, Map<string, number>>();
  for (let i = 0; i < actorIds.length; i += HISTORY_ACTORS_PER_QUERY) {
    const rows = await db
      .select({
        actorId: securityEvents.actorId,
        country: securityEvents.country,
        last: sql<number>`max(${securityEvents.createdAt})`,
      })
      .from(securityEvents)
      .where(
        and(
          eq(securityEvents.kind, "session.start"),
          inArray(securityEvents.actorId, actorIds.slice(i, i + HISTORY_ACTORS_PER_QUERY)),
          isNotNull(securityEvents.country),
          gte(securityEvents.createdAt, new Date(scan.since.getTime() - LOCATION_HISTORY_MS)),
          lt(securityEvents.createdAt, new Date(scan.since.getTime() + 1)),
        ),
      )
      .groupBy(securityEvents.actorId, securityEvents.country);
    for (const r of rows) {
      if (!r.actorId || !r.country) continue;
      const m = before.get(r.actorId) ?? new Map<string, number>();
      m.set(r.country, Number(r.last));
      before.set(r.actorId, m);
    }
  }
  /** 検査の範囲の中で、いま見ているサインインより前にあった国 (利用者ごと)。 */
  const seenInScan = new Map<string, Map<string, number>>();

  for (const ev of sessions) {
    if (!ev.actorId) continue;
    const role = ev.actorRole ?? "";
    if (ev.country) {
      const from = ev.createdAt.getTime() - LOCATION_HISTORY_MS;
      const known = new Set<string>();
      for (const source of [before.get(ev.actorId), seenInScan.get(ev.actorId)]) {
        for (const [country, last] of source ?? []) {
          if (last >= from && last < ev.createdAt.getTime()) known.add(country);
        }
      }
      // 初めてのサインイン (比べる履歴が無い) は「いつもと違う」とは言えないので出さない。
      if (known.size > 0 && !known.has(ev.country)) {
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
            usual_countries: [...known],
          },
          at: ev.createdAt,
        });
      }
      const seen = seenInScan.get(ev.actorId) ?? new Map<string, number>();
      seen.set(ev.country, ev.createdAt.getTime());
      seenInScan.set(ev.actorId, seen);
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

/** 出来事 1 件ごとに数えるルール (未招待・無効化済み)。 */
async function perEventRules(db: Db, scan: Scan): Promise<AlertCandidate[]> {
  const out: AlertCandidate[] = [];
  const rows = await eventsSince(db, ["auth.no_profile", "auth.disabled"], scan);
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
    } else {
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
    }
  }
  return out;
}

/** 「1 時間に N 回」で数えるルール。 */
interface BurstSpec {
  kind: string;
  /** 何ごとに数えるか (security_events の列)。 */
  group: "actor" | "ip" | "email";
  threshold: number;
  rule: SecurityRule;
  severity: SecuritySeverity;
  /** アラートの対象の呼び名 (detail と重複判定のキーに使う)。 */
  label: string;
}

const GROUP_COLUMN = { actor: "actor_id", ip: "ip", email: "email" } as const;

const BURST_SPECS: readonly BurstSpec[] = [
  {
    kind: "access.denied",
    group: "email",
    threshold: THRESHOLDS.accessDenied,
    rule: "access_denied_burst",
    severity: "high",
    label: "email",
  },
  {
    kind: "access.denied",
    group: "ip",
    threshold: THRESHOLDS.accessDenied,
    rule: "access_denied_burst",
    severity: "high",
    label: "ip",
  },
  {
    kind: "authz.forbidden",
    group: "actor",
    threshold: THRESHOLDS.forbidden,
    rule: "forbidden_burst",
    severity: "high",
    label: "actor_id",
  },
  {
    kind: "authz.forbidden",
    group: "ip",
    threshold: THRESHOLDS.forbidden,
    rule: "forbidden_burst",
    severity: "high",
    label: "ip",
  },
  {
    kind: "rate_limited",
    group: "ip",
    threshold: THRESHOLDS.rateLimited,
    rule: "rate_limit_burst",
    severity: "medium",
    label: "ip",
  },
  {
    kind: "auth.invalid_token",
    group: "ip",
    threshold: THRESHOLDS.invalidToken,
    rule: "invalid_token",
    severity: "medium",
    label: "ip",
  },
  {
    kind: "data.export",
    group: "actor",
    threshold: THRESHOLDS.bulkExport,
    rule: "bulk_export",
    severity: "medium",
    label: "actor_id",
  },
];

/**
 * `from` から `now` までの出来事それぞれについて、「その出来事の時刻までの 1 時間」(x > t - 1h かつ
 * x <= t。時刻は ms の整数) の件数を数え、しきい値に届いたものをアラートの候補にする。窓の終わりを
 * 出来事の時刻に合わせるので、検査と検査の間 (15 分) に始まって終わる連続も、遅れて取り込んだ行の
 * 連続も取りこぼさない。数えるのは D1 の中 (窓関数で 1 回の並べ替え) で行い、返すのは (組織・対象・日)
 * ごとのいちばん多い件数と最後の時刻だけ — 行を読み出さないので、出来事がどれだけ多くても途中で切れない。
 * 窓の頭に入る出来事を数えるため、`from` の 1 時間前から読む。
 */
async function windowBursts(
  db: Db,
  spec: BurstSpec,
  from: Date,
  now: Date,
): Promise<AlertCandidate[]> {
  const col = sql.raw(GROUP_COLUMN[spec.group]);
  const rows = await db.all<{
    tenant_id: string;
    window_key: string;
    window_count: number;
    window_at: number;
  }>(sql`
    select tenant_id, window_key, max(window_count) as window_count, max(window_at) as window_at
    from (
      select tenant_id, ${col} as window_key, created_at as window_at,
        count(*) over (
          partition by tenant_id, ${col}
          order by created_at
          range between ${HOUR - 1} preceding and current row
        ) as window_count
      from security_events
      where kind = ${spec.kind}
        and ${col} is not null
        and created_at > ${from.getTime() - HOUR}
        and created_at <= ${now.getTime()}
    )
    where window_at >= ${from.getTime()} and window_count >= ${spec.threshold}
    group by tenant_id, window_key, date((window_at + ${9 * HOUR}) / 1000, 'unixepoch')
  `);
  return burstCandidates(
    rows.map((r) => ({
      tenantId: r.tenant_id,
      key: r.window_key,
      count: Number(r.window_count),
      last: new Date(Number(r.window_at)),
    })),
    spec.rule,
    spec.severity,
    spec.label,
  );
}

function burstCandidates(
  rows: Array<{ tenantId: string; key: string; count: number; last: Date }>,
  rule: SecurityRule,
  severity: SecuritySeverity,
  label: string,
): AlertCandidate[] {
  return rows.map((r) => ({
    tenantId: r.tenantId,
    rule,
    severity,
    subject: r.key,
    // 日付は検査の時刻ではなく最後の出来事の日にする (日付が変わった直後の検査で、新しい出来事の
    // 無い同じ連続を別のアラートにしない)。
    dedupeKey: `${rule}:${label}:${r.key}:${jstDate(r.last)}`,
    count: r.count,
    countMode: "max" as const,
    detail: { [label]: r.key, count_last_hour: r.count },
    at: r.last,
  }));
}

/** 前回の検査より後の出来事それぞれで、全部の「1 時間に N 回」のルールを数える。 */
async function burstRules(db: Db, from: Date, now: Date): Promise<AlertCandidate[]> {
  const out: AlertCandidate[] = [];
  for (const spec of BURST_SPECS) out.push(...(await windowBursts(db, spec, from, now)));
  return out;
}

/**
 * 遅れて取り込んだ Access の拒否の連続。前回の検査より前の時刻の行は通常のルールの範囲に入らないので、
 * 取り込んだ最も古い時刻から数え直す。
 */
async function backfilledAccessDeniedBursts(
  db: Db,
  from: Date,
  now: Date,
): Promise<AlertCandidate[]> {
  const out: AlertCandidate[] = [];
  for (const spec of BURST_SPECS.filter((b) => b.kind === "access.denied")) {
    out.push(...(await windowBursts(db, spec, from, now)));
  }
  return out;
}

/** 直近 1 時間のサーバーエラーが、過去 7 日の平均より大きく多い。 */
async function errorSpikeRule(db: Db, until: Date): Promise<AlertCandidate[]> {
  // 組織ごとに数える (別の組織だけで起きた急増を、その組織の管理者に見せる)。
  const countByTenant = async (from: Date, to: Date) => {
    const rows = await db
      .select({
        tenantId: securityEvents.tenantId,
        n: sql<number>`count(*)`,
        last: sql<number>`max(${securityEvents.createdAt})`,
      })
      .from(securityEvents)
      .where(
        and(
          eq(securityEvents.kind, "server_error"),
          gt(securityEvents.createdAt, from),
          lt(securityEvents.createdAt, to),
        ),
      )
      .groupBy(securityEvents.tenantId);
    return new Map(rows.map((r) => [r.tenantId, { n: Number(r.n), last: Number(r.last) }]));
  };
  const lastHour = await countByTenant(
    new Date(until.getTime() - HOUR),
    new Date(until.getTime() + 1),
  );
  if (![...lastHour.values()].some((v) => v.n >= THRESHOLDS.errorSpikeMin)) return [];
  const week = await countByTenant(
    new Date(until.getTime() - 7 * DAY - HOUR),
    new Date(until.getTime() - HOUR),
  );
  const out: AlertCandidate[] = [];
  for (const [tenantId, { n: count, last }] of lastHour) {
    if (count < THRESHOLDS.errorSpikeMin) continue;
    const hourlyAverage = (week.get(tenantId)?.n ?? 0) / (7 * 24);
    if (count < hourlyAverage * THRESHOLDS.errorSpikeRatio) continue;
    // 時刻は検査の時刻ではなく最後のエラーの時刻にする。新しいエラーが無ければ、解決済みに
    // したアラートを戻さず、時の境目をまたいでも同じ日のうちは 1 件にまとまる。
    const at = new Date(last);
    out.push({
      tenantId,
      rule: "error_spike",
      severity: "medium",
      subject: null,
      dedupeKey: `error_spike:${jstDate(at)}`,
      count,
      countMode: "max",
      detail: { count_last_hour: count, hourly_average_7d: Math.round(hourlyAverage * 10) / 10 },
      at,
    });
  }
  return out;
}

/** 管理者権限の付与 (ロールの変更・管理者としての招待)・無効化したアカウントの復帰 (監査ログから)。 */
async function privilegeRules(db: Db, scan: Scan): Promise<AlertCandidate[]> {
  const rows = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        inArray(auditLogs.action, ["user_role_change", "user_invite", "user_enable"]),
        gt(auditLogs.createdAt, scan.since),
        lt(auditLogs.createdAt, new Date(scan.until.getTime() + 1)),
      ),
    )
    .orderBy(asc(auditLogs.createdAt))
    .limit(SCAN_LIMIT);
  noteTruncation(scan, rows);
  const out: AlertCandidate[] = [];
  for (const row of rows) {
    // 招待は付けたロールを `role` に、ロールの変更は新しいロールを `new_role` に残す。
    const roleKey = row.action === "user_invite" ? "role" : "new_role";
    const newRole = typeof row.metadata?.[roleKey] === "string" ? row.metadata[roleKey] : null;
    const isGrant = row.action !== "user_enable" && newRole != null && ADMIN_ROLES.has(newRole);
    if (row.action !== "user_enable" && !isGrant) continue;
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

/** 既にあるアラートを引くときに 1 回で渡すキーの数 (D1 のバインドの上限 100 の内側)。 */
const SAVE_KEYS_PER_QUERY = 90;
/** 新しいアラートを 1 文で入れる行数 (security_alerts は 18 列。D1 のバインドの上限 100 の内側)。 */
const SAVE_ROWS_PER_INSERT = 5;
/** アラートの書き込みを 1 回の batch で送る文の数。 */
const SAVE_WRITES_PER_BATCH = 25;

/** 候補を保存する。新しく出たアラート (解決後に再発して未対応に戻したものを含む) を返す。 */
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
  if (merged.size === 0) return created;

  // 既にあるアラートはまとめて引く (候補ごとに引くと、候補が多い検査で D1 の 1 回の呼び出しあたりの
  // 問い合わせ数の上限に当たる)。
  const keys = [...new Set([...merged.values()].map((c) => c.dedupeKey))];
  const existingByKey = new Map<string, SecurityAlertRecord>();
  for (let i = 0; i < keys.length; i += SAVE_KEYS_PER_QUERY) {
    const rows = await db
      .select()
      .from(securityAlerts)
      .where(inArray(securityAlerts.dedupeKey, keys.slice(i, i + SAVE_KEYS_PER_QUERY)));
    for (const row of rows) existingByKey.set(`${row.tenantId}\u0000${row.dedupeKey}`, row);
  }

  // 書き込みも batch でまとめて送る。`report` は返った行を新しいアラートとして返すか。
  const writes: Array<{
    statement: ReturnType<typeof alertUpdate> | ReturnType<typeof alertInsert>;
    report: boolean;
  }> = [];
  const alertUpdate = (id: string, set: Partial<typeof securityAlerts.$inferInsert>) =>
    db.update(securityAlerts).set(set).where(eq(securityAlerts.id, id)).returning();
  const alertInsert = (values: Array<typeof securityAlerts.$inferInsert>) =>
    db.insert(securityAlerts).values(values).onConflictDoNothing().returning();
  const inserts: Array<typeof securityAlerts.$inferInsert> = [];
  for (const [key, c] of merged) {
    const existing = existingByKey.get(key);
    if (existing) {
      // 解決済みにしたあとで同じ出来事がまた起きたら、未対応に戻して知らせ直す (同じ日のうちに
      // 再発しても、解決済みのまま一覧から消えて誰も気づかない、を防ぐ)。
      const recurred =
        existing.status === "resolved" && c.at > (existing.statusChangedAt ?? existing.lastSeenAt);
      writes.push({
        statement: alertUpdate(existing.id, {
          eventCount:
            c.countMode === "add"
              ? existing.eventCount + c.count
              : Math.max(existing.eventCount, c.count),
          lastSeenAt: c.at > existing.lastSeenAt ? c.at : existing.lastSeenAt,
          detail: { ...existing.detail, ...c.detail },
          ...(recurred
            ? {
                status: "open" as const,
                statusChangedBy: "自動 (解決後に再発)",
                statusChangedAt: new Date(),
                notifiedAt: null,
              }
            : {}),
        }),
        report: recurred,
      });
      continue;
    }
    inserts.push({
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
    });
  }
  // 新しいアラートは複数行の文にまとめる (入れた行がすべて新しいアラート)。
  for (let i = 0; i < inserts.length; i += SAVE_ROWS_PER_INSERT) {
    writes.push({
      statement: alertInsert(inserts.slice(i, i + SAVE_ROWS_PER_INSERT)),
      report: true,
    });
  }
  for (let i = 0; i < writes.length; i += SAVE_WRITES_PER_BATCH) {
    const chunk = writes.slice(i, i + SAVE_WRITES_PER_BATCH);
    const [first, ...rest] = chunk.map((w) => w.statement);
    if (!first) continue;
    const results = await db.batch([first, ...rest]);
    results.forEach((rows, j) => {
      if (chunk[j]?.report) created.push(...rows);
    });
  }
  return created;
}

type NotifyEnv = Pick<
  Env,
  "SECURITY_ALERT_WEBHOOK_URL" | "INVITE_REDIRECT_URL" | "ALLOWED_ORIGINS" | "STAFF_ORIGIN"
>;

/**
 * 通知に載せるセキュリティ画面の入口。管理者は講師・管理者用の入口からしか操作できないので、
 * それがあればそちら (受講者用の入口を開くと「講師・管理者用の入口から開いてください」になる)。
 */
function appBaseUrl(env: NotifyEnv): string | null {
  const raw = env.STAFF_ORIGIN || env.INVITE_REDIRECT_URL || env.ALLOWED_ORIGINS?.split(",")[0];
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
    // 通知の ID は「アラート・知らせる回・管理者」で決める。途中で失敗して次の検査で送り直しても、
    // 入れ終えた分は重ねない (知らせる回 = 未対応に戻した時刻。最初は作った時刻)。
    const values = list.flatMap((a) =>
      admins.map((admin) => ({
        id: `security-alert:${a.id}:${(a.statusChangedAt ?? a.createdAt).getTime()}:${admin.id}`,
        userId: admin.id,
        tenantId,
        type: "security_alert" as const,
        title: `セキュリティ: ${a.title}`,
        body: `重要度「${SECURITY_SEVERITY_LABELS[a.severity]}」のアラートが出ました。セキュリティ画面で内容を確認してください。`,
        payload: { alert_id: a.id, rule: a.rule, severity: a.severity },
      })),
    );
    const statements = [];
    for (let i = 0; i < values.length; i += 10) {
      statements.push(
        db
          .insert(notifications)
          .values(values.slice(i, i + 10))
          .onConflictDoNothing({ target: notifications.id }),
      );
    }
    for (let i = 0; i < statements.length; i += SAVE_WRITES_PER_BATCH) {
      const [first, ...rest] = statements.slice(i, i + SAVE_WRITES_PER_BATCH);
      if (first) await db.batch([first, ...rest]);
    }
  }

  const webhook = env.SECURITY_ALERT_WEBHOOK_URL?.trim();
  if (webhook) {
    // Webhook は全組織で 1 つなので、どの組織のアラートかを行ごとに書く (画面は組織ごとに分かれる)。
    // 組織 ID は個人の情報ではない。
    const lines = targets.map(
      (a) =>
        `・[組織 ${a.tenantId}] 重要度「${SECURITY_SEVERITY_LABELS[a.severity]}」${a.title} (${a.eventCount} 件)`,
    );
    const text = [
      `[STELLA セキュリティ] 新しいアラートが ${targets.length} 件あります`,
      ...lines,
      ...(link ? [`確認: ${link}`] : []),
    ].join("\n");
    let delivered = false;
    try {
      const res = await fetchImpl(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(10_000),
      });
      delivered = res.ok;
      if (!res.ok) console.error("[security] alert webhook failed", res.status);
    } catch (err) {
      console.error("[security] alert webhook failed", err instanceof Error ? err.name : "error");
    }
    // 届かなければ知らせ済みにしない — 次の検査で送り直す (アプリ内の通知は ID が決まっているので、
    // 送り直しても重ならない)。
    if (!delivered) return;
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
  options: {
    /** 今回の取り込みで入れた Access のログの最も古い時刻 (遅れて入った分の連続を数え直す)。 */
    accessImportedFrom?: Date | null;
  } = {},
): Promise<SecurityAlertRecord[]> {
  const cursorRaw = await readSecurityState(db, DETECT_CURSOR);
  const cursorMs = cursorRaw ? Number(cursorRaw) : Number.NaN;
  // 初回と、長く止まっていたあとは 1 日までさかのぼる。
  const since = new Date(
    Math.max(Number.isFinite(cursorMs) ? cursorMs : now.getTime() - HOUR, now.getTime() - DAY),
  );
  const scan: Scan = { since, until: now, readThrough: now };
  const candidates = [
    ...(await sessionRules(db, scan)),
    ...(await perEventRules(db, scan)),
    ...(await privilegeRules(db, scan)),
    ...(await burstRules(db, since, now)),
    ...(await errorSpikeRule(db, now)),
  ];
  // 前回の検査より前の時刻の Access のログを取り込んだときは、その時刻から数え直す (さかのぼるのは
  // 1 日まで)。取り込んだ時刻は取り込みのときに控えてあり (検知が失敗しても次の検査で数え直せる)、
  // 検知を保存し終えてから消す。
  const storedRaw = await readSecurityState(db, ACCESS_BACKFILL_FROM);
  const storedMs = storedRaw ? Number(storedRaw) : Number.NaN;
  const importedMs = Math.min(
    options.accessImportedFrom?.getTime() ?? Number.POSITIVE_INFINITY,
    Number.isFinite(storedMs) ? storedMs : Number.POSITIVE_INFINITY,
  );
  if (Number.isFinite(importedMs) && importedMs < since.getTime()) {
    const from = new Date(Math.max(importedMs, now.getTime() - DAY));
    candidates.push(...(await backfilledAccessDeniedBursts(db, from, now)));
  }
  const created = await saveAlerts(db, candidates);
  if (storedRaw) await writeSecurityState(db, ACCESS_BACKFILL_FROM, "");
  // 上限まで読んだ問い合わせがあれば、読み切れたところまでしか進めない (残りは次の検査で読む。
  // 他のルールが読んだ出来事を次の検査でもう一度数えることはあるが、アラートは日ごとにまとまる
  // ので、増えるのは件数だけ)。アラートを保存したら通知より先に進める — 通知が失敗しても同じ
  // 出来事を数え直さない (知らせ損ねたアラートは下で拾い直す)。
  await writeSecurityState(db, DETECT_CURSOR, String(scan.readThrough.getTime()));
  await writeSecurityState(db, LAST_SCAN_AT, String(now.getTime()));
  await notifyAlerts(db, env, await pendingNotifications(db, created, now), fetchImpl);
  return created;
}

/**
 * 知らせるアラート。今回出たものに加え、前の検査で保存したが通知の途中で失敗した (Worker が
 * 止まった・D1 のエラー) ものを拾い直す (直近 1 日の未対応の「高」「中」で、まだ知らせていないもの)。
 */
async function pendingNotifications(
  db: Db,
  created: SecurityAlertRecord[],
  now: Date,
): Promise<SecurityAlertRecord[]> {
  const unsent = await db
    .select()
    .from(securityAlerts)
    .where(
      and(
        isNull(securityAlerts.notifiedAt),
        eq(securityAlerts.status, "open"),
        inArray(securityAlerts.severity, ["high", "medium"]),
        gte(securityAlerts.lastSeenAt, new Date(now.getTime() - DAY)),
      ),
    )
    .limit(200);
  const byId = new Map(created.map((a) => [a.id, a]));
  for (const a of unsent) if (!byId.has(a.id)) byId.set(a.id, a);
  return [...byId.values()];
}

const SCAN_LOCK = "scan_lock";
/** 検査 1 回の処理より十分長く (Access のログ取り込み 20 秒 + 検知)、落ちたときに長く止めない長さ。 */
const SCAN_LOCK_TTL_MS = 5 * 60 * 1000;

/**
 * Access のログの取り込みと検知を 1 回流す (cron と画面の「今すぐ検査」が使う)。同時に走ると件数を
 * 二重に数え通知を重複して送るので、ロックを取れたときだけ走らせる。取れなければ null。
 */
export async function runSecurityScan(
  env: NotifyEnv &
    Pick<Env, "SECURITY_TENANT_ID" | "PUBLIC_CONTENT_TENANT_ID"> &
    Parameters<typeof importAccessLogs>[0],
  db: Db,
): Promise<{ created: SecurityAlertRecord[]; accessLogError: boolean } | null> {
  const lock = await acquireSecurityLock(db, SCAN_LOCK, SCAN_LOCK_TTL_MS);
  if (!lock) return null;
  try {
    let accessLogError = false;
    let accessImportedFrom: Date | null = null;
    try {
      accessImportedFrom = (await importAccessLogs(env, db))?.oldest ?? null;
    } catch (err) {
      // 取り込みに失敗しても (トークンの権限切れなど)、アプリの出来事での検知は続ける。
      accessLogError = true;
      console.error(
        "[security] access log import failed",
        err instanceof Error ? err.message : err,
      );
    }
    const created = await detectSecurityAlerts(db, env, new Date(), fetch, { accessImportedFrom });
    return { created, accessLogError };
  } finally {
    await releaseSecurityLock(db, SCAN_LOCK, lock);
  }
}
