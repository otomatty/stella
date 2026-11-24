/**
 * 問題つきの課題の一覧・状態・提出の本文。
 *
 * 画面 (コマンド・パネル) がこのファイルの結果を表示する。
 */

import type { TaskBundleResponse } from "@stella/shared/tasks/catalog";
import type { ProblemStepState } from "@stella/shared/tasks/problem-steps";
import { normalizeForHash } from "@stella/shared/tasks/hash";
import type { TaskManifest } from "@stella/shared/tasks/manifest";
import { isProblemId, problemFiles, type TaskProblem } from "@stella/shared/tasks/problems";
import { canSubmit, type RunResult } from "@stella/shared/tasks/run-result";
import { RUNNERS } from "@stella/shared/tasks/runners";
import {
  isRunResult,
  type SupportEvent,
  type TaskSubmissionInput,
} from "@stella/shared/tasks/submission";
import { apiRequest, apiSession } from "./api.js";
import {
  hashFiles,
  LIMITS,
  listFiles,
  readFileInRoot,
  sha256Hex,
  writeStateFile,
} from "./runner/files.js";
import { loadTask } from "./runner/run-task.js";
import { taskBundleUrl } from "./task-bundle-url.js";
import { pendingProblemBundle, protectedTaskFiles, unlockTaskFiles } from "./task-distribution.js";
import {
  readDistribution,
  readRecordedSupport,
  SUBMIT_AGAIN,
  type SubmissionNotes,
} from "./task-submission.js";

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
  state?: ProblemStepState;
  afterTitle?: string;
  stepLessonId?: string;
  afterLessonId?: string;
}

