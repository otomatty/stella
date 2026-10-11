/**
 * コンテナーの中で動く入口 (`sandbox-check.ts` が 1 ファイルに束ねて持ち込む)。
 *
 * `/work/job.json` の課題を `/work/task` で拡張と同じ固定ランナーにかけ、結果を
 * `/work/result.json` に書く。ホストのファイルはこの作業フォルダーしか見えない。
 */

import { readFile, writeFile } from "node:fs/promises";
import type { TaskManifest } from "../../../shared/src/tasks/manifest.js";
import { runTask } from "../../../../apps/vscode/src/runner/run-task.js";

const WORK = "/work";

const job = JSON.parse(await readFile(`${WORK}/job.json`, "utf8")) as { manifest: TaskManifest };
const result = await runTask({
  root: `${WORK}/task`,
  manifest: job.manifest,
  manifestSha256: "",
});
await writeFile(`${WORK}/result.json`, JSON.stringify(result));
