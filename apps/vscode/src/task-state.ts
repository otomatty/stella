import { TASK_STATUSES, type TaskStatus } from "@stella/shared/tasks/catalog";
import type { HelpItemView, TaskHelpResponse } from "@stella/shared/tasks/help";
import * as vscode from "vscode";
import { apiRequest, apiSession } from "./api.js";
import { type AuthStore, onDidChangeAuthSession } from "./auth.js";
import { type GuideRun, readLastRun } from "./task-guide.js";
import { onDidFinishTaskCheck, onDidStartTaskCheck } from "./task-run-events.js";
import { readDistribution } from "./task-submission.js";

interface TaskState {
  running: boolean;
  lastRun?: GuideRun;
  lmsStatus?: TaskStatus;
  helpLabel?: string;
}

interface Entry extends TaskState {
  taskId: string;
  local?: Promise<void>;
  lms?: { expiresAt: number; pending: Promise<void>; controller: AbortController };
}

const entries = new Map<string, Entry>();
const didChange = new vscode.EventEmitter<string | undefined>();
export const onDidChangeTaskState = didChange.event;
let auth: AuthStore | undefined;

/** 問題ごとの保存済みの結果を、課題のファイルを開いたときに読み直せるようにする。 */
export function notifyProblemTaskOpened(root: string): void {
  didChange.fire(root);
}

export function helpUrl(taskId: string, contentHash: string): string {
  return `/api/tasks/help?${new URLSearchParams({ taskId, contentHash })}`;
}

function helpLabelFor(help: TaskHelpResponse | null): string | undefined {
  if (help?.hints?.length) return "ヒント・解答";
  const offered = (item?: HelpItemView) =>
    item && (item.state !== "locked" || item.reason !== "not-offered");
  const solution = offered(help?.solution);
  const explanation = offered(help?.explanation);
  if (solution && explanation) return "解答・解説";
  if (solution) return "解答例";
  if (explanation) return "解説";
}

async function fetchTaskLmsState(
  root: string,
  taskId: string,
  controller: AbortController,
): Promise<Pick<TaskState, "lmsStatus" | "helpLabel"> | undefined> {
  const session = apiSession();
  if (session === undefined || !auth) return undefined;
  const { signal } = controller;
  const store = auth;
  const request = async () => {
    const receipt = await readDistribution(root);
    if (receipt?.taskId !== taskId || !(await store.getToken())) return undefined;
    signal.throwIfAborted();
    const help = await apiRequest<TaskHelpResponse | null>(helpUrl(taskId, receipt.contentHash), {
      session,
      signal,
    });
    if (session !== apiSession()) return undefined;
    return {
      lmsStatus: TASK_STATUSES.find((status) => status === help?.status),
      helpLabel: helpLabelFor(help),
    };
  };
  const timer = setTimeout(() => controller.abort(), 4_000);
  let stop!: () => void;
  try {
    return await Promise.race([
      new Promise<undefined>((resolve) => {
        stop = () => resolve(undefined);
        signal.addEventListener("abort", stop, { once: true });
      }),
      request(),
    ]);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", stop);
  }
}

function clearLms(entry: Entry): void {
  entry.lms?.controller.abort();
  entry.lms = undefined;
  entry.lmsStatus = undefined;
  entry.helpLabel = undefined;
}

function entryFor(root: string, taskId: string): Entry {
  const current = entries.get(root);
  if (current?.taskId === taskId) return current;
  if (current) clearLms(current);
  const entry = { taskId, running: false };
  entries.set(root, entry);
  return entry;
}

function reloadLastRun(root: string, entry: Entry): Promise<void> {
  const reading = readLastRun(root, entry.taskId).then((lastRun) => {
    if (entries.get(root) !== entry || entry.local !== reading) return;
    entry.lastRun = lastRun;
    didChange.fire(root);
  });
  entry.local = reading;
  return reading;
}

export function getTaskState(root: string, taskId: string): TaskState | undefined {
  const entry = entries.get(root);
  return entry?.taskId === taskId ? entry : undefined;
}

/** 同じ課題のパネルとステータスバーで、取得中のリクエストも共有する。 */
export async function refreshTaskState(
  root: string,
  taskId: string,
  options: { forceLms?: boolean; skipLms?: boolean } = {},
): Promise<void> {
  const entry = entryFor(root, taskId);
  const local = entry.local ?? reloadLastRun(root, entry);
  if (options.skipLms) return local;
  if (options.forceLms) {
    clearLms(entry);
    didChange.fire(root);
  }
  if (!entry.lms || Date.now() >= entry.lms.expiresAt) {
    const controller = new AbortController();
    const pending = fetchTaskLmsState(root, taskId, controller).then((state) => {
      if (entry.lms?.controller !== controller || entries.get(root) !== entry) return;
      entry.lmsStatus = state?.lmsStatus;
      entry.helpLabel = state?.helpLabel;
      didChange.fire(root);
    });
    entry.lms = { pending, expiresAt: Date.now() + 30_000, controller };
  }
  await Promise.all([local, entry.lms.pending]);
}

export function registerTaskState(context: vscode.ExtensionContext, store: AuthStore): void {
  auth = store;
  context.subscriptions.push(
    onDidStartTaskCheck(({ root, taskId }) => {
      entryFor(root, taskId).running = true;
      didChange.fire(root);
    }),
    onDidFinishTaskCheck(({ root, manifest }) => {
      const entry = entryFor(root, manifest.id);
      entry.running = false;
      void reloadLastRun(root, entry);
    }),
    onDidChangeAuthSession(() => {
      for (const entry of entries.values()) clearLms(entry);
      didChange.fire(undefined);
    }),
    {
      dispose: () => {
        for (const entry of entries.values()) clearLms(entry);
        entries.clear();
        auth = undefined;
      },
    },
  );
}
