import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildContentManifest } from "../src/manifest.js";
import { parsePublicTaskBundle } from "../../shared/src/tasks/catalog.js";
import { directoryFingerprint, taskCheckCacheKey } from "./lib/task-check-cache.js";
import { mutantsFail, solutionPasses } from "./lib/task-run-check.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const args = process.argv.slice(2);
let stage: string | undefined;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--stage") {
    stage = args[++i];
    if (!stage) throw new Error("--stage にステージの slug が必要です");
  } else {
    throw new Error(`不明な引数です: ${args[i]}`);
  }
}

const { tasks, codingRules } = buildContentManifest();
// コーディング規則の正本 (07 §6.4.1)。課題が指す規則の存在・範囲・導入済みかは
// buildContentManifest が確かめる。正本そのものが無いことはここで止める。
if (!codingRules.some((rule) => rule.scope === "common"))
  throw new Error("packages/content/coding-rules.md (共通のコーディング規則) がありません");
console.log(
  `コーディング規則: 共通 ${codingRules.filter((r) => r.scope === "common").length} 件・ステージ ${
    codingRules.filter((r) => r.scope !== "common").length
  } 件`,
);
const selected = stage ? tasks.filter((task) => task.stageId === stage) : tasks;
if (stage && selected.length === 0) throw new Error(`ステージの課題がありません: ${stage}`);

const noCache = process.env.TASK_CHECK_NO_CACHE === "1";
const cacheDir = join(repoRoot, ".task-check-cache");
const toolFingerprint = directoryFingerprint([
  { root: join(repoRoot, "apps/vscode/src/runner"), base: repoRoot },
  { root: join(repoRoot, "packages/content/templates/runners"), base: repoRoot },
  { root: join(repoRoot, "packages/shared/src/tasks"), base: repoRoot },
]);

for (const task of selected) {
  // 公開境界は毎回見る。キャッシュが飛ばすのは解答例と誤答の実行だけ。
  parsePublicTaskBundle(task.bundle);
  if (task.fixedStart) parsePublicTaskBundle({ ...task.bundle, files: task.fixedStart });
  const solution: Record<string, string> = {};
  for (const [key, value] of Object.entries(task.privateFiles))
    if (key.startsWith("solution/")) solution[key] = value;
  const cacheKey = taskCheckCacheKey({
    bundle: task.bundle,
    solution,
    mutants: task.mutants,
    fixedStart: task.fixedStart,
    toolFingerprint,
  });
  const cacheFile = join(cacheDir, cacheKey);
  const label = `${task.variantOf ? `類題 (${task.variantOf} の予備)` : "課題"}: ${task.definition.id}`;
  if (!noCache && existsSync(cacheFile)) {
    console.log(`${label} — キャッシュ (解答例と誤答の実行を飛ばしました)`);
    continue;
  }
  await solutionPasses(task, task.bundle.files, "配布ファイル");
  // 固定した開始点も公開境界を通し、その上で解答例が通ること (開始点から課題を解ける) を確かめる。
  if (task.fixedStart) await solutionPasses(task, task.fixedStart, "固定した開始点");
  // 典型的な誤答 (類題は必須、#39) がテストで落ちること。
  const mutants = await mutantsFail(task);
  if (!noCache) {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cacheFile, "");
  }
  console.log(
    `${label} — 解答例合格・private の配布なし${
      task.fixedStart ? "・固定した開始点あり" : ""
    }${mutants > 0 ? `・誤答 ${mutants} 件が不合格` : ""}`,
  );
}
const variants = selected.filter((task) => task.variantOf).length;
console.log(
  `${stage ? `${stage} の` : ""}新形式の課題: ${selected.length - variants} 件・予備の類題: ${variants} 件`,
);
