import { resolve } from "node:path";
import { checkDeploymentConfig } from "./lib/deployment-config.js";

// The ID is public configuration. It is optional for fork PRs, mandatory in deploy:prepare.
checkDeploymentConfig(
  resolve(import.meta.dirname, "../../.."),
  process.env.CLOUDFLARE_ACCOUNT_ID || undefined,
);
console.log("Deployment setting names, accounts and shared bindings agree");
