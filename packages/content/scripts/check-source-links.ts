import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readSourceRegistry } from "../src/source-references.js";
import {
  checkSourceLink,
  findManualConfirmation,
  parseManualLinkChecks,
  type SourceLinkResult,
} from "../src/source-links.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const registry = readSourceRegistry(root);
const sources = [...registry.values()];
const manualChecks = parseManualLinkChecks(
  JSON.parse(readFileSync(join(root, "sources/link-checks.json"), "utf8")),
);
const results: SourceLinkResult[] = [];
// 同時接続を4件に抑え、タイムアウトは資料ごとに記録する。台帳の読む節 (section) も渡し、
// ページが残っていても節の見出しが消えていれば手動確認に回す。
for (let i = 0; i < sources.length; i += 4)
  results.push(
    ...(await Promise.all(sources.slice(i, i + 4).map((source) => checkSourceLink(source)))),
  );
const manual = results
  .filter((r) => r.status === "manual-confirmation")
  .map((result) => {
    // 確認記録は、そのとき確かめた読む節・理由と一致するものだけを添える。
    const confirmation = findManualConfirmation(
      result,
      registry.get(result.sourceRef) ?? {},
      manualChecks,
    );
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
        `- ${r.sourceRef}: ${r.status} (${r.reason}${r.httpStatus ? `, HTTP ${r.httpStatus}` : ""})${r.missingSections ? ` 見出しが見つからない節: ${r.missingSections.join(" / ")}` : ""}`,
    )
    .join("\n") +
  "\n\nタイムアウト・アクセス制限・節の未検出は削除と区別します。手動確認は sources/link-checks.json に確認者・日時・結果・確認内容と、確かめた台帳の読む節 (section)・理由 (reason)・見つからなかった節 (missingSections) を残してください。節や理由が変わった資料は確認し直します。\n";
writeFileSync(join(output, "source-link-summary.md"), summary);
console.log(summary);
if (pending && process.env.GITHUB_ACTIONS)
  console.log(
    `::warning::参照元リンクの手動確認が ${pending} 件あります。記録を参照元リンクレポートに残しました。`,
  );
if (removed) process.exitCode = 1;
