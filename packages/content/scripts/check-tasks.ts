import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { buildContentManifest } from "../src/manifest.js";
import type { TaskSeed } from "../src/task-content.js";
import { runTask } from "../../../apps/vscode/src/runner/run-task.js";
import { parsePublicTaskBundle } from "../../shared/src/tasks/catalog.js";

/** 配布ファイルに解答例を重ね、拡張と同じ固定ランナーで合格するか確かめる。 */
async function solutionPasses(task: TaskSeed, distributed: Record<string, string>, label: string) {
  const root = await mkdtemp(join(tmpdir(), "stella-solution-"));
  try {
    const files = { ...distributed };
    for (const [key, value] of Object.entries(task.privateFiles)) {
      if (key.startsWith("solution/")) files[key.slice("solution/".length)] = value;
    }
    // CI と公開の課題は受講者の GitHub Actions で動くので、手元ではワークフローのファイルが
    // そろうことだけを確かめる (拡張の手順は実行の URL とコミットを控えるだけ。07 §5.5)。
    if (task.bundle.manifest.runner === "ci-deploy") {
      const workflow = task.bundle.manifest.ci?.workflow;
      if (!workflow || !(workflow in files))
        throw new Error(
          `${task.definition.id}: ${label}に解答例を重ねても、ワークフロー ${workflow ?? "(指定なし)"} がありません`,
        );
      return;
    }
    for (const [key, value] of Object.entries(files)) {
      await mkdir(dirname(join(root, key)), { recursive: true });
      await writeFile(join(root, key), Buffer.from(value, "base64"));
    }
    const result = await runTask({ root, manifest: task.bundle.manifest, manifestSha256: "" });
    if (result.outcome !== "passed")
      throw new Error(
        `${task.definition.id}: ${label}に解答例を重ねても手元の検査に通りません\n${result.steps.map((s) => `${s.label}: ${s.summary}`).join("\n")}`,
      );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

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
  console.log(
    `課題: ${task.definition.id} — 解答例合格・private の配布なし${task.fixedStart ? "・固定した開始点あり" : ""}`,
  );
}
console.log(`新形式の課題: ${tasks.length} 件`);
