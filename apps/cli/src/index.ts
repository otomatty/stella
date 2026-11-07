/**
 * 問題つきの課題を確認して提出する。課題フォルダーは VS Code 拡張が用意したものを使う。
 */

import { createInterface } from "node:readline/promises";
import { homedir } from "node:os";
import path from "node:path";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { exchangeVscodeLink } from "@stella/shared/vscode/auth-exchange";
import type { TaskManifest } from "@stella/shared/tasks/manifest";
import { canSubmit, RUN_OUTCOME_LABELS, type RunResult } from "@stella/shared/tasks/run-result";
import { AuthExpiredError, type ApiAuth, initApi } from "../../vscode/src/api.js";
import { sendLocalRunReport } from "../../vscode/src/local-run-report.js";
import {
  findTaskRoot,
  loadTask,
  runTask,
  saveRunResult,
} from "../../vscode/src/runner/run-task.js";
import { readDistribution } from "../../vscode/src/task-submission.js";
import {
  fetchProblemResults,
  loadProblemStates,
  nextUnsubmittedProblem,
  PROBLEM_STATUS_LABELS,
  problemCountLabel,
  type ProblemState,
  sendProblemSubmission,
} from "../../vscode/src/task-problems.js";
import {
  clearCredentials,
  readCredentials,
  resolveServerUrl,
  saveCredentials,
  tokenForServer,
} from "./credentials.js";

const NOT_A_TASK = "課題フォルダーの中で実行してください";
const NOT_PROBLEMS = "この課題は問題つきではありません。VS Code 拡張で開いてください";
const USAGE = `使い方: stella <command>

コマンド:
  login [--code <code>]  接続コードを交換して保存する
  logout                 保存した接続を消す
  status                 問題の一覧と状態
  check [problem]        問題を確認する (省略時は次の未提出)
  submit [problem]       確認してから提出する (省略時は次の未提出)
  submit --all           未提出を順に確認して提出する
  help                   この使い方を表示する

接続コードは Web の設定画面で発行します。
接続先の既定は https://stella.saedgewell.workers.dev です。
変えるときは環境変数 STELLA_SERVER_URL を使います。
`;

export interface CliIo {
  cwd: string;
  home: string;
  env: NodeJS.ProcessEnv;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  readLine: () => Promise<string>;
  fetch: typeof fetch;
}

type Command =
  | { kind: "help" }
  | { kind: "error"; message: string }
  | { kind: "login"; code?: string }
  | { kind: "logout" }
  | { kind: "status" }
  | { kind: "check"; problem?: string }
  | { kind: "submit"; all: boolean; problem?: string };

interface TaskContext {
  io: CliIo;
  root: string;
  manifest: TaskManifest;
  manifestSha256: string;
}

function redact(text: string, secrets: readonly string[]): string {
  let out = text;
  for (const secret of secrets) {
    if (secret.length === 0) continue;
    out = out.split(secret).join("***");
  }
  return out;
}

async function defaultReadLine(): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return await rl.question("");
  } finally {
    rl.close();
  }
}

function completeIo(partial: Partial<CliIo>): CliIo {
  return {
    cwd: partial.cwd ?? process.cwd(),
    home: partial.home ?? homedir(),
    env: partial.env ?? process.env,
    stdout: partial.stdout ?? ((text) => process.stdout.write(text)),
    stderr: partial.stderr ?? ((text) => process.stderr.write(text)),
    readLine: partial.readLine ?? defaultReadLine,
    fetch: partial.fetch ?? fetch,
  };
}

function parseCommand(argv: string[]): Command {
  let values: { code?: string; all?: boolean; help?: boolean };
  let positionals: string[];
  try {
    const parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        code: { type: "string" },
        all: { type: "boolean" },
        help: { type: "boolean" },
      },
    });
    values = parsed.values;
    positionals = parsed.positionals;
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "";
    const message = error instanceof Error ? error.message : "";
    if (code === "ERR_PARSE_ARGS_INVALID_OPTION_VALUE" && message.includes("--code")) {
      return { kind: "error", message: "--code には接続コードが必要です" };
    }
    return { kind: "error", message: "不明なオプションです。stella help を見てください" };
  }
  if (values.help) return { kind: "help" };
  const command = positionals[0];
  if (command === undefined || command === "help") {
    if (positionals.length > 1) return { kind: "error", message: "不明なコマンドです" };
    return { kind: "help" };
  }
  const rest = positionals.slice(1);
  if (command === "login") {
    if (values.all) return { kind: "error", message: "login に --all は使えません" };
    if (rest.length > 0) return { kind: "error", message: "login に引数は使えません" };
    return values.code === undefined ? { kind: "login" } : { kind: "login", code: values.code };
  }
  if (command === "logout") {
    if (values.all || values.code !== undefined || rest.length > 0) {
      return { kind: "error", message: "logout にオプションや引数は使えません" };
    }
    return { kind: "logout" };
  }
  if (command === "status") {
    if (values.all || values.code !== undefined || rest.length > 0) {
      return { kind: "error", message: "status にオプションや引数は使えません" };
    }
    return { kind: "status" };
  }
  if (command === "check") {
    if (values.all || values.code !== undefined || rest.length > 1) {
      return { kind: "error", message: "check に指定できる問題は 1 つです" };
    }
    return rest[0] === undefined ? { kind: "check" } : { kind: "check", problem: rest[0] };
  }
  if (command === "submit") {
    if (values.code !== undefined)
      return { kind: "error", message: "submit に --code は使えません" };
    if (values.all && rest.length > 0) {
      return { kind: "error", message: "submit --all と問題の指定は同時に使えません" };
    }
    if (rest.length > 1) return { kind: "error", message: "submit に指定できる問題は 1 つです" };
    return {
      kind: "submit",
      all: values.all === true,
      ...(rest[0] === undefined ? {} : { problem: rest[0] }),
    };
  }
  return { kind: "error", message: `不明なコマンドです: ${command}` };
}

