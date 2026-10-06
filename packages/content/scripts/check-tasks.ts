import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { buildContentManifest } from "../src/manifest.js";
import { runTask } from "../../../apps/vscode/src/runner/run-task.js";
import { parsePublicTaskBundle } from "../../shared/src/tasks/catalog.js";

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
  const root = await mkdtemp(join(tmpdir(), "stella-solution-"));
  try {
    const files = { ...task.bundle.files };
    for (const [key, value] of Object.entries(task.privateFiles)) {
      if (key.startsWith("solution/")) files[key.slice("solution/".length)] = value;
    }
    for (const [key, value] of Object.entries(files)) {
      await mkdir(dirname(join(root, key)), { recursive: true });
      await writeFile(join(root, key), Buffer.from(value, "base64"));
    }
    const result = await runTask({ root, manifest: task.bundle.manifest, manifestSha256: "" });
    if (result.outcome !== "passed")
      throw new Error(
        `${task.definition.id}: 解答例が手元の検査に通りません\n${result.steps.map((s) => `${s.label}: ${s.summary}`).join("\n")}`,
      );
    console.log(`課題: ${task.definition.id} — 解答例合格・private の配布なし`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
console.log(`新形式の課題: ${tasks.length} 件`);
