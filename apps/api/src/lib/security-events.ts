/**
 * セキュリティの出来事 (security_events) の記録。
 *
 * IPA の注意喚起 (2026-10-09) が求める「直近 1〜3 か月のログで、エラーの量・平常との差・
 * ログイン元の IP や時間帯を確かめる」を、Workers のログ (数日で消える) に頼らずにできるよう、
 * 検知に要る出来事だけを D1 に残す。
 *
 *   - 新しいサインイン (Access のトークンの発行時刻が変わった) … `trackSession`
 *   - 未招待・無効化済み・認証トークンなしのアクセス … authz.ts が記録
 *   - 401 / 403 / 429 / 5xx の応答 … index.ts のミドルウェアが `recordResponseOutcome` で記録
 *   - Cloudflare Access のログ (拒否を含む) … security-access-logs.ts が cron で取り込む
 *
 * どれも **主処理を止めない** (失敗は console に出すだけ)。応答のあとで `waitUntil` で書く。
 * 攻撃で 403 を大量に打たれても D1 の書き込み枠 (無料枠は 1 日 10 万行) を食い潰さないよう、
 * アイソレートごとに 1 分あたりの記録数を絞る (超えた分は数だけ数えて 1 行にまとめる)。
 */

import { and, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import type { Context } from "hono";

import type { SecurityEventKind } from "@stella/shared/security/types";

import { getDb, type Db } from "../db/client.js";
import { authVscodeLinks, securityEvents, securitySessions, securityState } from "../db/schema.js";
import type { Env } from "../env.js";

/** 出来事を残す日数 (IPA の「3 か月さかのぼる」を満たし、要らない記録を持ち続けない)。 */
export const SECURITY_EVENT_RETENTION_DAYS = 180;

export interface SecurityActor {
  id: string;
  tenantId: string;
  role: string;
  email?: string | null;
}

export interface NewSecurityEvent {
  kind: SecurityEventKind;
  tenantId: string;
  source?: "app" | "access";
  externalId?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  email?: string | null;
  ip?: string | null;
  country?: string | null;
  userAgent?: string | null;
  method?: string | null;
  path?: string | null;
  status?: number | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

export interface RequestMeta {
  ip: string | null;
  country: string | null;
  userAgent: string | null;
  method: string;
  path: string;
}

type AnyContext = Context<{ Bindings: Env }>;

/** 組織の決まらない出来事を見せるテナント。 */
export function securityFallbackTenant(
  env: Pick<Env, "SECURITY_TENANT_ID" | "PUBLIC_CONTENT_TENANT_ID">,
): string {
  return env.SECURITY_TENANT_ID?.trim() || env.PUBLIC_CONTENT_TENANT_ID?.trim() || "ses";
}

const MAX_UA = 300;
const MAX_PATH = 300;

export function requestMeta(c: AnyContext): RequestMeta {
  const country = c.req.header("cf-ipcountry")?.toUpperCase() ?? null;
  return {
    ip:
      c.req.header("cf-connecting-ip") ??
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      null,
    // XX = 不明、T1 = Tor。どちらも国としては扱わない (T1 は metadata に残す)。
    country: country && /^[A-Z]{2}$/.test(country) && country !== "XX" ? country : null,
    userAgent: c.req.header("user-agent")?.slice(0, MAX_UA) ?? null,
    method: c.req.method,
    // クエリは残さない (検索語やコードなど、個人の入力が混ざるため)。
    path: new URL(c.req.url).pathname.slice(0, MAX_PATH),
  };
}

// ---------------------------------------------------------------------------
// リクエストごとの印 (誰のリクエストか・もう記録したか)
// ---------------------------------------------------------------------------

interface RequestMark {
  actor?: SecurityActor;
  recorded?: boolean;
}

const marks = new WeakMap<Request, RequestMark>();

function markOf(c: AnyContext): RequestMark {
  let mark = marks.get(c.req.raw);
  if (!mark) {
    mark = {};
    marks.set(c.req.raw, mark);
  }
  return mark;
}

/** getCaller が利用者を決めたら印を付ける (ミドルウェアが 403 などを誰の操作か書けるように)。 */
export function markRequestActor(c: AnyContext, actor: SecurityActor): void {
  markOf(c).actor = actor;
}

/** このリクエストの出来事は記録済み (ミドルウェアが同じ応答を二重に書かない)。 */
export function markRequestRecorded(c: AnyContext): void {
  markOf(c).recorded = true;
}

// ---------------------------------------------------------------------------
// 書き込み
// ---------------------------------------------------------------------------

/** 1 分あたり・アイソレートあたりの記録数の上限。 */
const MAX_EVENTS_PER_MINUTE = 60;
let windowStartedAt = 0;
let windowCount = 0;
let windowDropped = 0;

/** テスト用: 絞りの状態を戻す。 */
export function resetSecurityEventThrottle(): void {
  windowStartedAt = 0;
  windowCount = 0;
  windowDropped = 0;
}

/** 記録してよいか。前の 1 分に捨てた数があれば返す (まとめて 1 行に残す)。 */
function admit(now: number): { ok: boolean; droppedBefore: number } {
  if (now - windowStartedAt >= 60_000) {
    const droppedBefore = windowDropped;
    windowStartedAt = now;
    windowCount = 0;
    windowDropped = 0;
    windowCount++;
    return { ok: true, droppedBefore };
  }
  if (windowCount >= MAX_EVENTS_PER_MINUTE) {
    windowDropped++;
    return { ok: false, droppedBefore: 0 };
  }
  windowCount++;
  return { ok: true, droppedBefore: 0 };
}

function eventValues(event: NewSecurityEvent): typeof securityEvents.$inferInsert {
  return {
    tenantId: event.tenantId,
    kind: event.kind,
    source: event.source ?? "app",
    externalId: event.externalId ?? null,
    actorId: event.actorId ?? null,
    actorRole: event.actorRole ?? null,
    email: event.email ?? null,
    ip: event.ip ?? null,
    country: event.country ?? null,
    userAgent: event.userAgent ?? null,
    method: event.method ?? null,
    path: event.path ?? null,
    status: event.status ?? null,
    metadata: event.metadata ?? {},
    createdAt: event.createdAt ?? new Date(),
  };
}

/** 出来事を 1 件書く (絞りなし。取り込み元の ID が同じものは二重に書かない)。 */
export async function insertSecurityEvent(db: Db, event: NewSecurityEvent): Promise<boolean> {
  const rows = await db
    .insert(securityEvents)
    .values(eventValues(event))
    .onConflictDoNothing()
    .returning({ id: securityEvents.id });
  return rows.length > 0;
}

/**
 * 応答を待たせずに処理を走らせる。ExecutionContext の無い呼び出し (route テストの
 * `app.request` など) では何もしない — 閉じたテスト用 DB に後から書きに行かないため。
 */
export function deferTask(c: AnyContext, task: () => Promise<unknown>): void {
  let ctx: { waitUntil(promise: Promise<unknown>): void };
  try {
    ctx = c.executionCtx;
  } catch {
    return;
  }
  ctx.waitUntil(
    task().catch((err) => {
      console.error("[security] background task failed", err);
    }),
  );
}

/** リクエストの情報を添えて出来事を書く (絞りあり・応答のあとで書く)。 */
export function deferSecurityEvent(
  c: AnyContext,
  event: Omit<NewSecurityEvent, "tenantId"> & { tenantId?: string | null },
): void {
  const now = Date.now();
  const { ok, droppedBefore } = admit(now);
  if (!ok) return;
  const meta = requestMeta(c);
  const tenantId = event.tenantId ?? securityFallbackTenant(c.env);
  deferTask(c, async () => {
    const db = getDb(c.env);
    await insertSecurityEvent(db, {
      ip: meta.ip,
      country: meta.country,
      userAgent: meta.userAgent,
      method: meta.method,
      path: meta.path,
      ...event,
      tenantId,
      metadata: {
        ...(c.req.header("cf-ipcountry") === "T1" ? { tor: true } : {}),
        ...(droppedBefore > 0 ? { throttled_before: droppedBefore } : {}),
        ...event.metadata,
      },
    });
  });
}

/** 401 / 403 / 429 / 5xx の応答を出来事として残す (index.ts のミドルウェアから呼ぶ)。 */
export function recordResponseOutcome(c: AnyContext): void {
  if (c.req.method === "OPTIONS") return;
  const mark = marks.get(c.req.raw);
  if (mark?.recorded) return;
  const status = c.res.status;
  const kind: SecurityEventKind | null =
    status === 401
      ? "auth.invalid_token"
      : status === 403
        ? "authz.forbidden"
        : status === 429
          ? "rate_limited"
          : status >= 500
            ? "server_error"
            : null;
  if (!kind) return;
  deferSecurityEvent(c, {
    kind,
    status,
    tenantId: mark?.actor?.tenantId ?? null,
    actorId: mark?.actor?.id ?? null,
    actorRole: mark?.actor?.role ?? null,
    email: mark?.actor?.email ?? null,
  });
}

// ---------------------------------------------------------------------------
// サインインの検知 (Access のセッションの始まり)
// ---------------------------------------------------------------------------

/** 同じ利用者の「最後に見た時刻」を書き直す間隔。 */
const SEEN_REFRESH_MS = 60 * 60 * 1000;
/** 発行時刻の分からないトークン (開発用) で、新しいセッションとみなす空白。 */
const SESSION_GAP_MS = 12 * 60 * 60 * 1000;
const MAX_CACHED = 5_000;

/** キーは「利用者 + トークンの発行時刻」(複数の端末のセッションを別々に覚える)。値は最後に書いた時刻。 */
const seenCache = new Map<string, number>();
/** 同じ利用者の別の端末のセッションを、新しいサインインと取り違えないためにさかのぼる日数。 */
const KNOWN_SESSION_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

/** テスト用。 */
export function resetSessionCache(): void {
  seenCache.clear();
}

/**
 * 利用者のリクエストごとに呼ぶ。Access のトークンの発行時刻が前と違えば、新しいサインイン
 * (`session.start`) を残す。同じセッションのあいだは 1 時間に 1 回だけ最終利用時刻を書く。
 */
export function trackSession(c: AnyContext, actor: SecurityActor, issuedAt: number | null): void {
  const now = Date.now();
  const key = `${actor.id}:${issuedAt ?? ""}`;
  const cached = seenCache.get(key);
  if (cached !== undefined && now - cached < SEEN_REFRESH_MS) return;
  if (seenCache.size >= MAX_CACHED) seenCache.clear();
  seenCache.set(key, now);
  const meta = requestMeta(c);
  deferTask(c, () => upsertSession(getDb(c.env), actor, issuedAt, meta, new Date(now)));
}

/** `trackSession` の本体 (テストから直接呼べるよう分けてある)。新しいサインインなら true。 */
export async function upsertSession(
  db: Db,
  actor: SecurityActor,
  issuedAt: number | null,
  meta: Pick<RequestMeta, "ip" | "country" | "userAgent">,
  now: Date,
): Promise<boolean> {
  const row = (
    await db
      .select()
      .from(securitySessions)
      .where(eq(securitySessions.profileId, actor.id))
      .limit(1)
  )[0];
  let isNew =
    !row ||
    (issuedAt != null
      ? row.lastIssuedAt !== issuedAt
      : !row.lastSeenAt || now.getTime() - row.lastSeenAt.getTime() > SESSION_GAP_MS);
  // PC と携帯のように同じ利用者の端末が交互に使うと、最後の発行時刻だけでは毎回「新しい」に見える。
  // 同じ発行時刻のサインインをもう記録していれば、既に知っているセッションとして扱う。
  if (isNew && row && issuedAt != null) {
    const known = await db
      .select({ id: securityEvents.id })
      .from(securityEvents)
      .where(
        and(
          eq(securityEvents.actorId, actor.id),
          eq(securityEvents.kind, "session.start"),
          gte(securityEvents.createdAt, new Date(now.getTime() - KNOWN_SESSION_LOOKBACK_MS)),
          sql`json_extract(${securityEvents.metadata}, '$.issued_at') = ${issuedAt}`,
        ),
      )
      .limit(1);
    if (known.length > 0) isNew = false;
  }

  if (isNew) {
    await insertSecurityEvent(db, {
      kind: "session.start",
      tenantId: actor.tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      email: actor.email ?? null,
      ip: meta.ip,
      country: meta.country,
      userAgent: meta.userAgent,
      metadata: {
        ...(issuedAt != null ? { issued_at: issuedAt } : {}),
        ...(row?.lastIp ? { previous_ip: row.lastIp } : {}),
        ...(row?.lastCountry ? { previous_country: row.lastCountry } : {}),
      },
      createdAt: now,
    });
  }

  const values = {
    tenantId: actor.tenantId,
    lastIssuedAt: issuedAt,
    lastSeenAt: now,
    ...(isNew
      ? {
          lastSessionAt: now,
          lastIp: meta.ip,
          lastCountry: meta.country,
          lastUserAgent: meta.userAgent,
        }
      : {}),
  };
  await db
    .insert(securitySessions)
    .values({ profileId: actor.id, ...values })
    .onConflictDoUpdate({ target: securitySessions.profileId, set: values });
  return isNew;
}

// ---------------------------------------------------------------------------
// 状態と後始末
// ---------------------------------------------------------------------------

export async function readSecurityState(db: Db, key: string): Promise<string | null> {
  const row = (await db.select().from(securityState).where(eq(securityState.key, key)).limit(1))[0];
  return row?.value ?? null;
}

export async function writeSecurityState(db: Db, key: string, value: string): Promise<void> {
  const now = new Date();
  await db
    .insert(securityState)
    .values({ key, value, updatedAt: now })
    .onConflictDoUpdate({ target: securityState.key, set: { value, updatedAt: now } });
}

/** 保存期間を過ぎた出来事を消す (1 回の cron で消す数は絞る)。 */
export async function purgeOldSecurityEvents(db: Db, now = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - SECURITY_EVENT_RETENTION_DAYS * 86_400_000);
  await db
    .delete(securityEvents)
    .where(
      and(
        lt(securityEvents.createdAt, cutoff),
        sql`${securityEvents.id} in (select id from security_events where created_at < ${cutoff.getTime()} limit 2000)`,
      ),
    );
}

/**
 * 交換されなかった VS Code の接続コードに預けた Access のトークンを消す。拡張が入っていない・
 * 受け渡しに失敗したときは交換されないので、コードの期限 (5 分) が過ぎたら D1 に残さない。
 * 期限から 1 日たった行 (コードのハッシュ) も消す。
 */
export async function purgeExpiredVscodeLinks(db: Db, now = new Date()): Promise<void> {
  await db
    .update(authVscodeLinks)
    .set({ accessToken: null })
    .where(and(lt(authVscodeLinks.expiresAt, now), isNotNull(authVscodeLinks.accessToken)));
  await db
    .delete(authVscodeLinks)
    .where(lt(authVscodeLinks.expiresAt, new Date(now.getTime() - 86_400_000)));
}

/**
 * cron と画面の「今すぐ検査」が同時に検知を走らせないためのロック (security_state の 1 行)。
 * 期限 (ms) を値に持ち、期限切れか無いときだけ取れる (条件付きの upsert で 1 回の書き込み)。
 * 取れたら true。処理が落ちてもロックは期限で外れる。
 */
export async function acquireSecurityLock(
  db: Db,
  key: string,
  ttlMs: number,
  now = new Date(),
): Promise<boolean> {
  const until = String(now.getTime() + ttlMs);
  const rows = await db
    .insert(securityState)
    .values({ key, value: until, updatedAt: now })
    .onConflictDoUpdate({
      target: securityState.key,
      set: { value: until, updatedAt: now },
      setWhere: sql`cast(${securityState.value} as integer) <= ${now.getTime()}`,
    })
    .returning({ key: securityState.key });
  return rows.length > 0;
}

export async function releaseSecurityLock(db: Db, key: string): Promise<void> {
  await db.delete(securityState).where(eq(securityState.key, key));
}
