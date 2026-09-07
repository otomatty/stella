/** Run before any remote content, migration or deployment step. No Cloudflare writes. */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveDeployDatabase,
  validateDeployUrls,
  withDeployDatabase,
} from "./lib/deploy-target.js";

const configPath = join(import.meta.dirname, "..", "wrangler.toml");
validateDeployUrls(process.env.VITE_SERVER_URL, process.env.VITE_MATERIALS_BASE_URL);
const toml = readFileSync(configPath, "utf8");
const id = await resolveDeployDatabase(toml, process.env.CLOUDFLARE_API_TOKEN ?? "");
writeFileSync(configPath, withDeployDatabase(toml, id));
console.log(`Deployment database: stella-db (${id})`);