export interface ProblemResults {
  gated?: true;
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

export function problemForTestPath(manifest: TaskManifest, rel: string): TaskProblem | undefined {
  const plan = RUNNERS[manifest.runner].plan;
  const normalized = rel.replaceAll("\\", "/");
  return manifest.problems?.find((problem) => problemFiles(plan, problem.id)?.test === normalized);
}

/** 提出済みでない最初の問題。全部提出済みなら undefined。 */
export function nextUnsubmittedProblem(states: readonly ProblemState[]): ProblemState | undefined {
  return states.find((state) => state.status !== "submitted");
}

/** 開くファイル。次の未提出。全部提出済みなら 1 問目。 */
export function problemFileToOpen(
  states: readonly ProblemState[],
  requested?: string,
): string | undefined {
  return (
    states.find(({ id }) => id === requested) ??
    nextUnsubmittedProblem(states) ??
    (requested === undefined ? states[0] : undefined)
  )?.source;
}

/**
 * 確認・提出する問題。開いているファイルが問題のソースかテストならそれ。
 * そうでなければ次の未提出。全部提出済みなら 1 問目。
 */
export function chooseProblem(
  states: readonly ProblemState[],
  openPath: string | undefined,
  manifest: TaskManifest,
): ProblemState | undefined {
  if (openPath) {
    const fromFile = problemForPath(manifest, openPath) ?? problemForTestPath(manifest, openPath);
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
  if (!row.problems.every((problem) => problem && typeof problem.id === "string")) return undefined;
  if (
    row.gated &&
    !row.problems.every(
      ({ state }) =>
        state === "open" ||
        state === "submitted" ||
        state === "locked-video" ||
        state === "locked-previous",
    )
  )
    return undefined;
  return row as ProblemResults;
}

export async function fetchProblemResults(
  taskId: string,
  signal?: AbortSignal,
): Promise<ProblemResults> {
  const session = apiSession();
  const data = await apiRequest<unknown>(
    `/api/tasks/problem-results?taskId=${encodeURIComponent(taskId)}`,
    ...(signal ? [{ signal, ...(session === undefined ? {} : { session }) }] : []),
  );
  const parsed = readServerProblemResults(data);
  if (!parsed || session !== apiSession()) throw new Error("問題の状態を読み出せません");
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
  const problems =
    manifest.problemSteps && server?.gated
      ? server.problems.flatMap(({ id, state }) => {
          if (state !== "open" && state !== "submitted") return [];
          const problem = manifest.problems?.find((item) => item.id === id);
          return problem ? [problem] : [];
        })
      : (manifest.problems ?? []);
  const passed = new Set(
    (server?.problems ?? [])
      .filter((problem) =>
        manifest.problemSteps && server?.gated
          ? problem.state === "submitted"
          : problem.status === "passed",
      )
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

const PROBLEM_STATES_FILE = "problem-steps.json";
const WAITING_FOR_PROBLEM = "問題の状態を確認できません。Web で課題の進み具合を確認してください";

async function readProblemRecord(root: string, name: string): Promise<unknown> {
  try {
    return JSON.parse(
      (await readFileInRoot(root, `.stella/${name}`, 1024 * 1024)).toString("utf8"),
    );
  } catch {
    return undefined;
  }
}

function recordOfVersion(raw: unknown, contentHash: string) {
  return raw && typeof raw === "object" && "contentHash" in raw && raw.contentHash === contentHash
    ? raw
    : undefined;
}

export async function saveProblemStepResults(
  root: string,
  contentHash: string,
  server: ProblemResults,
) {
  if (server.gated) {
    await writeStateFile(root, PROBLEM_STATES_FILE, JSON.stringify({ contentHash, server })).catch(
      () => undefined,
    );
  }
}

/** 成功した提出だけを控える。手元のテスト合格は提出として扱わない。 */
export async function recordProblemSubmission(root: string, contentHash: string, id: string) {
  if (!isProblemId(id)) return;
  await writeStateFile(root, `submitted-${id}.json`, JSON.stringify({ contentHash })).catch(
    () => undefined,
  );
}

export async function readProblemStepResults(
  root: string,
  manifest: TaskManifest,
  contentHash: string | undefined,
  server: ProblemResults | undefined,
): Promise<ProblemResults | undefined> {
  if (server?.gated || !contentHash) return server;
  const cached = recordOfVersion(await readProblemRecord(root, PROBLEM_STATES_FILE), contentHash);
  const previous =
    cached && "server" in cached ? readServerProblemResults(cached.server) : undefined;
  const submitted = await Promise.all(
    (manifest.problems ?? []).map(async ({ id, title }) => {
      const record = await readProblemRecord(root, `submitted-${id}.json`);
      return recordOfVersion(record, contentHash) ? { id, title } : undefined;
    }),
  );
  const local = submitted.filter((problem) => problem !== undefined);
  if (!previous?.gated && local.length === 0) return server;
  const localIds = new Set(local.map(({ id }) => id));
  const known = [
    ...(previous?.problems ?? []),
    ...local
      .filter(({ id }) => !previous?.problems.some((problem) => problem.id === id))
      .map((problem) => ({ ...problem, status: "passed" as const, firstPassedAt: null })),
  ];
  const problems = known.map(
    (problem): ServerProblem =>
      localIds.has(problem.id) ? { ...problem, state: "submitted", status: "passed" } : problem,
  );
  const passedProblems = problems.filter(({ state }) => state === "submitted").length;
  const totalProblems = manifest.problems?.length ?? 0;
  return {
    gated: true,
    problems,
    passedProblems,
    totalProblems,
    taskPassed: passedProblems === totalProblems,
  };
}

function problemLockedReason(problem: ServerProblem | undefined): string | undefined {
  if (problem?.state === "locked-video")
    return problem.afterTitle
      ? `次の問題は「${problem.afterTitle}」の動画を見ると出ます`
      : "次の問題は指定された動画を見ると出ます";
  if (problem?.state === "locked-previous") return "この問題を提出すると、次の問題が出ます";
  return undefined;
}

export function visibleProblemIds(
  server: ProblemResults | undefined,
): ReadonlySet<string> | undefined {
  return server?.gated
    ? new Set(
        server.problems
          .filter(({ state }) => state === "open" || state === "submitted")
          .map(({ id }) => id),
      )
    : undefined;
}

export interface TaskProblems {
  states: ProblemState[];
  nextReason?: string;
  blocked: Map<string, string>;
  progress: { passed: number; total: number };
  preparationError?: string;
  unprepared: ReadonlySet<string>;
}

/** 表示と操作で同じ解放状態を使う。必要になったファイルだけを同じ版の配布物から足す。 */
const refreshing = new Map<string, Promise<TaskProblems>>();

export function loadTaskProblems(
  root: string,
  manifest: TaskManifest,
  {
    refresh = true,
    afterSubmission = false,
    beforeUpdate,
  }: {
    refresh?: boolean;
    afterSubmission?: boolean;
    beforeUpdate?: Parameters<typeof unlockTaskFiles>[3];
  } = {},
): Promise<TaskProblems> {
  if (!refresh || !manifest.problemSteps) return readTaskProblems(root, manifest, refresh);
  const key = JSON.stringify([root, manifest.id, apiSession()]);
  const inFlight = refreshing.get(key);
  if (inFlight)
    return afterSubmission
      ? inFlight.then(() => loadTaskProblems(root, manifest, { beforeUpdate }))
      : inFlight;
  const pending = readTaskProblems(root, manifest, true, beforeUpdate).finally(() =>
    refreshing.delete(key),
  );
  refreshing.set(key, pending);
  return pending;
}

async function readTaskProblems(
  root: string,
  manifest: TaskManifest,
  refresh: boolean,
  beforeUpdate?: Parameters<typeof unlockTaskFiles>[3],
): Promise<TaskProblems> {
  const session = apiSession();
  const fresh = refresh
    ? await fetchProblemResults(
        manifest.id,
        manifest.problemSteps ? AbortSignal.timeout(4_000) : undefined,
      ).catch(() => undefined)
    : undefined;
  let server = fresh;
  let preparationError: string | undefined;
  let unprepared: string[] = [];
  if (manifest.problemSteps) {
    const receipt = await readDistribution(root).catch(() => undefined);
    const contentHash = receipt?.taskId === manifest.id ? receipt.contentHash : undefined;
    server = await readProblemStepResults(root, manifest, contentHash, fresh);
    if (fresh && contentHash && session === apiSession())
      await saveProblemStepResults(root, contentHash, fresh);
    if (refresh && session === apiSession()) {
      try {
        // 状態の初回取得に失敗しても、配布しなかったファイルがある場合は再接続後に足せる。
        const visible =
          visibleProblemIds(server) ?? new Set(manifest.problems?.map(({ id }) => id));
        const pending = await pendingProblemBundle(root, manifest, visible);
        if (pending) {
          unprepared = pending.ids;
          const signal = AbortSignal.timeout(4_000);
          const options = { signal, ...(session === undefined ? {} : { session }) };
          const { bundle } =
            pending.variant === "fixed-start"
              ? await apiRequest<TaskBundleResponse>("/api/tasks/fixed-start", {
                  ...options,
                  method: "POST",
                  body: { taskId: manifest.id },
                })
              : await apiRequest<TaskBundleResponse>(taskBundleUrl(manifest.id), options);
          if (session === apiSession()) {
            if (bundle.manifest.id !== manifest.id || bundle.contentHash !== pending.contentHash)
              throw new Error(
                "教材が更新されています。Web の課題文から「VS Code で開く」を押してください",
              );
            await unlockTaskFiles(root, bundle, visible, beforeUpdate);
            unprepared = [];
          }
        }
      } catch (error) {
        preparationError = error instanceof Error ? error.message : String(error);
      }
    }
  }
  const states = await loadProblemStates(root, manifest, server);
  const visible = new Set(states.map(({ id }) => id));
  const blocked = new Map<string, string>();
  if (manifest.problemSteps && server?.gated) {
    const manifestIds = new Set(manifest.problems?.map(({ id }) => id));
    for (const problem of server.problems) {
      if (!manifestIds.has(problem.id)) continue;
      const reason = problemLockedReason(problem);
      if (reason) blocked.set(problem.id, reason);
    }
    for (const { id } of manifest.problems ?? []) {
      if (!visible.has(id) && !blocked.has(id)) blocked.set(id, WAITING_FOR_PROBLEM);
    }
  }
  const nextReason = blocked.values().next().value;
  return {
    states,
    blocked,
    ...(nextReason ? { nextReason } : {}),
    ...(preparationError ? { preparationError } : {}),
    unprepared: new Set(unprepared),
    progress: {
      passed: states.filter(({ status }) => status === "submitted").length,
      total: manifest.problemSteps ? (manifest.problems?.length ?? 0) : states.length,
    },
  };
}

const RECHECK = `確認後にファイルが変わっています。${SUBMIT_AGAIN}`;

/**
 * 1 問の提出本文。問題 ID、そのファイル 1 つ、`.stella/problem-runs/<id>.json` の結果。
 * 結果に残ったハッシュと今のファイルが違えば提出しない。
 */
export async function prepareProblemSubmission(
  root: string,
  problemId: string,
  support: SupportEvent[],
): Promise<TaskSubmissionInput> {
  return prepareProblemInput(root, problemId, "submit", { explanation: "", support });
}

/** 相談は、確認後に書き直したファイルと、その問題の実行結果を送る。 */
export async function prepareProblemConsultation(
  root: string,
  problemId: string,
  notes: SubmissionNotes,
): Promise<TaskSubmissionInput> {
  return prepareProblemInput(root, problemId, "consult", notes);
}

async function prepareProblemInput(
  root: string,
  problemId: string,
  mode: "submit" | "consult",
  notes: SubmissionNotes,
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
  if (mode === "submit" && !canSubmit(result))
    throw new Error("手元の確認がすべて通ってから提出してください");
  if (mode === "consult" && canSubmit(result))
    throw new Error("手元の確認が通っています。「提出」を使ってください");
  const bytes = await readFileInRoot(root, source, LIMITS.fileBytes);
  if (mode === "submit") {
    const recorded = result.files;
    const sameFile =
      recorded.length === 1 &&
      recorded[0]?.path === source &&
      recorded[0]?.sha256 === sha256Hex(normalizeForHash(bytes)) &&
      recorded[0]?.bytes === bytes.byteLength;
    if (!sameFile) throw new Error(RECHECK);
    const recordedImports = result.importedFiles;
    if (recordedImports) {
      const imported = await hashFiles(
        root,
        recordedImports.map((file) => file.path),
        LIMITS.fileBytes,
      ).catch(() => {
        throw new Error(RECHECK);
      });
      const sameImports = imported.every(
        (file, index) =>
          file.sha256 === recordedImports[index]?.sha256 &&
          file.bytes === recordedImports[index]?.bytes,
      );
      if (!sameImports) throw new Error(RECHECK);
    }
  }
  const listed = await listFiles(root);
  const protection = await protectedTaskFiles(root, manifest, listed, problemId);
  const protectedHashes = [
    ...(await hashFiles(root, protection.files, LIMITS.protectedFileBytes)),
    ...protection.references,
  ];
  const protectedSame =
    loaded.manifestSha256 === result.manifestSha256 &&
    protectedHashes.length === result.protected.length &&
    protectedHashes.every((file) =>
      result.protected.some((item) => item.path === file.path && item.sha256 === file.sha256),
    );
  if (mode === "submit" && !protectedSame) throw new Error(RECHECK);
  const receipt = await readDistribution(root);
  if (!receipt)
    throw new Error("配布した課題の記録がありません。LMS から配布した課題を開いてください");
  if (
    receipt.taskId !== manifest.id ||
    (result.taskContentHash && result.taskContentHash !== receipt.contentHash)
  )
    throw new Error(
      mode === "consult"
        ? "確認した課題のバージョンが変わっています。もう一度確認してください"
        : "確認した課題のバージョンが変わっています。もう一度「提出する」を押してください",
    );
  return {
    taskId: manifest.id,
    contentHash: result.taskContentHash ?? receipt.contentHash,
    mode,
    problemId,
    files: [{ path: source, content: Buffer.from(bytes).toString("base64") }],
    localResult: result,
    protected: protectedHashes,
    ...notes,
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

export async function sendProblemConsultation(
  root: string,
  problemId: string,
  notes: SubmissionNotes,
  session?: number,
): Promise<{ id: string; attempt: number }> {
  const body = await prepareProblemConsultation(root, problemId, notes);
  const response = await apiRequest<{ row: { id: string; attempt: number } }>("/api/submissions", {
    method: "POST",
    body,
    ...(session === undefined ? {} : { session }),
  });
  return response.row;
}
