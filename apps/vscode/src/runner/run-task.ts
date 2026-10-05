/**
 * 課題フォルダーを見つけ、runner の手順を順に実行して結果をまとめる。
 *
 * VS Code の API に依存しない (テストで直接呼べるようにする)。Workspace Trust の
 * 確認や画面表示は拡張側 (task-commands.ts) が受け持つ。
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  parseTaskManifest,
  TASK_MANIFEST_PATH,
  TASK_STATE_DIR,
  type TaskManifest,
} from "@stella/shared/tasks/manifest";
import {
  decideOutcome,
  type HashedFile,
  type RunResult,
  type RunStepResult,
} from "@stella/shared/tasks/run-result";
import { RUNNERS } from "@stella/shared/tasks/runners";
import {
  checkSubmitSizes,
  hashFile,
  listFiles,
  matchPatterns,
  sha256Hex,
  TooManyFilesError,
  LIMITS,
} from "./files.js";
import { buildPlan } from "./plans.js";
import { childEnv, type ProcessOutcome, type ProcessSpec, runProcess } from "./process.js";
import { TIMEOUTS, type StepContext } from "./steps.js";
import { findExecutable, type NpmInvocation, resolveNpm } from "./toolchain.js";

export type LoadedTask =
  | { ok: true; root: string; manifest: TaskManifest; manifestSha256: string }
  | { ok: false; root: string; errors: string[] };

async function isFile(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

async function isDirectory(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * start (ファイルかフォルダー) から親へたどり、`.stella/task.json` のあるフォルダーを返す。
 * boundaries (ワークスペースのフォルダー) に着いたら、そこで止める。
 */
export async function findTaskRoot(
  start: string,
  boundaries: readonly string[] = [],
): Promise<string | null> {
  let dir = (await isDirectory(start)) ? start : path.dirname(start);
  const stops = new Set(boundaries.map((b) => path.resolve(b)));
  for (;;) {
    if (await isFile(path.join(dir, ...TASK_MANIFEST_PATH.split("/")))) return dir;
    const parent = path.dirname(dir);
    if (stops.has(path.resolve(dir)) || parent === dir) return null;
    dir = parent;
  }
}

export async function loadTask(root: string): Promise<LoadedTask> {
  let text: string;
  try {
    text = await readFile(path.join(root, ...TASK_MANIFEST_PATH.split("/")), "utf8");
  } catch {
    return { ok: false, root, errors: [`${TASK_MANIFEST_PATH} を読めませんでした`] };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, root, errors: [`${TASK_MANIFEST_PATH} が JSON として読めません`] };
  }
  const parsed = parseTaskManifest(raw);
  if (!parsed.ok) return { ok: false, root, errors: parsed.errors };
  return {
    ok: true,
    root,
    manifest: parsed.manifest,
    manifestSha256: sha256Hex(new TextEncoder().encode(text.replace(/\r\n/g, "\n"))),
  };
}

export interface RunTaskOptions {
  root: string;
  manifest: TaskManifest;
  manifestSha256: string;
  signal?: AbortSignal;
  /** 実行ログ (手順の見出しと道具の出力)。 */
  log?: (text: string) => void;
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  /** 道具の場所を差し替える (テスト用)。 */
  toolchain?: { node: string | null; npm: NpmInvocation | null };
  now?: () => Date;
}

async function resolveToolchain(
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
): Promise<{ node: string | null; npm: NpmInvocation | null }> {
  const node = await findExecutable("node", env, platform);
  const npm = await resolveNpm(node, env, platform);
  return { node, npm };
}

async function collectFiles(
  root: string,
  manifest: TaskManifest,
): Promise<{ step: RunStepResult; files: HashedFile[]; protected: HashedFile[] } | null> {
  if (manifest.submit.files.length === 0 && manifest.protected.length === 0) return null;
  const started = Date.now();
  const base = { id: "files" as const, label: "提出するファイルの確認" };
  let listed: string[];
  try {
    listed = await listFiles(root);
  } catch (error) {
    const summary =
      error instanceof TooManyFilesError
        ? `課題フォルダーのファイルが多すぎます (${LIMITS.walkedFiles} 件まで)`
        : "課題フォルダーを読めませんでした";
    return {
      step: { ...base, status: "error", summary, durationMs: Date.now() - started },
      files: [],
      protected: [],
    };
  }
  const submit = matchPatterns(listed, manifest.submit.files);
  const prot = matchPatterns(listed, manifest.protected);
  const problems: string[] = [];
  const missing: string[] = [];
  if (submit.unmatched.length > 0) {
    problems.push("提出するファイルが見つかりません。ファイル名と置き場所を確認してください");
    missing.push(...submit.unmatched);
  }
  if (prot.unmatched.length > 0) {
    problems.push(
      "配布したファイルが見つかりません。消したり名前を変えたりしていないか確認してください",
    );
    missing.push(...prot.unmatched);
  }
  const sizes = await checkSubmitSizes(root, submit.files);
  if (sizes.tooMany) problems.push(`提出するファイルが多すぎます (${LIMITS.submitFiles} 件まで)`);
  if (sizes.totalTooLarge) problems.push("提出するファイルの合計が大きすぎます (5MB まで)");
  for (const problem of sizes.problems) {
    problems.push(`${problem.path} が大きすぎます (1MB まで)`);
  }
  const files = await Promise.all(submit.files.map((f) => hashFile(root, f)));
  const protectedFiles = await Promise.all(prot.files.map((f) => hashFile(root, f)));
  const step: RunStepResult = {
    ...base,
    status: problems.length > 0 ? "failed" : "passed",
    summary: problems.length > 0 ? problems.join("。") : `提出するファイル ${files.length} 件`,
    durationMs: Date.now() - started,
    ...(missing.length > 0 ? { files: missing } : {}),
  };
  return { step, files, protected: protectedFiles };
}

