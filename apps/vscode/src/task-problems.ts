/**
 * 問題つきの課題の一覧・状態・提出の本文。
 *
 * CLI も使う。画面 (コマンド・パネル) はこのファイルの結果を表示するだけで、
 * ここからエディター API は読まない。
 */

import type { TaskManifest } from "@stella/shared/tasks/manifest";
import { problemFiles, type TaskProblem } from "@stella/shared/tasks/problems";
import { canSubmit, type RunResult } from "@stella/shared/tasks/run-result";
import { RUNNERS } from "@stella/shared/tasks/runners";
import {
  isRunResult,
  type SupportEvent,
  type TaskSubmissionInput,
} from "@stella/shared/tasks/submission";
import { apiRequest } from "./api.js";
import {
  hashFile,
  hashFiles,
  LIMITS,
  listFiles,
  matchPatterns,
  readFileInRoot,
} from "./runner/files.js";
import { loadTask } from "./runner/run-task.js";
import { readDistribution, readRecordedSupport } from "./task-submission.js";

/** 未提出、手元の確認が合格、サーバーに提出済み。 */
export type ProblemWorkStatus = "not-submitted" | "local-passed" | "submitted";

export const PROBLEM_STATUS_LABELS: Readonly<Record<ProblemWorkStatus, string>> = {
  "not-submitted": "未提出",
  "local-passed": "手元で合格",
  submitted: "提出済み",
};

export interface ProblemState {
  id: string;
  title: string;
  /** 課題フォルダーからの相対パス (`src/<id>.<ext>`)。 */
  source: string;
  status: ProblemWorkStatus;
}

export interface ServerProblem {
  id: string;
  title: string;
  status: "passed" | "not-submitted";
  firstPassedAt: string | null;
}

export interface ProblemResults {
  problems: ServerProblem[];
  passedProblems: number;
  totalProblems: number;
  taskPassed: boolean;
}

export interface ProblemSubmitResponse {
  problemId: string;
  passedProblems: number;
  totalProblems: number;
  taskPassed: boolean;
}

/** ステータスバーとパネルに出す件数。 */
export function problemCountLabel(passed: number, total: number): string {
  return `${passed}/${total} 問`;
}

/** サーバーが提出済みなら提出済み。そうでなく手元が合格なら手元で合格。ほかは未提出。 */
export function problemWorkStatus(
  serverPassed: boolean,
  localOutcome: RunResult["outcome"] | undefined,
): ProblemWorkStatus {
  if (serverPassed) return "submitted";
  if (localOutcome === "passed") return "local-passed";
  return "not-submitted";
}

export function problemSource(manifest: TaskManifest, id: string): string | null {
  return problemFiles(RUNNERS[manifest.runner].plan, id)?.source ?? null;
}

/**
 * パスが問題のソース (`src/<id>.<ext>`) に完全一致するときだけ、その問題を返す。
 * テスト・別の拡張子・途中のフォルダーは返さない。
 */
export function problemForPath(manifest: TaskManifest, rel: string): TaskProblem | undefined {
  const problems = manifest.problems;
  if (!problems?.length) return undefined;
  const normalized = rel.replaceAll("\\", "/");
  return problems.find((problem) => problemSource(manifest, problem.id) === normalized);
}

/** 提出済みでない最初の問題。全部提出済みなら undefined。 */
export function nextUnsubmittedProblem(states: readonly ProblemState[]): ProblemState | undefined {
  return states.find((state) => state.status !== "submitted");
}

/** 開くファイル。次の未提出。全部提出済みなら 1 問目。 */
export function problemFileToOpen(states: readonly ProblemState[]): string | undefined {
  return (nextUnsubmittedProblem(states) ?? states[0])?.source;
}

/**
 * 確認・提出する問題。開いているファイルが問題のソースならそれ。
 * そうでなければ次の未提出。全部提出済みなら 1 問目。
 */
export function chooseProblem(
  states: readonly ProblemState[],
  openPath: string | undefined,
  manifest: TaskManifest,
): ProblemState | undefined {
  if (openPath) {
    const fromFile = problemForPath(manifest, openPath);
    const found = fromFile ? states.find((state) => state.id === fromFile.id) : undefined;
    if (found) return found;
  }
  return nextUnsubmittedProblem(states) ?? states[0];
}

export function readServerProblemResults(value: unknown): ProblemResults | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Partial<ProblemResults>;
  if (!Array.isArray(row.problems)) return undefined;
  if (typeof row.passedProblems !== "number" || typeof row.totalProblems !== "number")
    return undefined;
  if (typeof row.taskPassed !== "boolean") return undefined;
  return row as ProblemResults;
}

