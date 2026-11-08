import { rmSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkSourceReferences,
  pendingApprovalByUnit,
  pendingApprovalSummary,
} from "../src/check-source-references.js";

const { values } = parseArgs({ options: { summary: { type: "string" } } });
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const diagnostics = checkSourceReferences(root);
for (const diagnostic of diagnostics) {
  if (diagnostic.kind === "pending-approval") continue;
  console[diagnostic.severity === "error" ? "error" : "warn"](
    `[${diagnostic.severity}] ${diagnostic.unitId}: ${diagnostic.message}`,
  );
}
const pending = pendingApprovalByUnit(diagnostics);
for (const [unitId, entries] of pending) {
  console.warn(`[承認待ち] ${unitId} (${entries.length} 件)`);
  for (const entry of entries) console.warn(`  ${entry.message}`);
}
if (values.summary) {
  const summary = pendingApprovalSummary(diagnostics);
  if (summary) writeFileSync(values.summary, summary);
  else rmSync(values.summary, { force: true });
}
const pendingCount = [...pending.values()].reduce((sum, entries) => sum + entries.length, 0);
const errors = diagnostics.filter((d) => d.severity === "error");
console.log(
  `参照元: エラー ${errors.length} 件 / 承認待ち ${pendingCount} 件 (${pending.size} 単元) / 未改訂単元の警告 ${diagnostics.length - errors.length - pendingCount} 件`,
);
if (errors.length) process.exitCode = 1;
