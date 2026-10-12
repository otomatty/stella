/** Run before any remote content, migration or deployment step. No Cloudflare writes. */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { withNarratorDatabase } from "./lib/narrator-config.js";
import {
  resolveDeployDatabase,
  validateDeployUrls,
  withDeployDatabase,
} from "./lib/deploy-target.js";

const configPath = join(import.meta.dirname, "..", "wrangler.toml");
validateDeployUrls(process.env.VITE_SERVER_URL, process.env.VITE_MATERIALS_BASE_URL);
const toml = readFileSync(configPath, "utf8");
const id = await resolveDeployDatabase(toml, process.env.CLOUDFLARE_API_TOKEN ?? "");
const narratorPath = join(import.meta.dirname, "../../narrator/wrangler.jsonc");
const narratorConfig = withNarratorDatabase(readFileSync(narratorPath, "utf8"), id);
writeFileSync(configPath, withDeployDatabase(toml, id));
writeFileSync(narratorPath, narratorConfig);
console.log(`Deployment database: stella-db (${id})`);
