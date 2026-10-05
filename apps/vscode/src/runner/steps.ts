/**
 * runner の各手順。どの手順も、起動するコマンドと引数をここで固定する。
 * 課題の定義 (`.stella/task.json`) が選べるのは runnerId と、lint・整形をするかだけ。
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import {
  checkToolVersion,
  describeRequirement,
  ENVIRONMENT_TOOL_LABELS,
  ENVIRONMENT_TOOLS,
  type EnvironmentTool,
  formatVersion,
} from "@stella/shared/tasks/environment";
import { TASK_STATE_DIR, type TaskManifest } from "@stella/shared/tasks/manifest";
import type { RunStepId, RunStepResult, TestCaseResult } from "@stella/shared/tasks/run-result";
import { RUNNERS } from "@stella/shared/tasks/runners";
import { asCliPath, LIMITS, writeStateFile } from "./files.js";
import {
  parseEslintReport,
  parsePlaywrightReport,
  parsePrettierList,
  parseVitestReport,
} from "./parsers.js";
import type { ProcessOutcome, ProcessSpec } from "./process.js";
import { tailLines } from "./process.js";
import { findExecutable, type NpmInvocation, resolvePackageBin } from "./toolchain.js";
import { runStaticChecks } from "./static-checks.js";

export type StepOutcome = Omit<RunStepResult, "id" | "label" | "durationMs">;

export interface StepContext {
  root: string;
  manifest: TaskManifest;
  platform: NodeJS.Platform;
  /** 子プロセスに渡す環境変数 (childEnv 済み)。 */
  env: NodeJS.ProcessEnv;
  node: string | null;
  npm: NpmInvocation | null;
  /** submit.files に当たったファイル (課題フォルダーからの相対パス)。 */
  submitFiles: readonly string[];
  /** 道具の版を書き込む (環境診断が使う)。 */
  toolVersions: Partial<Record<EnvironmentTool, string>>;
  exec: (spec: Omit<ProcessSpec, "env"> & { env?: NodeJS.ProcessEnv }) => Promise<ProcessOutcome>;
}

export interface StepDefinition {
  id: RunStepId;
  label: string;
  run: (ctx: StepContext) => Promise<StepOutcome>;
}

export const TIMEOUTS = {
  deps: 10 * 60_000,
  browsers: 10 * 60_000,
  lint: 2 * 60_000,
  format: 60_000,
  test: 3 * 60_000,
  build: 5 * 60_000,
  e2e: 5 * 60_000,
  version: 15_000,
} as const;

const NODE_MISSING =
  "Node.js が見つかりません。教材の手順で Node.js を入れてから、VS Code を再起動してください";

function stateFile(root: string, ...parts: string[]): string {
  return path.join(root, TASK_STATE_DIR, ...parts);
}

async function tmpFile(root: string, name: string): Promise<string> {
  const dir = stateFile(root, "tmp");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, name);
  await rm(file, { force: true });
  return file;
}

async function readJson(file: string): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return undefined;
  }
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

function errorOutcome(summary: string, out?: ProcessOutcome): StepOutcome {
  const log = out ? tailLines(`${out.stdout}\n${out.stderr}`) : "";
  return { status: "error", summary, ...(log ? { logTail: log } : {}) };
}

/** 時間切れ・中断・起動の失敗を手順の結果にする。どれでもなければ null。 */
function interrupted(
  out: ProcessOutcome,
  what: string,
  timeoutIs: "failed" | "error",
): StepOutcome | null {
  if (out.aborted) return { status: "error", summary: "中断しました" };
  if (out.spawnError) return errorOutcome(`${what}を起動できませんでした (${out.spawnError})`);
  if (out.timedOut) {
    return timeoutIs === "failed"
      ? {
          status: "failed",
          summary: `${what}が時間内に終わりませんでした。無限ループになっていないか確認してください`,
          logTail: tailLines(`${out.stdout}\n${out.stderr}`),
        }
      : errorOutcome(`${what}が時間内に終わりませんでした`, out);
  }
  return null;
}