export async function runTask(options: RunTaskOptions): Promise<RunResult> {
  const { root, manifest } = options;
  const platform = options.platform ?? process.platform;
  const env = childEnv(options.env ?? process.env);
  const log = options.log ?? (() => undefined);
  const startedAt = (options.now ?? (() => new Date()))();
  const runner = RUNNERS[manifest.runner];

  const toolchain =
    options.toolchain ??
    (runner.requiresNode || runner.plan === "diagnose"
      ? await resolveToolchain(env, platform)
      : { node: null, npm: null });

  const exec = (
    spec: Omit<ProcessSpec, "env"> & { env?: NodeJS.ProcessEnv },
  ): Promise<ProcessOutcome> =>
    runProcess(
      { ...spec, env: spec.env ?? env },
      { signal: options.signal, onOutput: log, platform },
    );

  const toolVersions: StepContext["toolVersions"] = {};
  if (toolchain.node && runner.requiresNode) {
    const out = await exec({
      file: toolchain.node,
      args: ["--version"],
      cwd: root,
      timeoutMs: TIMEOUTS.version,
    });
    if (out.exitCode === 0 && out.stdout.trim()) toolVersions.node = out.stdout.trim();
  }

  let submitFiles: string[] = [];
  if (manifest.submit.files.length > 0) {
    try {
      submitFiles = matchPatterns(await listFiles(root), manifest.submit.files).files;
    } catch {
      // 一覧の失敗は最後の「提出するファイルの確認」で報告する。
    }
  }

  const ctx: StepContext = {
    root,
    manifest,
    platform,
    env,
    node: toolchain.node,
    npm: toolchain.npm,
    submitFiles,
    toolVersions,
    exec,
  };

  const steps: RunStepResult[] = [];
  let stopReason: string | null = null;
  for (const step of buildPlan(manifest)) {
    if (stopReason === null && options.signal?.aborted) stopReason = "中断したため省略しました";
    if (stopReason !== null) {
      steps.push({
        id: step.id,
        label: step.label,
        status: "skipped",
        summary: stopReason,
        durationMs: 0,
      });
      continue;
    }
    log(`\n▶ ${step.label}\n`);
    const started = Date.now();
    let outcome: Awaited<ReturnType<typeof step.run>>;
    try {
      outcome = await step.run(ctx);
    } catch (error) {
      outcome = {
        status: "error",
        summary: `${step.label}で予期しないエラーが出ました: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
    steps.push({ id: step.id, label: step.label, durationMs: Date.now() - started, ...outcome });
    log(`  → ${outcome.summary}\n`);
    if (outcome.status === "error") {
      stopReason = options.signal?.aborted
        ? "中断したため省略しました"
        : "前の手順が環境の問題で止まったため省略しました";
    }
  }

  let files: HashedFile[] = [];
  let protectedFiles: HashedFile[] = [];
  if (!options.signal?.aborted) {
    const collected = await collectFiles(root, manifest);
    if (collected) {
      steps.push(collected.step);
      files = collected.files;
      protectedFiles = collected.protected;
    }
  }

  return {
    schemaVersion: 1,
    taskId: manifest.id,
    runner: manifest.runner,
    outcome: decideOutcome(steps),
    startedAt: startedAt.toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    platform,
    toolVersions,
    steps,
    files,
    protected: protectedFiles,
    manifestSha256: options.manifestSha256,
  };
}

const STATE_GITIGNORE = `# STELLA の拡張が実行のたびに書き換えるファイル (task.json は配布物なので残す)
last-run.json
deps.json
browsers.json
tmp/
`;

/** 結果を `.stella/last-run.json` に残す。提出のときに読み直す。 */
export async function saveRunResult(root: string, result: RunResult): Promise<void> {
  const dir = path.join(root, TASK_STATE_DIR);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "last-run.json"), `${JSON.stringify(result, null, 2)}\n`);
  const ignore = path.join(dir, ".gitignore");
  if (!(await isFile(ignore))) await writeFile(ignore, STATE_GITIGNORE);
}
