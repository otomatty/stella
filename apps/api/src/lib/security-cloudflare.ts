/**
 * Cloudflare API (Zero Trust / Access) との連携。どちらも任意で、`CF_ACCESS_API_TOKEN` が無ければ動かない。
 *
 *   - Access のログ (拒否を含むログイン記録) の取り込み … cron が 15 分ごとに `importAccessLogs`
 *   - Access のセッションの失効 … 管理画面とアカウントの無効化から `revokeAccessSessions`
 *
 * Cloudflare の応答本文やトークンはエラーにもログにも載せない。
 */

import { inArray, sql } from "drizzle-orm";

import type { Db } from "../db/client.js";
import { profiles } from "../db/schema.js";
import type { Env } from "../env.js";
import {
  insertSecurityEvents,
  type NewSecurityEvent,
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
/**
 * 1 回の取り込みで書く STELLA の行の目安。2 ページ目より後は、これだけ集まったら次のページを読まない
 * (2 ページは必ず読む。書くのは多くて約 2,000 行 ≒ 340 文)。D1 の 1 回の呼び出しあたりの問い合わせ数の上限 (有料プランで 1000) に、
 * cron の他の処理と合わせて収める。数えるのは STELLA の行だけ — 同じアカウントの別のアプリの行は
 * 書かないので、それが多くても STELLA の取り込みは遅れない。読み切れなかった窓は次の取り込みで
 * 続きのページから読む。
 */
const STELLA_ROWS_PER_RUN = 1000;
/** 1 回の取り込みで読むページ数の上限 (Cloudflare API の呼び出しと時間を cron 1 回に収める)。 */
const MAX_PAGES_PER_RUN = 10;
/** 1 文で入れる行数 (security_events は 16 列。D1 のバインドの上限 100 に収める)。 */
const ROWS_PER_INSERT = 6;
/** 1 回の batch に入れる文の数。 */
const INSERTS_PER_BATCH = 25;

type CloudflareEnv = Pick<
  Env,
  | "CF_ACCESS_API_TOKEN"
  | "CLOUDFLARE_ACCOUNT_ID"
  | "SECURITY_TENANT_ID"
  | "PUBLIC_CONTENT_TENANT_ID"
  | "ALLOWED_ORIGINS"
  | "INVITE_REDIRECT_URL"
>;

/**
 * STELLA の Web のホスト名 (Access アプリのドメイン)。Access のログはアカウント全体のものが返るので、
 * これに当たる行だけを取り込む (同じアカウントの別の Access アプリの利用者の情報を STELLA に持ち込まない)。
 */
export function stellaAppHost(
  env: Pick<Env, "ALLOWED_ORIGINS" | "INVITE_REDIRECT_URL">,
): string | null {
  const raw = env.INVITE_REDIRECT_URL || env.ALLOWED_ORIGINS?.split(",")[0];
  if (!raw) return null;
  try {
    return new URL(raw.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** ログの `app_domain` (`<ホスト名>` または `<ホスト名>/<パス>`) のホスト名。 */
function appDomainHost(appDomain: string | undefined): string | null {
  const host = appDomain?.trim().split("/")[0]?.toLowerCase();
  return host || null;
}

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
      .where(inArray(sql`lower(${profiles.email})`, part));
    for (const row of rows) if (row.email) map.set(row.email.toLowerCase(), row.tenantId);
  }
  return map;
}

/**
 * 取り込みの続きの位置。読んでいる途中の窓 (`since`〜`until`) と次に読むページ番号。窓を読み切ったら
 * `until` だけを残し、次の取り込みはそこから今までの新しい窓を読む。
 */
interface ImportWindow {
  since: number;
  until: number | null;
  page: number;
}

function parseWindow(raw: string | null): ImportWindow | null {
  if (!raw) return null;
  // 以前の形式 (読み切った時刻の数字だけ)。
  if (/^\d+$/.test(raw)) return { since: Number(raw), until: null, page: 1 };
  try {
    const v = JSON.parse(raw) as Partial<ImportWindow>;
    if (typeof v.since !== "number" || !Number.isFinite(v.since)) return null;
    const until = typeof v.until === "number" && Number.isFinite(v.until) ? v.until : null;
    const page = typeof v.page === "number" && v.page >= 1 ? Math.floor(v.page) : 1;
    return { since: v.since, until, page: until == null ? 1 : page };
  } catch {
    return null;
  }
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
): Promise<{ imported: number; oldest: Date | null } | null> {
  if (!cloudflareAccessApiConfigured(env)) return null;
  // 取り込むのは STELLA のアプリの行だけ。ホスト名が分からなければ何も読まない (別のアプリの利用者の
  // 情報を混ぜないため)。
  const appHost = stellaAppHost(env);
  if (!appHost) return { imported: 0, oldest: null };
  const isStella = (l: AccessRequestLog) => appDomainHost(l.app_domain) === appHost;
  const saved = parseWindow(await readSecurityState(db, ACCESS_LOG_CURSOR));
  // 読んでいる途中の窓があればその続きのページから。無ければ、前回読み切った時刻から今までの窓を
  // 1 ページ目から (初回・長く止まっていたあとは 1 日までさかのぼる)。
  const resuming = saved?.until != null;
  const since = new Date(
    resuming && saved ? saved.since : Math.max(saved?.since ?? 0, now.getTime() - MAX_LOOKBACK_MS),
  );
  const until = new Date(resuming && saved?.until != null ? saved.until : now.getTime());
  const firstPage = resuming && saved ? saved.page : 1;

  // 同じ窓をページ番号で読む (同じ時刻の行が多くても、ページで続きが決まるので飛ばさない)。
  type Log = AccessRequestLog & { ray_id: string; created_at: string };
  const page: Log[] = [];
  const seen = new Set<string>();
  let stellaRows = 0;
  let next: ImportWindow = { since: since.getTime(), until: until.getTime(), page: firstPage };
  for (let pageNo = firstPage; pageNo < firstPage + MAX_PAGES_PER_RUN; pageNo++) {
    const url = new URL(
      `${API_BASE}/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID ?? "")}/access/logs/access_requests`,
    );
    url.searchParams.set("since", since.toISOString());
    url.searchParams.set("until", until.toISOString());
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("per_page", String(PAGE_LIMIT));
    url.searchParams.set("page", String(pageNo));
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
    const rows = body.result.filter(
      (l): l is Log => typeof l?.ray_id === "string" && typeof l.created_at === "string",
    );
    const fresh = rows.filter((l) => !seen.has(l.ray_id));
    for (const l of fresh) seen.add(l.ray_id);
    page.push(...fresh);
    stellaRows += fresh.filter(isStella).length;
    if (body.result.length < PAGE_LIMIT) {
      // 窓を読み切った。次は until から今までの窓。
      next = { since: until.getTime(), until: null, page: 1 };
      break;
    }
    if (pageNo > firstPage && fresh.length === 0) {
      // ページ番号を受け付けず同じ行を返してきた。時刻で続ける (読んだ行がすべて同じ時刻なら
      // 1 ms 先へ進める — 止まらないことを優先する)。
      let latest = since.getTime();
      for (const l of page) {
        const t = new Date(l.created_at).getTime();
        if (Number.isFinite(t)) latest = Math.max(latest, t);
      }
      next = { since: latest > since.getTime() ? latest : latest + 1, until: null, page: 1 };
      break;
    }
    next = { since: since.getTime(), until: until.getTime(), page: pageNo + 1 };
    if (pageNo > firstPage && stellaRows >= STELLA_ROWS_PER_RUN) break;
  }

  // 続きの位置は絞り込む前のページで決めている。
  const logs = page.filter(isStella);
  const emails = [
    ...new Set(
      logs.map((l) => l.user_email?.trim().toLowerCase()).filter((e): e is string => Boolean(e)),
    ),
  ];
  const tenants = await tenantsByEmail(db, emails);
  const fallback = securityFallbackTenant(env);

  const values: NewSecurityEvent[] = [];
  let oldest: Date | null = null;
  for (const log of logs) {
    const createdAt = new Date(log.created_at);
    if (Number.isNaN(createdAt.getTime())) continue;
    if (!oldest || createdAt < oldest) oldest = createdAt;
    const email = log.user_email?.trim().toLowerCase() || null;
    const country = log.country?.toUpperCase();
    values.push({
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
  }
  // 1 行ずつ書くと 1 ページで 1000 回の問い合わせになり D1 の上限に当たるので、複数行の文を batch で送る。
  const imported = await insertSecurityEvents(db, values, ROWS_PER_INSERT, INSERTS_PER_BATCH);
  await writeSecurityState(db, ACCESS_LOG_CURSOR, JSON.stringify(next));
  await writeSecurityState(db, ACCESS_LOG_IMPORTED_AT, String(now.getTime()));
  return { imported, oldest };
}

/**
 * 利用者の Access のセッションを全部失効させる (次のリクエストで Access がログインし直させる)。
 * 組織単位の API なので、同じアカウントの他の Access アプリのセッションも失効する (利用者 1 人を
 * アプリ単位で失効させる API は無い。画面の確認と docs/cloudflare-access.md で知らせている)。
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