async function packageBin(
  ctx: StepContext,
  packageName: string,
  binName: string | undefined,
  label: string,
): Promise<{ file: string; version: string } | StepOutcome> {
  if (!ctx.node) return { status: "error", summary: NODE_MISSING };
  const bin = await resolvePackageBin(ctx.root, packageName, binName);
  if (!bin) {
    return {
      status: "error",
      summary: `${label} が課題フォルダーに入っていません。依存パッケージの準備が終わっているか確認してください`,
    };
  }
  return bin;
}

function isOutcome(value: unknown): value is StepOutcome {
  return typeof value === "object" && value !== null && "status" in value;
}

// ---------------------------------------------------------------
// 依存パッケージ
// ---------------------------------------------------------------

/** runner の手順と checks が課題フォルダーの node_modules に求めるパッケージ。 */
export function requiredPackages(manifest: TaskManifest): string[] {
  const plan = RUNNERS[manifest.runner].plan;
  const packages: string[] = [];
  if (plan === "vitest") packages.push("vitest");
  if (plan === "playwright" || plan === "next") packages.push("@playwright/test");
  if (plan === "next") packages.push("next");
  if (manifest.checks.lint) packages.push("eslint");
  if (manifest.checks.format) packages.push("prettier");
  return packages;
}

/**
 * 準備に使うパッケージが実際に入っているか。node_modules が残っていても、中身を
 * 消すと指紋は変わらないので、印だけを信じると準備を省いたまま道具が見つからなくなる。
 */
async function packagesPresent(ctx: StepContext): Promise<boolean> {
  for (const name of requiredPackages(ctx.manifest)) {
    const manifest = path.join(ctx.root, "node_modules", ...name.split("/"), "package.json");
    if (!(await exists(manifest))) return false;
  }
  return exists(path.join(ctx.root, "node_modules"));
}

/** package.json・lockfile・Node.js の major 版が同じなら、準備をやり直さない。 */
async function depsFingerprint(
  ctx: StepContext,
  pkgFile: string,
  lockFile: string,
): Promise<string> {
  const nodeMajor = ctx.toolVersions.node?.match(/\d+/)?.[0] ?? "";
  const lock = (await exists(lockFile)) ? await readFile(lockFile) : "";
  return createHash("sha256")
    .update(await readFile(pkgFile))
    .update("\0")
    .update(lock)
    .update(`\0${nodeMajor}`)
    .digest("hex");
}

export const depsStep: StepDefinition = {
  id: "deps",
  label: "依存パッケージの準備",
  async run(ctx) {
    if (!ctx.node) return { status: "error", summary: NODE_MISSING };
    const pkgFile = path.join(ctx.root, "package.json");
    if (!(await exists(pkgFile))) {
      return {
        status: "error",
        summary: "package.json がありません。課題の配布ファイルが足りません",
      };
    }
    const lockFile = path.join(ctx.root, "package-lock.json");
    const hasLock = await exists(lockFile);
    const fingerprint = await depsFingerprint(ctx, pkgFile, lockFile);
    const marker = stateFile(ctx.root, "deps.json");
    const previous = (await readJson(marker)) as { fingerprint?: string } | undefined;
    if (previous?.fingerprint === fingerprint && (await packagesPresent(ctx))) {
      return { status: "skipped", summary: "準備済みです" };
    }
    if (!ctx.npm) {
      return { status: "error", summary: "npm が見つかりません。Node.js を入れ直してください" };
    }
    const out = await ctx.exec({
      file: ctx.npm.file,
      args: [
        ...ctx.npm.prefixArgs,
        hasLock ? "ci" : "install",
        "--no-audit",
        "--no-fund",
        "--loglevel=error",
      ],
      cwd: ctx.root,
      timeoutMs: TIMEOUTS.deps,
    });
    const stopped = interrupted(out, "依存パッケージの準備", "error");
    if (stopped) return stopped;
    if (out.exitCode !== 0) {
      return errorOutcome(
        "依存パッケージを準備できませんでした。ネットワークの接続を確認してください",
        out,
      );
    }
    // npm install は lockfile を作るので、準備のあとの状態で印を付ける
    // (付け直さないと、次の実行で lockfile ができたことを変更とみなしてやり直す)。
    const prepared = await depsFingerprint(ctx, pkgFile, lockFile);
    await writeStateFile(
      ctx.root,
      "deps.json",
      `${JSON.stringify({ fingerprint: prepared }, null, 2)}\n`,
    );
    return { status: "passed", summary: "依存パッケージを準備しました" };
  },
};

