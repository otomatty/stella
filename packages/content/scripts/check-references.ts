import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkSourceReferences } from "../src/check-source-references.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const diagnostics = checkSourceReferences(root);
for (const diagnostic of diagnostics) {
  console[diagnostic.severity === "error" ? "error" : "warn"](
    `[${diagnostic.severity}] ${diagnostic.unitId}: ${diagnostic.message}`,
  );
}
const errors = diagnostics.filter((d) => d.severity === "error");
console.log(
  `参照元: エラー ${errors.length} 件 / 未改訂単元の警告 ${diagnostics.length - errors.length} 件`,
);
if (errors.length) process.exitCode = 1;
