import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { parse as parseJsonc, type ParseError } from "jsonc-parser";
import { parse as parseToml } from "smol-toml";
import { parse as parseYaml } from "yaml";
import deployment from "../../deployment.json";
import {
  requireReviewCredentials,
  resolveReviewProvider,
} from "../../src/lib/ai-review-provider.js";

export { deployment };

export interface WranglerConfig {
  account_id?: string;
  vars?: Record<string, unknown>;
  env?: Record<string, WranglerConfig>;
  d1_databases?: { binding: string; database_name: string; database_id: string }[];
  r2_buckets?: { binding: string; bucket_name: string }[];
  services?: { binding: string; service: string; entrypoint?: string }[];
}

/** Parse files, including comments, rather than matching commented-out settings. */
export function parseWrangler(source: string, path: string): WranglerConfig {
  if (path.endsWith(".toml")) return parseToml(source) as WranglerConfig;
  const errors: ParseError[] = [];
  const config: unknown = parseJsonc(source, errors, { allowTrailingComma: true });
  if (errors.length || !config || typeof config !== "object" || Array.isArray(config))
    throw new Error(`${path}: invalid Wrangler configuration`);
  return config as WranglerConfig;
}

export function workflowSettingNames(source: string) {
  const names = { variables: new Set<string>(), secrets: new Set<string>() };
  function visit(value: unknown): void {
    if (typeof value === "string") {
      for (const expression of value.matchAll(/\$\{\{([\s\S]*?)\}\}/g)) {
        const remaining = expression[1].replace(
          /\b(vars|secrets)\s*(?:\.\s*([A-Za-z_]\w*)|\[\s*(['"])([A-Za-z_]\w*)\3\s*\])/g,
          (
            _match,
            context: string,
            dotName: string | undefined,
            _quote: string,
            bracketName: string,
          ) => {
            names[context === "vars" ? "variables" : "secrets"].add(dotName ?? bracketName);
            return "";
          },
        );
        if (/\b(vars|secrets)\b/.test(remaining))
          throw new Error("deploy.yml: use literal Variables / Secrets names");
      }
    } else if (Array.isArray(value)) {
      for (const item of value) visit(item);
    } else if (value && typeof value === "object") {
      for (const item of Object.values(value)) visit(item);
    }
  }
  visit(parseYaml(source));
  return names;
}

export function validateDeploymentConfig(
  workflow: string,
  configs: Record<string, WranglerConfig>,
  accountId?: string,
): void {
  const names = workflowSettingNames(workflow);
  for (const kind of ["variables", "secrets"] as const) {
    const expected = new Set(deployment.github[kind]);
    const missing = [...expected].filter((name) => !names[kind].has(name));
    const extra = [...names[kind]].filter((name) => !expected.has(name));
    if (missing.length || extra.length)
      throw new Error(
        `deploy.yml ${kind}: missing [${missing.join(", ")}], unlisted [${extra.join(", ")}]`,
      );
  }
  if (accountId !== undefined && accountId !== deployment.accountId)
    throw new Error("CLOUDFLARE_ACCOUNT_ID must match deployment.json accountId");
  function checkAccount(config: WranglerConfig, path: string, inherited?: string): void {
    const account = config.account_id ?? inherited;
    if (account !== deployment.accountId)
      throw new Error(`${path}: account_id must match deployment.json accountId`);
    if (
      config.vars?.CLOUDFLARE_ACCOUNT_ID !== undefined &&
      config.vars.CLOUDFLARE_ACCOUNT_ID !== account
    )
      throw new Error(`${path}: runtime CLOUDFLARE_ACCOUNT_ID must match account_id`);
    for (const [name, env] of Object.entries(config.env ?? {}))
      checkAccount(env, `${path} env.${name}`, account);
  }
  for (const [path, config] of Object.entries(configs)) checkAccount(config, path);

  const api = configs["apps/api/wrangler.toml"];
  if (!api) throw new Error("API Wrangler configuration is required");
  // The PDF processing Worker (narrator) was retired in 2026-11; no other Worker may bind
  // the library bucket or call a processing service any more.
  if (configs["apps/narrator/wrangler.jsonc"])
    throw new Error("apps/narrator was retired; remove its Wrangler configuration");
  resolveReviewProvider(reviewDeploymentEnv(api));
  const { database, libraryBucket } = deployment.resources;
  function single<T extends { binding: string }>(entries: T[] | undefined, binding: string): T {
    const matches = entries?.filter((entry) => entry.binding === binding) ?? [];
    if (matches.length !== 1) throw new Error(`Expected exactly one ${binding} binding`);
    return matches[0];
  }
  const apiDb = single(api.d1_databases, database.binding);
  if (apiDb.database_name !== database.name || !apiDb.database_id)
    throw new Error("API DB binding must use the deployment database name and an ID");
  const apiBucket = single(api.r2_buckets, libraryBucket.apiBinding);
  if (apiBucket.bucket_name !== libraryBucket.name)
    throw new Error("API library R2 binding must use the deployment bucket name");
  if (api.services?.some((entry) => entry.binding === "NARRATOR"))
    throw new Error("API must not bind the retired NARRATOR service");
}

function reviewDeploymentEnv(
  config: WranglerConfig,
  secrets: Record<string, string | undefined> = {},
) {
  const value = (key: string) =>
    typeof config.vars?.[key] === "string" ? config.vars[key] : undefined;
  return {
    AI_REVIEW_PROVIDER: value("AI_REVIEW_PROVIDER"),
    AI_REVIEW_MODEL: value("AI_REVIEW_MODEL"),
    ANTHROPIC_MODEL: value("ANTHROPIC_MODEL"),
    AI_GATEWAY_ID: value("AI_GATEWAY_ID"),
    CLOUDFLARE_ACCOUNT_ID: value("CLOUDFLARE_ACCOUNT_ID"),
    ANTHROPIC_API_KEY: secrets.ANTHROPIC_API_KEY ?? "",
    OPENAI_API_KEY: secrets.OPENAI_API_KEY,
  };
}

/** リモートへ書く前に、選んだ一次レビューに必要なキーも検査する。 */
export function validateReviewDeployment(
  config: WranglerConfig,
  secrets: Record<string, string | undefined>,
) {
  const env = reviewDeploymentEnv(config, secrets);
  requireReviewCredentials(env, resolveReviewProvider(env).provider);
}

/** PR checks never read credentials or fetch GitHub/Cloudflare settings. */
export function checkDeploymentConfig(root: string, accountId?: string): void {
  const ignored = new Set([
    ".git",
    "node_modules",
    ".wrangler",
    "dist",
    "coverage",
    "graphify-out",
    ".claude",
    ".worktrees",
  ]);
  const configs: Record<string, WranglerConfig> = {};
  function scan(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory() && !ignored.has(entry.name)) scan(path);
      else if (entry.isFile() && /^wrangler.*\.(toml|jsonc?)$/.test(entry.name)) {
        const key = relative(root, path).replaceAll("\\", "/");
        configs[key] = parseWrangler(readFileSync(path, "utf8"), key);
      }
    }
  }
  scan(root);
  validateDeploymentConfig(
    readFileSync(join(root, ".github/workflows/deploy.yml"), "utf8"),
    configs,
    accountId,
  );
}

/**
 * 外部リポジトリが教材だけを流すときの事前確認。
 * Better Auth と AI の鍵は見ない。値はエラーに出さない。
 */
const CONTENT_DEPLOYMENT_SETTINGS = [
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "PDF_KEY_SALT",
  "VITE_MATERIALS_BASE_URL",
] as const;

export function requireContentDeploymentInputs(env: Record<string, string | undefined>): void {
  const missing = CONTENT_DEPLOYMENT_SETTINGS.filter((name) => !env[name]?.trim());
  if (missing.length) throw new Error(`Missing content deployment settings: ${missing.join(", ")}`);
}

/** Runs only in deployment preflight. Errors contain names, never input values. */
export function requireDeploymentInputs(env: Record<string, string | undefined>): void {
  const required = [
    ...deployment.github.variables,
    ...deployment.github.secrets.filter(
      (name) => !deployment.github.optionalSecrets.includes(name),
    ),
  ];
  const missing = required.filter((name) => !env[name]?.trim());
  if (missing.length) throw new Error(`Missing deployment settings: ${missing.join(", ")}`);
}
