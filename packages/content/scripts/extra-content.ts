/**
 * 外部リポジトリの Extra ステージを、作業用の写しに重ねる。
 *
 *   bun run packages/content/scripts/extra-content.ts overlay --from <外部リポジトリ>
 *
 * リポジトリのルートに `.stella-extra-workspace` が無いときは何も書かずに終了する。
 * 公開リポジトリの作業フォルダーで実行して Extra ステージを混ぜないため。
 */

import { join, resolve } from "node:path";

import { assertExtraWorkspace, overlayExtraContent } from "../src/extra-content.js";

const repoRoot = join(import.meta.dirname, "..", "..", "..");

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

try {
  assertExtraWorkspace(repoRoot);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

const args = process.argv.slice(2);
const fromFlag = args.indexOf("--from");
const from = fromFlag >= 0 ? args[fromFlag + 1] : undefined;
if (args[0] !== "overlay" || !from || from.startsWith("-")) {
  fail(
    "使い方: bun run packages/content/scripts/extra-content.ts overlay --from <外部リポジトリのパス>",
  );
}

try {
  const result = overlayExtraContent({
    contentRoot: join(repoRoot, "packages", "content"),
    extraRoot: resolve(from),
  });
  const stages = result.stages.join("、");
  console.log(
    `Extra ステージを重ねました: ${stages}\n` +
      `スキル ${result.skills.length} 件、パターン ${result.patterns.length} 件、参照元 ${result.sources.length} 件、環境 ${result.environments.length} 件`,
  );
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
