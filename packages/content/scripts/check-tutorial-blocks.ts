import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkTutorialBlocks } from "../src/tutorial-blocks-check.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const diagnostics = checkTutorialBlocks(
  resolve(root, "packages/content/stages"),
  resolve(root, "apps/web/scripts/tutorials/scenarios"),
  resolve(root, "apps/web/public/tutorials/manifest.json"),
);
for (const d of diagnostics)
  console[d.severity === "error" ? "error" : "warn"](
    `${d.severity}: stages/${d.file}:${d.line} — ${d.message}`,
  );
const errors = diagnostics.filter((d) => d.severity === "error").length;
console.log(`操作動画の指定: エラー ${errors} 件、警告 ${diagnostics.length - errors} 件`);
if (errors) process.exitCode = 1;
