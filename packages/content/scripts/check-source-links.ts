import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readSourceRegistry } from "../src/source-references.js";
import {
  checkSourceLink,
  parseManualLinkChecks,
  type SourceLinkResult,
} from "../src/source-links.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sources = [...readSourceRegistry(root).values()];
const manualChecks = parseManualLinkChecks(
  JSON.parse(readFileSync(join(root, "sources/link-checks.json"), "utf8")),
);
const results: SourceLinkResult[] = [];
// 同時接続を4件に抑え、タイムアウトは資料ごとに記録する。
for (let i = 0; i < sources.length; i += 4)
  results.push(
    ...(await Promise.all(sources.slice(i, i + 4).map((source) => checkSourceLink(source)))),
  );
const manual = results
  .filter((r) => r.status === "manual-confirmation")
  .map((result) => {
    const confirmation = manualChecks
      .filter(
        (m) =>
          m.sourceRef === result.sourceRef &&
          m.url === result.url &&
          Date.now() - Date.parse(m.checkedAt) <= 7 * 24 * 60 * 60_000 &&
          Date.parse(m.checkedAt) <= Date.now(),
      )
      .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))[0];
    return { ...result, ...(confirmation ? { confirmation } : {}), pending: !confirmation };
  });
const removed =
  results.filter((r) => r.status === "removed").length +
  manual.filter((m) => m.confirmation?.result === "removed").length;
const pending = manual.filter((m) => m.pending).length;
const report = {
  schemaVersion: 1,
  checkedAt: new Date().toISOString(),
  results,
  manualChecks: manual,
  removed,
  pending,
};
const output = join(root, "dist");
mkdirSync(output, { recursive: true });
writeFileSync(join(output, "source-link-report.json"), JSON.stringify(report, null, 2) + "\n");
const summary =
  `## 参照元リンク確認\n\n削除 ${removed} 件 / 手動確認待ち ${pending} 件\n\n` +
  results
    .map(
      (r) =>
        `- ${r.sourceRef}: ${r.status} (${r.reason}${r.httpStatus ? `, HTTP ${r.httpStatus}` : ""})`,
    )
    .join("\n") +
  "\n\nタイムアウト・アクセス制限・節の未検出は削除と区別します。手動確認は sources/link-checks.json に確認者・日時・結果・確認内容を残してください。\n";
writeFileSync(join(output, "source-link-summary.md"), summary);
console.log(summary);
if (pending && process.env.GITHUB_ACTIONS)
  console.log(
    `::warning::参照元リンクの手動確認が ${pending} 件あります。記録を参照元リンクレポートに残しました。`,
  );
if (removed) process.exitCode = 1;
