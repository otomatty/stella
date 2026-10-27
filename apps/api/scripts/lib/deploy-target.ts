import { parseD1Config } from "./d1-remote.js";

const DATABASE_NAME = "stella-db";
const LOCAL_DATABASE_ID = "00000000-0000-0000-0000-000000000000";
const API_ORIGIN = "https://stella-api.saedgewell.workers.dev";

export function validateDeployUrls(
  serverUrl: string | undefined,
  materialsUrl: string | undefined,
) {
  if (serverUrl !== API_ORIGIN) {
    throw new Error(`VITE_SERVER_URL must be ${API_ORIGIN}`);
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
