import { parseD1Config } from "./d1-remote.js";

const DATABASE_NAME = "stella-db";
const LOCAL_DATABASE_ID = "00000000-0000-0000-0000-000000000000";
/**
 * 画面が API を呼ぶ先。API は Web の Worker がサービスバインディングで中継する (同じオリジン) ので、
 * 受講者用の Web のオリジンそのもの (ログインは Clerk)。
 */
const APP_ORIGIN = "https://stella-web.saedgewell.workers.dev";
/**
 * 講師・管理者用の入口。同じ画面を別の Worker (`stella-admin`) で配り、Cloudflare Access で守る。
 * API は講師・管理者・営業のリクエストを、ここを通った (Access の検証済みの) ものだけ受ける。
 */
export const STAFF_ORIGIN = "https://stella-admin.saedgewell.workers.dev";

export function validateDeployUrls(
  serverUrl: string | undefined,
  materialsUrl: string | undefined,
) {
  if (serverUrl !== APP_ORIGIN) {
    throw new Error(`VITE_SERVER_URL must be ${APP_ORIGIN}`);
  }
  if (!materialsUrl) throw new Error("VITE_MATERIALS_BASE_URL is required");
  const url = new URL(materialsUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("VITE_MATERIALS_BASE_URL must be a public HTTPS URL without credentials");
  }
}

/** 検索は読み取りだけ。未作成の DB を自動作成して空のまま切り替えない。 */
export async function resolveDeployDatabase(
  toml: string,
  apiToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const { accountId } = parseD1Config(toml, DATABASE_NAME);
  const configuredAccount = (toml.split(/^\[/m)[0] ?? "").match(
    /^\s*account_id\s*=\s*"(.+?)"/m,
  )?.[1];
  if (accountId !== configuredAccount) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID must match wrangler.toml account_id");
  }
  if (!apiToken) throw new Error("CLOUDFLARE_API_TOKEN is required");
  const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`);
  url.searchParams.set("name", DATABASE_NAME);
  url.searchParams.set("per_page", "100");
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${apiToken}` },
    signal: AbortSignal.timeout(30_000),
  });
  // Cloudflare の応答本文や認証情報をエラーへ含めない。
  if (!response.ok) throw new Error(`D1 lookup failed: HTTP ${response.status}`);
  const body = (await response.json()) as {
    success?: boolean;
    result?: Array<{ name?: string; uuid?: string }>;
  } | null;
  if (body?.success !== true || !Array.isArray(body.result)) {
    throw new Error("D1 lookup did not return a successful database list");
  }
  const matches = body.result.filter((db) => db?.name === DATABASE_NAME);
  const id = matches[0]?.uuid;
  if (
    matches.length !== 1 ||
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
    id === LOCAL_DATABASE_ID
  ) {
    throw new Error("Create and restore stella-db before deploying (see migration runbook)");
  }
  return id;
}

/** 後続の指紋・seed・Wrangler が同じ ID を読むよう、この checkout の設定を更新する。 */
export function withDeployDatabase(toml: string, databaseId: string): string {
  let updated = 0;
  const result = toml.replace(/^\[\[d1_databases\]\][\s\S]*?(?=^\[|(?![\s\S]))/gm, (block) => {
    if (block.match(/^\s*database_name\s*=\s*"(.+?)"/m)?.[1] !== DATABASE_NAME) return block;
    return block.replace(/^(\s*database_id\s*=\s*)"[^"\r\n]+"/m, (_line, prefix: string) => {
      updated++;
      return `${prefix}"${databaseId}"`;
    });
  });
  if (updated !== 1) throw new Error("Expected exactly one stella-db database_id in wrangler.toml");
  return result;
}

/**
 * Clerk と講師・管理者用の入口の設定 (GitHub の Variables `VITE_CLERK_PUBLISHABLE_KEY` /
 * `VITE_STAFF_ORIGIN` と Secret `CLERK_SECRET_KEY`)。無いまま build・デプロイすると誰もログインできない
 * ので、Cloudflare に何も書かない段階で止める。
 */
export function validateClerkSettings(
  publishableKey: string | undefined,
  staffOrigin: string | undefined,
  secretKey: string | undefined,
): { staffOrigin: string } {
  if (!/^pk_(test|live)_[A-Za-z0-9+/=_-]+$/.test(publishableKey?.trim() ?? "")) {
    throw new Error(
      "VITE_CLERK_PUBLISHABLE_KEY must be a Clerk publishable key (pk_test_ / pk_live_)",
    );
  }
  // 値は出さない。公開鍵と同じ環境 (test / live) のシークレットキーか、形だけを確かめる。
  const env = publishableKey?.trim().startsWith("pk_live_") ? "live" : "test";
  if (!new RegExp(`^sk_${env}_[A-Za-z0-9]+$`).test(secretKey?.trim() ?? "")) {
    throw new Error(`CLERK_SECRET_KEY must be set as a repo Secret (sk_${env}_…)`);
  }
  if (staffOrigin?.trim().replace(/\/+$/, "") !== STAFF_ORIGIN) {
    throw new Error(`VITE_STAFF_ORIGIN must be ${STAFF_ORIGIN}`);
  }
  return { staffOrigin: STAFF_ORIGIN };
}

/**
 * 講師・管理者用の入口を守る Cloudflare Access の設定 (GitHub の Variables `ACCESS_TEAM_DOMAIN` /
 * `ACCESS_AUD`)。無いまま API をデプロイすると講師・管理者のアカウントが Clerk だけで操作できて
 * しまうので、Cloudflare に何も書かない段階で止める。
 */
export function validateAccessSettings(
  teamDomain: string | undefined,
  aud: string | undefined,
): { teamDomain: string; aud: string } {
  const domain =
    teamDomain
      ?.trim()
      .replace(/^https:\/\//i, "")
      .replace(/\/+$/, "") ?? "";
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/i.test(domain)) {
    throw new Error("ACCESS_TEAM_DOMAIN must be <team>.cloudflareaccess.com (repo Variables)");
  }
  const audiences = (aud ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  if (audiences.length === 0 || audiences.some((a) => !/^[0-9a-f]{64}$/i.test(a))) {
    throw new Error("ACCESS_AUD must be the Access application's AUD tag (64 hex chars)");
  }
  return { teamDomain: domain.toLowerCase(), aud: audiences.join(",") };
}

/**
 * API の wrangler.toml の [vars] に Access の設定と講師・管理者用の入口を書く (この checkout の設定だけを
 * 変える)。Clerk のシークレットキー (`CLERK_SECRET_KEY`) は wrangler secret で入れる。
 */
export function withAccessVars(
  toml: string,
  settings: { teamDomain: string; aud: string; staffOrigin: string },
): string {
  const varsMatch = toml.match(/^\[vars\]\s*$/m);
  if (!varsMatch || varsMatch.index === undefined) throw new Error("wrangler.toml has no [vars]");
  const start = varsMatch.index + varsMatch[0].length;
  const rest = toml.slice(start);
  const nextSection = rest.search(/^\[/m);
  const end = nextSection === -1 ? toml.length : start + nextSection;
  let block = toml.slice(start, end);
  for (const [key, value] of [
    ["ACCESS_TEAM_DOMAIN", settings.teamDomain],
    ["ACCESS_AUD", settings.aud],
    ["STAFF_ORIGIN", settings.staffOrigin],
  ] as const) {
    const line = `${key} = "${value}"`;
    const pattern = new RegExp(`^${key}\\s*=.*$`, "m");
    block = pattern.test(block) ? block.replace(pattern, line) : `\n${line}${block}`;
  }
  return toml.slice(0, start) + block + toml.slice(end);
}