export async function fetchProblemResults(taskId: string): Promise<ProblemResults> {
  const data = await apiRequest<unknown>(
    `/api/tasks/problem-results?taskId=${encodeURIComponent(taskId)}`,
  );
  const parsed = readServerProblemResults(data);
  if (!parsed) throw new Error("問題の状態を読み出せません");
  return parsed;
}

export async function readProblemRun(
  root: string,
  taskId: string,
  problemId: string,
): Promise<RunResult | undefined> {
  try {
    const raw: unknown = JSON.parse(
      new TextDecoder().decode(
        await readFileInRoot(root, `.stella/problem-runs/${problemId}.json`, 1024 * 1024),
      ),
    );
    if (!isRunResult(raw) || raw.taskId !== taskId || raw.problemId !== problemId) return undefined;
    return raw;
  } catch {
    return undefined;
  }
}

export async function loadProblemStates(
  root: string,
  manifest: TaskManifest,
  server: ProblemResults | undefined,
): Promise<ProblemState[]> {
  const problems = manifest.problems ?? [];
  const passed = new Set(
    (server?.problems ?? [])
      .filter((problem) => problem.status === "passed")
      .map((problem) => problem.id),
  );
  const states: ProblemState[] = [];
  for (const problem of problems) {
    const source = problemSource(manifest, problem.id);
    if (!source) continue;
    const local = await readProblemRun(root, manifest.id, problem.id);
    states.push({
      id: problem.id,
      title: problem.title,
      source,
      status: problemWorkStatus(passed.has(problem.id), local?.outcome),
    });
  }
  return states;
}

const RECHECK = "確認し直してください";

/**
 * 1 問の提出本文。問題 ID、そのファイル 1 つ、`.stella/problem-runs/<id>.json` の結果。
 * 結果に残ったハッシュと今のファイルが違えば提出しない。
 */
export async function prepareProblemSubmission(
  root: string,
  problemId: string,
  support: SupportEvent[],
): Promise<TaskSubmissionInput> {
  const loaded = await loadTask(root);
  if (!loaded.ok) throw new Error(loaded.errors.join("\n"));
  const { manifest } = loaded;
  const source = problemSource(manifest, problemId);
  if (!manifest.problems?.some((problem) => problem.id === problemId) || !source) {
    throw new Error("この課題の問題ではありません");
  }
  const result = await readProblemRun(root, manifest.id, problemId);
  if (!result) throw new Error("この問題の実行結果がありません。先に確認してください");
  if (!canSubmit(result)) throw new Error("手元の確認がすべて通ってから提出してください");
  const hashed = await hashFile(root, source, LIMITS.fileBytes);
  const recorded = result.files;
  const sameFile =
    recorded.length === 1 &&
    recorded[0]?.path === hashed.path &&
    recorded[0]?.sha256 === hashed.sha256 &&
    recorded[0]?.bytes === hashed.bytes;
  if (!sameFile) throw new Error(RECHECK);
  const listed = await listFiles(root);
  const protectedHashes = await hashFiles(
    root,
    matchPatterns(listed, manifest.protected).files,
    LIMITS.protectedFileBytes,
  );
  const protectedSame =
    loaded.manifestSha256 === result.manifestSha256 &&
    protectedHashes.length === result.protected.length &&
    protectedHashes.every((file) =>
      result.protected.some((item) => item.path === file.path && item.sha256 === file.sha256),
    );
  if (!protectedSame) throw new Error(RECHECK);
  const receipt = await readDistribution(root);
  if (!receipt)
    throw new Error("配布した課題の記録がありません。LMS から配布した課題を開いてください");
  if (
    receipt.taskId !== manifest.id ||
    (result.taskContentHash && result.taskContentHash !== receipt.contentHash)
  )
    throw new Error("確認した課題の版が変わっています。もう一度確認してください");
  const bytes = await readFileInRoot(root, source, LIMITS.fileBytes);
  return {
    taskId: manifest.id,
    contentHash: result.taskContentHash ?? receipt.contentHash,
    mode: "submit",
    problemId,
    files: [{ path: source, content: Buffer.from(bytes).toString("base64") }],
    localResult: result,
    protected: protectedHashes,
    explanation: "",
    support,
  };
}

export async function sendProblemSubmission(
  root: string,
  problemId: string,
  session?: number,
): Promise<ProblemSubmitResponse> {
  const body = await prepareProblemSubmission(root, problemId, await readRecordedSupport(root));
  return apiRequest<ProblemSubmitResponse>("/api/submissions", {
    method: "POST",
    body,
    ...(session === undefined ? {} : { session }),
  });
}