// ---------------------------------------------------------------
// lint・整形
// ---------------------------------------------------------------

const LINTABLE = /\.(c|m)?(j|t)sx?$/;

/**
 * 提出の上限を超えていれば、道具に渡さず省略する。上限超えは最後の「提出するファイルの
 * 確認」が要修正として報告する。何百ものパスを渡すと Windows ではコマンドラインの長さを
 * 超えて起動できず、直し方の分からない環境のエラーになってしまう。
 */
function tooManySubmitFiles(ctx: StepContext): StepOutcome | null {
  if (ctx.submitFiles.length <= LIMITS.submitFiles) return null;
  return {
    status: "skipped",
    summary: `提出するファイルが多すぎるため省略しました (${LIMITS.submitFiles} 件まで)`,
  };
}

export const lintStep: StepDefinition = {
  id: "lint",
  label: "lint (ESLint)",
  async run(ctx) {
    const tooMany = tooManySubmitFiles(ctx);
    if (tooMany) return tooMany;
    const bin = await packageBin(ctx, "eslint", "eslint", "ESLint");
    if (isOutcome(bin)) return bin;
    const files = ctx.submitFiles.filter((f) => LINTABLE.test(f));
    if (files.length === 0)
      return { status: "skipped", summary: "lint の対象になるファイルがありません" };
    const output = await tmpFile(ctx.root, "eslint.json");
    const out = await ctx.exec({
      file: ctx.node as string,
      args: [bin.file, "--format", "json", "--output-file", output, ...files.map(asCliPath)],
      cwd: ctx.root,
      timeoutMs: TIMEOUTS.lint,
    });
    const stopped = interrupted(out, "ESLint", "error");
    if (stopped) return stopped;
    if (out.exitCode !== 0 && out.exitCode !== 1) {
      return errorOutcome("ESLint を実行できませんでした (設定ファイルを確認してください)", out);
    }
    const parsed = parseEslintReport(await readJson(output), ctx.root);
    return parsed ?? errorOutcome("ESLint の結果を読めませんでした", out);
  },
};

export const formatStep: StepDefinition = {
  id: "format",
  label: "整形 (Prettier)",
  async run(ctx) {
    const tooMany = tooManySubmitFiles(ctx);
    if (tooMany) return tooMany;
    const bin = await packageBin(ctx, "prettier", "prettier", "Prettier");
    if (isOutcome(bin)) return bin;
    if (ctx.submitFiles.length === 0)
      return { status: "skipped", summary: "整形の対象になるファイルがありません" };
    const out = await ctx.exec({
      file: ctx.node as string,
      args: [bin.file, "--list-different", "--ignore-unknown", ...ctx.submitFiles.map(asCliPath)],
      cwd: ctx.root,
      timeoutMs: TIMEOUTS.format,
    });
    const stopped = interrupted(out, "Prettier", "error");
    if (stopped) return stopped;
    if (out.exitCode === 0) return { status: "passed", summary: "整形済みです" };
    if (out.exitCode === 1) {
      const files = parsePrettierList(out.stdout);
      return {
        status: "failed",
        summary: `整形が必要なファイルが ${files.length} 件あります。保存時の整形か「ドキュメントのフォーマット」で直してください`,
        files,
      };
    }
    // 受講者のファイルに構文の誤りがあると、Prettier は 2 で終わる。環境の問題ではない。
    if (/SyntaxError/.test(out.stderr)) {
      return {
        status: "failed",
        summary: "構文の誤りがあるため、整形を確かめられませんでした。エラーの行を直してください",
        logTail: tailLines(out.stderr, 12),
      };
    }
    return errorOutcome("Prettier を実行できませんでした", out);
  },
};

// ---------------------------------------------------------------
// テスト
// ---------------------------------------------------------------

