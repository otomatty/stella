/**
 * Cloudflare API (Zero Trust / Access) との連携。どちらも任意で、`CF_ACCESS_API_TOKEN` が無ければ動かない。
 *
 *   - Access のログ (拒否を含むログイン記録) の取り込み … cron が 15 分ごとに `importAccessLogs`
 *   - Access のセッションの失効 … 管理画面とアカウントの無効化から `revokeAccessSessions`
 *
 * Cloudflare の応答本文やトークンはエラーにもログにも載せない。
 */

import { sql } from "drizzle-orm";

import type { Db } from "../db/client.js";
import { profiles } from "../db/schema.js";
import type { Env } from "../env.js";
import {
  insertSecurityEvent,
  readSecurityState,
  securityFallbackTenant,
  writeSecurityState,
} from "./security-events.js";

const API_BASE = "https://api.cloudflare.com/client/v4";
const ACCESS_LOG_CURSOR = "access_logs_cursor";
export const ACCESS_LOG_IMPORTED_AT = "access_logs_imported_at";
/** 初回・長く止まっていたときにさかのぼる上限。 */
const MAX_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const PAGE_LIMIT = 1000;

type CloudflareEnv = Pick<
  Env,
  | "CF_ACCESS_API_TOKEN"
  | "CLOUDFLARE_ACCOUNT_ID"
  | "SECURITY_TENANT_ID"
  | "PUBLIC_CONTENT_TENANT_ID"
>;

export function cloudflareAccessApiConfigured(env: CloudflareEnv): boolean {
  return Boolean(env.CF_ACCESS_API_TOKEN && env.CLOUDFLARE_ACCOUNT_ID);
}

/** Access のログ 1 件 (`GET /accounts/:id/access/logs/access_requests` の要素)。 */
interface AccessRequestLog {
  ray_id?: string;
  user_email?: string;
  ip_address?: string;
  allowed?: boolean;
  created_at?: string;
  country?: string;
  app_domain?: string;
  app_uid?: string;
  action?: string;
  connection?: string;
}

async function tenantsByEmail(db: Db, emails: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  // D1 のバインド上限 (100) を超えないよう分けて引く。
  for (let i = 0; i < emails.length; i += 90) {
    const part = emails.slice(i, i + 90);
    const rows = await db
      .select({ email: profiles.email, tenantId: profiles.tenantId })
      .from(profiles)
      .where(sql`lower(${profiles.email}) in ${part}`);
    for (const row of rows) if (row.email) map.set(row.email.toLowerCase(), row.tenantId);
  }
  return map;
}

/**
 * 前回の続きから Access のログを取り込む。設定が無ければ null。
 * 取り込んだ行は `access.login` (許可) / `access.denied` (拒否) として security_events に入る。
 */
export async function importAccessLogs(
  env: CloudflareEnv,
  db: Db,
  fetchImpl: typeof fetch = fetch,
  now = new Date(),
): Promise<{ imported: number } | null> {
  if (!cloudflareAccessApiConfigured(env)) return null;
  const cursorRaw = await readSecurityState(db, ACCESS_LOG_CURSOR);
  const cursor = cursorRaw ? Number(cursorRaw) : Number.NaN;
  const since = new Date(
    Math.max(Number.isFinite(cursor) ? cursor : 0, now.getTime() - MAX_LOOKBACK_MS),
  );

  const url = new URL(
    `${API_BASE}/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID ?? "")}/access/logs/access_requests`,
  );
  url.searchParams.set("since", since.toISOString());
  url.searchParams.set("until", now.toISOString());
  url.searchParams.set("limit", String(PAGE_LIMIT));
  url.searchParams.set("direction", "asc");
  const res = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${env.CF_ACCESS_API_TOKEN}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Access logs request failed: HTTP ${res.status}`);
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    result?: AccessRequestLog[];
  } | null;
  if (body?.success !== true || !Array.isArray(body.result)) {
    throw new Error("Access logs response was not successful");
  }

  const logs = body.result.filter(
    (l): l is AccessRequestLog & { ray_id: string; created_at: string } =>
      typeof l?.ray_id === "string" && typeof l.created_at === "string",
  );
  const emails = [
    ...new Set(
      logs.map((l) => l.user_email?.trim().toLowerCase()).filter((e): e is string => Boolean(e)),
    ),
  ];
  const tenants = await tenantsByEmail(db, emails);
  const fallback = securityFallbackTenant(env);

  let imported = 0;
  let latest = since.getTime();
  for (const log of logs) {
    const createdAt = new Date(log.created_at);
    if (Number.isNaN(createdAt.getTime())) continue;
    latest = Math.max(latest, createdAt.getTime());
    const email = log.user_email?.trim().toLowerCase() || null;
    const country = log.country?.toUpperCase();
    const inserted = await insertSecurityEvent(db, {
      kind: log.allowed === false ? "access.denied" : "access.login",
      tenantId: (email && tenants.get(email)) || fallback,
      source: "access",
      externalId: log.ray_id,
      email,
      ip: log.ip_address ?? null,
      country: country && /^[A-Z]{2}$/.test(country) ? country : null,
      metadata: {
        ...(log.app_domain ? { app_domain: log.app_domain } : {}),
        ...(log.action ? { action: log.action } : {}),
        ...(log.connection ? { connection: log.connection } : {}),
      },
      createdAt,
    });
    if (inserted) imported++;
  }
  // 1 回で取り切れなかった (上限まで返った) ときは、取り込んだ最後の時刻から続ける。
  const nextCursor = logs.length >= PAGE_LIMIT ? latest : now.getTime();
  await writeSecurityState(db, ACCESS_LOG_CURSOR, String(nextCursor));
  await writeSecurityState(db, ACCESS_LOG_IMPORTED_AT, String(now.getTime()));
  return { imported };
}

/**
 * 利用者の Access のセッションを全部失効させる (次のリクエストで Access がログインし直させる)。
 * 設定が無ければ false。失敗は例外。
 */
export async function revokeAccessSessions(
  env: CloudflareEnv,
  email: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!cloudflareAccessApiConfigured(env)) return false;
  const url = `${API_BASE}/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID ?? "")}/access/organizations/revoke_user`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CF_ACCESS_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Access session revoke failed: HTTP ${res.status}`);
  const body = (await res.json().catch(() => null)) as { success?: boolean } | null;
  if (body?.success !== true) throw new Error("Access session revoke was not successful");
  return true;
}
