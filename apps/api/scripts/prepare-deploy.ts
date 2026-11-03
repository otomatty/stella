/** Run before any remote content, migration or deployment step. No Cloudflare writes. */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { checkDeploymentConfig, requireDeploymentInputs } from "./lib/deployment-config.js";
import { validateReviewDeployment, parseWrangler } from "./lib/deployment-config.js";
import {
  resolveDeployDatabase,
  validateDeployUrls,
  withDeployDatabase,
} from "./lib/deploy-target.js";

const configPath = join(import.meta.dirname, "..", "wrangler.toml");
requireDeploymentInputs(process.env);
checkDeploymentConfig(resolve(import.meta.dirname, "../../.."), process.env.CLOUDFLARE_ACCOUNT_ID);
validateDeployUrls(process.env.VITE_SERVER_URL, process.env.VITE_MATERIALS_BASE_URL);
const toml = readFileSync(configPath, "utf8");
validateReviewDeployment(parseWrangler(toml, configPath), process.env);
const id = await resolveDeployDatabase(toml, process.env.CLOUDFLARE_API_TOKEN ?? "");
writeFileSync(configPath, withDeployDatabase(toml, id));
console.log(`Deployment database: stella-db (${id})`);
