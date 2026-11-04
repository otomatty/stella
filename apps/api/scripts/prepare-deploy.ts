/** Run before any remote content, migration or deployment step. No Cloudflare writes. */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  checkDeploymentConfig,
  parseWrangler,
  requireContentDeploymentInputs,
  requireDeploymentInputs,
  validateReviewDeployment,
} from "./lib/deployment-config.js";
import {
  resolveDeployDatabase,
  validateDeployUrls,
  validateMaterialsUrl,
  withDeployDatabase,
} from "./lib/deploy-target.js";

const contentOnly = process.argv.includes("--content-only");
const configPath = join(import.meta.dirname, "..", "wrangler.toml");
if (contentOnly) requireContentDeploymentInputs(process.env);
else requireDeploymentInputs(process.env);
checkDeploymentConfig(resolve(import.meta.dirname, "../../.."), process.env.CLOUDFLARE_ACCOUNT_ID);
if (contentOnly) validateMaterialsUrl(process.env.VITE_MATERIALS_BASE_URL);
else validateDeployUrls(process.env.VITE_SERVER_URL, process.env.VITE_MATERIALS_BASE_URL);
const toml = readFileSync(configPath, "utf8");
if (!contentOnly) validateReviewDeployment(parseWrangler(toml, configPath), process.env);
const id = await resolveDeployDatabase(toml, process.env.CLOUDFLARE_API_TOKEN ?? "");
writeFileSync(configPath, withDeployDatabase(toml, id));
console.log(`Deployment database: stella-db (${id})`);
