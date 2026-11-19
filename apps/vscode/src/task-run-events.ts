import type { TaskManifest } from "@stella/shared/tasks/manifest";
import type { RunResult } from "@stella/shared/tasks/run-result";
import * as vscode from "vscode";

export interface TaskCheckStarted {
  root: string;
  taskId: string;
  problemId?: string;
}

export interface TaskCheckFinished {
  root: string;
  manifest: TaskManifest;
  result: RunResult;
  /** 中断した結果は保存しない。 */
  saved: boolean;
}

const started = new vscode.EventEmitter<TaskCheckStarted>();
const finished = new vscode.EventEmitter<TaskCheckFinished>();

export const onDidStartTaskCheck = started.event;
export const onDidFinishTaskCheck = finished.event;

// VS Code の EventEmitter はリスナーの例外を個別に扱い、残りのリスナーにも通知する。
export function startTaskCheck(event: TaskCheckStarted): void {
  started.fire(event);
}

export function finishTaskCheck(event: TaskCheckFinished): void {
  finished.fire(event);
}
