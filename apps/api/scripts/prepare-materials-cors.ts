import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseD1Config } from "./lib/d1-remote.js";
import { ensureMaterialsCors } from "./lib/materials-cors.js";
const config = readFileSync(join(import.meta.dirname, "../wrangler.toml"), "utf8");
const { accountId } = parseD1Config(config, "stella-db");
const configured = (config.split(/^\[/m)[0] ?? "").match(/^\s*account_id\s*=\s*"(.+?)"/m)?.[1];
if (accountId !== configured) throw new Error("Cloudflare account does not match STELLA config");
const { healthOrigin } = JSON.parse(
  readFileSync(join(import.meta.dirname, "../deployment.json"), "utf8"),
) as { healthOrigin: string };
await ensureMaterialsCors(accountId, process.env.CLOUDFLARE_API_TOKEN ?? "", healthOrigin);
console.log("STELLA materials CORS is ready");