export const vitestStep: StepDefinition = {
  id: "test",
  label: "テスト (Vitest)",
  async run(ctx) {
    const bin = await packageBin(ctx, "vitest", "vitest", "Vitest");
    if (isOutcome(bin)) return bin;
    const output = await tmpFile(ctx.root, "vitest.json");
    const out = await ctx.exec({
      file: ctx.node as string,
      args: [bin.file, "run", "--reporter=json", `--outputFile=${output}`],
      cwd: ctx.root,
      timeoutMs: TIMEOUTS.test,
    });
    const stopped = interrupted(out, "テスト", "failed");
    if (stopped) return stopped;
    const parsed = parseVitestReport(await readJson(output), ctx.root);
    if (!parsed) return errorOutcome("テストの結果を読めませんでした", out);
    const log = parsed.status === "passed" ? "" : tailLines(out.stderr);
    return log ? { ...parsed, logTail: log } : parsed;
  },
};

const BROWSER_MISSING = /Executable doesn't exist|Looks like Playwright .* browsers/i;

export const browsersStep: StepDefinition = {
  id: "browsers",
  label: "テスト用ブラウザの準備",
  async run(ctx) {
    const bin = await packageBin(ctx, "@playwright/test", "playwright", "Playwright");
    if (isOutcome(bin)) return bin;
    const marker = stateFile(ctx.root, "browsers.json");
    const previous = (await readJson(marker)) as { version?: string } | undefined;
    if (previous?.version === bin.version) return { status: "skipped", summary: "準備済みです" };
    const out = await ctx.exec({
      file: ctx.node as string,
      args: [bin.file, "install", "chromium"],
      cwd: ctx.root,
      timeoutMs: TIMEOUTS.browsers,
    });
    const stopped = interrupted(out, "ブラウザの準備", "error");
    if (stopped) return stopped;
    if (out.exitCode !== 0) {
      return errorOutcome(
        "テスト用ブラウザを準備できませんでした。ネットワークの接続を確認してください",
        out,
      );
    }
    await writeStateFile(
      ctx.root,
      "browsers.json",
      `${JSON.stringify({ version: bin.version }, null, 2)}\n`,
    );
    return { status: "passed", summary: "テスト用ブラウザを準備しました" };
  },
};

export const playwrightStep: StepDefinition = {
  id: "e2e",
  label: "ブラウザでの操作テスト (Playwright)",
  async run(ctx) {
    const bin = await packageBin(ctx, "@playwright/test", "playwright", "Playwright");
    if (isOutcome(bin)) return bin;
    const output = await tmpFile(ctx.root, "playwright.json");
    const out = await ctx.exec({
      file: ctx.node as string,
      args: [bin.file, "test", "--reporter=json"],
      cwd: ctx.root,
      timeoutMs: TIMEOUTS.e2e,
      env: { ...ctx.env, PLAYWRIGHT_JSON_OUTPUT_FILE: output },
    });
    const stopped = interrupted(out, "操作テスト", "failed");
    if (stopped) return stopped;
    if (BROWSER_MISSING.test(`${out.stdout}\n${out.stderr}`)) {
      // 次の実行でブラウザを入れ直す。
      await rm(stateFile(ctx.root, "browsers.json"), { force: true });
      return errorOutcome(
        "テスト用ブラウザが見つかりません。もう一度「課題を確認」を実行してください",
        out,
      );
    }
    const parsed = parsePlaywrightReport(await readJson(output), ctx.root);
    if (!parsed) return errorOutcome("操作テストの結果を読めませんでした", out);
    return parsed;
  },
};

export const nextBuildStep: StepDefinition = {
  id: "build",
  label: "ビルド (Next.js)",
  async run(ctx) {
    const bin = await packageBin(ctx, "next", "next", "Next.js");
    if (isOutcome(bin)) return bin;
    const out = await ctx.exec({
      file: ctx.node as string,
      args: [bin.file, "build"],
      cwd: ctx.root,
      timeoutMs: TIMEOUTS.build,
    });
    const stopped = interrupted(out, "ビルド", "error");
    if (stopped) return stopped;
    if (out.exitCode !== 0) {
      return {
        status: "failed",
        summary: "ビルドに失敗しました。ログの最後のエラーを確認してください",
        logTail: tailLines(`${out.stdout}\n${out.stderr}`, 40),
      };
    }
    return { status: "passed", summary: "ビルドできました" };
  },
};

