import { buildContentManifest } from "../src/manifest.js";
import { parsePublicTaskBundle } from "../../shared/src/tasks/catalog.js";
import { mutantsFail, solutionPasses } from "./lib/task-run-check.js";

const { tasks, codingRules } = buildContentManifest();
// コーディング規則の正本 (07 §6.4.1)。課題が指す規則の存在・範囲・導入済みかは
// buildContentManifest が確かめる。正本そのものが無いことはここで止める。
if (!codingRules.some((rule) => rule.scope === "common"))
  throw new Error("packages/content/coding-rules.md (共通のコーディング規則) がありません");
console.log(
  `コーディング規則: 共通 ${codingRules.filter((r) => r.scope === "common").length} 件・講座 ${
    codingRules.filter((r) => r.scope !== "common").length
  } 件`,
);
for (const task of tasks) {
  parsePublicTaskBundle(task.bundle);
  await solutionPasses(task, task.bundle.files, "配布ファイル");
  // 固定した開始点も公開境界を通し、その上で解答例が通ること (開始点から課題を解ける) を確かめる。
  if (task.fixedStart) {
    parsePublicTaskBundle({ ...task.bundle, files: task.fixedStart });
    await solutionPasses(task, task.fixedStart, "固定した開始点");
  }
  // 典型的な誤答 (類題は必須、#39) がテストで落ちること。
  const mutants = await mutantsFail(task);
  console.log(
    `${task.variantOf ? `類題 (${task.variantOf} の予備)` : "課題"}: ${task.definition.id} — 解答例合格・private の配布なし${task.fixedStart ? "・固定した開始点あり" : ""}${mutants > 0 ? `・誤答 ${mutants} 件が不合格` : ""}`,
  );
}
const variants = tasks.filter((task) => task.variantOf).length;
console.log(`新形式の課題: ${tasks.length - variants} 件・予備の類題: ${variants} 件`);