function credentialAuth(home: string, serverUrl: string): ApiAuth {
  return {
    currentSession: () => 0,
    async getToken() {
      return tokenForServer(await readCredentials(home), serverUrl);
    },
    async getTokenInSession() {
      return tokenForServer(await readCredentials(home), serverUrl);
    },
    async clear() {
      await clearCredentials(home);
    },
  };
}

/** 失敗理由。接続できたら undefined。トークンは保存時と同じ接続先にだけ渡す。 */
async function openSession(io: CliIo): Promise<string | undefined> {
  let serverUrl: string;
  try {
    serverUrl = resolveServerUrl(io.env);
  } catch (error) {
    return error instanceof Error ? error.message : "接続先を決められません";
  }
  const creds = await readCredentials(io.home);
  if (!creds) return "接続されていません。stella login を実行してください";
  if (tokenForServer(creds, serverUrl) === null) {
    return "接続先が変わっています。stella login をやり直してください";
  }
  initApi(credentialAuth(io.home, serverUrl), () => serverUrl);
  return undefined;
}

async function login(io: CliIo, code: string | undefined, secrets: string[]): Promise<number> {
  let serverUrl: string;
  try {
    serverUrl = resolveServerUrl(io.env);
  } catch (error) {
    io.stderr(`${error instanceof Error ? error.message : "接続先を決められません"}\n`);
    return 1;
  }
  let link = code;
  if (link === undefined) {
    io.stdout("Web の設定画面で接続コードを発行し、貼り付けて Enter を押してください。\n");
    link = (await io.readLine()).trim();
  } else {
    link = link.trim();
  }
  if (link.length === 0) {
    io.stderr("接続コードを入力してください\n");
    return 1;
  }
  const token = await exchangeVscodeLink(serverUrl, link, io.fetch);
  secrets.push(token);
  await saveCredentials({ serverUrl, accessToken: token }, io.home);
  io.stdout("接続しました\n");
  return 0;
}

async function requireTask(io: CliIo): Promise<TaskContext | string> {
  const root = await findTaskRoot(io.cwd);
  if (!root) return NOT_A_TASK;
  const loaded = await loadTask(root);
  if (!loaded.ok) return loaded.errors.join("\n");
  if (!loaded.manifest.problems?.length) return NOT_PROBLEMS;
  return {
    io,
    root,
    manifest: loaded.manifest,
    manifestSha256: loaded.manifestSha256,
  };
}

