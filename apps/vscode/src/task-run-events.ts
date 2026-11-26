import type { TaskManifest } from "@stella/shared/tasks/manifest";
import type { RunResult } from "@stella/shared/tasks/run-result";
import * as vscode from "vscode";
import type { RunProgress } from "./runner/run-task.js";
import { applyRunProgress, type CheckProgress, emptyCheckProgress } from "./task-check-progress.js";

export interface TaskCheckStarted {
  root: string;
  taskId: string;
  problemId?: string;
  forSubmission?: boolean;
  title?: string;
  target?: string;
  note?: string;
}

export interface ActiveTaskCheck extends TaskCheckStarted {
  progress: CheckProgress;
}

export interface TaskCheckFinished {
  root: string;
  manifest: TaskManifest;
  result: RunResult;
  /** 中断した結果は保存しない。 */
  saved: boolean;
}

export type TaskBusy = "check" | "submit" | "diagnose";

export const TASK_BUSY_LABEL: Record<TaskBusy, string> = {
  check: "$(sync~spin) 確認中…",
  submit: "$(sync~spin) 提出中…",
  diagnose: "$(sync~spin) 開発環境を診断中…",
};

const started = new vscode.EventEmitter<TaskCheckStarted>();
const progressed = new vscode.EventEmitter<ActiveTaskCheck>();
const finished = new vscode.EventEmitter<TaskCheckFinished>();
const busyChanged = new vscode.EventEmitter<TaskBusy | undefined>();

let active: ActiveTaskCheck | undefined;
let currentBusy: TaskBusy | undefined;

export const onDidStartTaskCheck = started.event;
export const onDidProgressTaskCheck = progressed.event;
export const onDidFinishTaskCheck = finished.event;
export const onDidChangeTaskBusy = busyChanged.event;

export function taskBusy(): TaskBusy | undefined {
  return currentBusy;
}

export function setTaskBusy(next: TaskBusy | undefined): void {
  if (next === currentBusy) return;
  currentBusy = next;
  void vscode.commands.executeCommand("setContext", "stella.taskBusy", next !== undefined);
  busyChanged.fire(next);
}

export function activeTaskCheck(): ActiveTaskCheck | undefined {
  return active;
}

// VS Code の EventEmitter はリスナーの例外を個別に扱い、残りのリスナーにも通知する。
export function startTaskCheck(event: TaskCheckStarted): void {
  active = { ...event, progress: emptyCheckProgress() };
  started.fire(event);
}

export function progressTaskCheck(event: RunProgress): void {
  if (!active) return;
  active = { ...active, progress: applyRunProgress(active.progress, event) };
  progressed.fire(active);
}

export function finishTaskCheck(event: TaskCheckFinished): void {
  active = undefined;
  finished.fire(event);
}
