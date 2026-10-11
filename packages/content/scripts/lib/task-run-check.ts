/**
 * 教材の課題を、拡張と同じ固定ランナーで手元で実行して確かめる (`content:check`)。
 *
 * - 解答例: 配布ファイル (または固定した開始点) に解答例を重ねると合格する。
 * - 典型的な誤答 (`private/mutants/`、#39): 解答例にさらに誤答を重ねると、テストで落ちる
 *   (環境の問題で止まるのではなく、受講者のコードの検査として「不合格」になる)。
 */

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { TaskSeed } from "../../src/task-content.js";
import { runTask } from "../../../../apps/vscode/src/runner/run-task.js";

/** 配布ファイルに解答例を重ねた一式。 */
function withSolution(task: TaskSeed, distributed: Record<string, string>) {
  const files = { ...distributed };
  for (const [key, value] of Object.entries(task.privateFiles)) {
    if (key.startsWith("solution/")) files[key.slice("solution/".length)] = value;
  }
  return files;
}

/** 一式を一時フォルダーに書き出し、固定ランナーで実行する。 */
async function runFiles(task: TaskSeed, files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), "stella-solution-"));
  try {
    for (const [key, value] of Object.entries(files)) {
      await mkdir(dirname(join(root, key)), { recursive: true });
      await writeFile(join(root, key), Buffer.from(value, "base64"));
    }
    return await runTask({ root, manifest: task.bundle.manifest, manifestSha256: "" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const stepsOf = (result: Awaited<ReturnType<typeof runFiles>>) =>
  result.steps.map((s) => `${s.label}: ${s.summary}`).join("\n");

/** 配布ファイルに解答例を重ね、拡張と同じ固定ランナーで合格するか確かめる。 */
export async function solutionPasses(
  task: TaskSeed,
  distributed: Record<string, string>,
  label: string,
): Promise<void> {
  const files = withSolution(task, distributed);
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
  const result = await runFiles(task, files);
  if (result.outcome !== "passed")
    throw new Error(
      `${task.definition.id}: ${label}に解答例を重ねても手元の検査に通りません\n${stepsOf(result)}`,
    );
}

/**
 * 典型的な誤答 (`private/mutants/<名前>/`) を解答例に重ね、どれも手元の検査で落ちることを確かめる。
 * 確かめた誤答の数を返す。合格してしまう誤答は、テストがその誤りを見逃している。環境の問題で
 * 止まった (`error`) 誤答も、テストで落ちたとは言えないので通さない。
 */
export async function mutantsFail(task: TaskSeed): Promise<number> {
  const mutants = Object.entries(task.mutants ?? {});
  for (const [name, mutant] of mutants) {
    const result = await runFiles(task, { ...withSolution(task, task.bundle.files), ...mutant });
    if (result.outcome !== "failed")
      throw new Error(
        `${task.definition.id}: 誤答 ${name} を解答例に重ねても、手元の検査で落ちません (${result.outcome})。テストか検査を足してください\n${stepsOf(result)}`,
      );
  }
  return mutants.length;
}