function formatRun(problem: ProblemState, result: RunResult): string {
  const lines = [`${problem.id} ${problem.title}: ${RUN_OUTCOME_LABELS[result.outcome]}`];
  for (const step of result.steps) {
    if (step.status !== "failed" && step.status !== "error") continue;
    lines.push(`${step.label}: ${step.summary}`);
    for (const test of step.tests ?? []) {
      if (test.status === "passed") continue;
      lines.push(`  ${test.name}`);
      if (test.message) lines.push(`  ${test.message}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

async function runProblem(ctx: TaskContext, problem: ProblemState): Promise<RunResult> {
  const result = await runTask({
    root: ctx.root,
    manifest: ctx.manifest,
    manifestSha256: ctx.manifestSha256,
    problem: problem.id,
  });
  let receipt: { taskId: string; contentHash: string } | undefined;
  try {
    receipt = await readDistribution(ctx.root);
  } catch (error) {
    const message = error instanceof Error ? error.message : "配布記録を読めませんでした";
    ctx.io.stderr(`${message}\n`);
  }
  if (receipt?.taskId === ctx.manifest.id) result.taskContentHash = receipt.contentHash;
  if (result.outcome !== "cancelled") await saveRunResult(ctx.root, result);
  try {
    await sendLocalRunReport(result, receipt?.taskId === ctx.manifest.id ? receipt : undefined);
  } catch (error) {
    if (error instanceof AuthExpiredError) throw error;
    const message = error instanceof Error ? error.message : "失敗しました";
    ctx.io.stderr(`手元の確認の結果を LMS に反映できませんでした: ${message}\n`);
  }
  ctx.io.stdout(formatRun(problem, result));
  return result;
}

async function submitProblem(ctx: TaskContext, problem: ProblemState): Promise<number> {
  const result = await runProblem(ctx, problem);
  if (result.outcome !== "passed" || !canSubmit(result)) return 1;
  const response = await sendProblemSubmission(ctx.root, problem.id);
  const count = problemCountLabel(response.passedProblems, response.totalProblems);
  ctx.io.stdout(`${response.problemId} を提出しました (${count})\n`);
  if (response.taskPassed) ctx.io.stdout("課題は合格です\n");
  return 0;
}

async function problemStates(ctx: TaskContext): Promise<ProblemState[]> {
  const server = await fetchProblemResults(ctx.manifest.id);
  return loadProblemStates(ctx.root, ctx.manifest, server);
}

async function selectProblem(
  ctx: TaskContext,
  id: string | undefined,
): Promise<ProblemState | undefined> {
  const states = await problemStates(ctx);
  if (id === undefined) return nextUnsubmittedProblem(states);
  const found = states.find((state) => state.id === id);
  if (!found) throw new Error("この課題の問題ではありません");
  return found;
}

async function status(ctx: TaskContext): Promise<number> {
  const server = await fetchProblemResults(ctx.manifest.id);
  const states = await loadProblemStates(ctx.root, ctx.manifest, server);
  ctx.io.stdout(`${ctx.manifest.title}\n`);
  ctx.io.stdout(`${problemCountLabel(server.passedProblems, server.totalProblems)}\n`);
  for (const state of states) {
    ctx.io.stdout(`${state.id}  ${state.title}  ${PROBLEM_STATUS_LABELS[state.status]}\n`);
  }
  return 0;
}

async function check(ctx: TaskContext, id: string | undefined): Promise<number> {
  const problem = await selectProblem(ctx, id);
  if (!problem) {
    ctx.io.stdout("未提出の問題はありません\n");
    return 0;
  }
  const result = await runProblem(ctx, problem);
  return result.outcome === "passed" ? 0 : 1;
}

async function submit(
  ctx: TaskContext,
  command: { all: boolean; problem?: string },
): Promise<number> {
  if (!command.all) {
    const problem = await selectProblem(ctx, command.problem);
    if (!problem) {
      ctx.io.stdout("未提出の問題はありません\n");
      return 0;
    }
    return submitProblem(ctx, problem);
  }
  const done = new Set<string>();
  let any = false;
  for (;;) {
    const states = await problemStates(ctx);
    const next = states.find((state) => state.status !== "submitted" && !done.has(state.id));
    if (!next) {
      if (!any) ctx.io.stdout("未提出の問題はありません\n");
      return 0;
    }
    any = true;
    const code = await submitProblem(ctx, next);
    if (code !== 0) return 1;
    done.add(next.id);
  }
}

async function withTask(io: CliIo, run: (ctx: TaskContext) => Promise<number>): Promise<number> {
  const task = await requireTask(io);
  if (typeof task === "string") {
    io.stderr(`${task}\n`);
    return 1;
  }
  const session = await openSession(io);
  if (session) {
    io.stderr(`${session}\n`);
    return 1;
  }
  return run(task);
}

async function dispatch(argv: string[], io: CliIo, secrets: string[]): Promise<number> {
  const command = parseCommand(argv);
  if (command.kind === "help") {
    io.stdout(USAGE);
    return 0;
  }
  if (command.kind === "error") {
    io.stderr(`${command.message}\n`);
    return 1;
  }
  if (command.kind === "login") return login(io, command.code, secrets);
  if (command.kind === "logout") {
    await clearCredentials(io.home);
    io.stdout("切断しました\n");
    return 0;
  }
  if (command.kind === "status") return withTask(io, status);
  if (command.kind === "check") return withTask(io, (ctx) => check(ctx, command.problem));
  return withTask(io, (ctx) => submit(ctx, command));
}

export async function main(argv: string[], partial: Partial<CliIo> = {}): Promise<number> {
  const base = completeIo(partial);
  const secrets: string[] = [];
  const io: CliIo = {
    ...base,
    stdout: (text) => base.stdout(redact(text, secrets)),
    stderr: (text) => base.stderr(redact(text, secrets)),
  };
  try {
    return await dispatch(argv, io, secrets);
  } catch (error) {
    if (error instanceof AuthExpiredError) {
      io.stderr("ログインの有効期限が切れました。stella login をやり直してください\n");
      return 1;
    }
    const message = error instanceof Error ? error.message : "失敗しました";
    io.stderr(`${message}\n`);
    return 1;
  }
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.resolve(entry) === path.resolve(fileURLToPath(import.meta.url));
}

if (isDirectRun()) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "失敗しました";
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    });
}