// ---------------------------------------------------------------
// HTML の確認・環境診断・CI
// ---------------------------------------------------------------

export const staticStep: StepDefinition = {
  id: "static",
  label: "HTML の確認",
  async run(ctx) {
    const tests = await runStaticChecks(ctx.root, ctx.manifest.static?.checks ?? []);
    const passed = tests.filter((t) => t.status === "passed").length;
    return {
      status: passed === tests.length ? "passed" : "failed",
      summary:
        passed === tests.length
          ? `${tests.length} 項目すべて確認できました`
          : `${tests.length} 項目中 ${passed} 項目を確認できました`,
      tests,
    };
  },
};

async function toolVersionOutput(ctx: StepContext, tool: EnvironmentTool): Promise<string | null> {
  let spec: Omit<ProcessSpec, "env"> | null = null;
  if (tool === "node" && ctx.node) {
    spec = { file: ctx.node, args: ["--version"], cwd: ctx.root, timeoutMs: TIMEOUTS.version };
  } else if (tool === "npm" && ctx.npm) {
    spec = {
      file: ctx.npm.file,
      args: [...ctx.npm.prefixArgs, "--version"],
      cwd: ctx.root,
      timeoutMs: TIMEOUTS.version,
    };
  } else if (tool === "git") {
    const git = await findExecutable("git", ctx.env, ctx.platform);
    if (git) spec = { file: git, args: ["--version"], cwd: ctx.root, timeoutMs: TIMEOUTS.version };
  }
  if (!spec) return null;
  const out = await ctx.exec(spec);
  if (out.exitCode !== 0) return null;
  return out.stdout.trim() || null;
}

export const diagnoseStep: StepDefinition = {
  id: "diagnose",
  label: "開発環境の診断",
  async run(ctx) {
    const environment = ctx.manifest.environment;
    // 課題が要件を書いた道具だけを調べる。dev-env-basics では Node.js・npm を入れる単元
    // (06 U04) のあとに Git を入れる単元 (U05) が来るので、U04 の診断で Git が無いことを
    // 不合格にしない。要件が 1 つも無いとき (課題の外からの診断) は 3 つとも調べる。
    const listed = ENVIRONMENT_TOOLS.filter((tool) => environment?.[tool] !== undefined);
    const tools = listed.length > 0 ? listed : [...ENVIRONMENT_TOOLS];
    const tests: TestCaseResult[] = [];
    for (const tool of tools) {
      const requirement = environment?.[tool];
      const output = await toolVersionOutput(ctx, tool);
      if (output) ctx.toolVersions[tool] = output;
      const check = checkToolVersion(output, requirement);
      const need = describeRequirement(requirement);
      const found = check.version ? formatVersion(check.version) : "";
      let message: string | undefined;
      if (!check.ok) {
        message =
          check.reason === "missing"
            ? "見つかりません。教材の手順で入れてから、VS Code を再起動してください"
            : check.reason === "unparsable"
              ? "版を読み取れませんでした"
              : `${check.reason === "too-old" ? "版が古いです" : "版が新しすぎます"} (${found})。${need} が必要です`;
      }
      tests.push({
        name: `${ENVIRONMENT_TOOL_LABELS[tool]} ${found}${need ? ` (必要: ${need})` : ""}`.trim(),
        status: check.ok ? "passed" : "failed",
        ...(message ? { message } : {}),
      });
    }
    const passed = tests.filter((t) => t.status === "passed").length;
    return {
      status: passed === tests.length ? "passed" : "failed",
      summary:
        passed === tests.length
          ? "必要な道具がそろっています"
          : `${tests.length} 個中 ${tests.length - passed} 個の道具を確認してください`,
      tests,
    };
  },
};

export const ciStep: StepDefinition = {
  id: "test",
  label: "CI の結果",
  async run() {
    return {
      status: "error",
      summary: "この課題は手元では確かめません。GitHub Actions の結果で確認します",
    };
  },
};
