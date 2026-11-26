import path from "node:path";
import * as vscode from "vscode";
import { loadTask, sameTaskRoot } from "./runner/run-task.js";
import { checkProgressLabel } from "./task-check-progress.js";
import { taskRootOf } from "./task-commands.js";
import { problemForPath } from "./task-problems.js";
import {
  activeTaskCheck,
  onDidChangeTaskBusy,
  onDidFinishTaskCheck,
  onDidProgressTaskCheck,
  onDidStartTaskCheck,
  TASK_BUSY_LABEL,
  taskBusy,
} from "./task-run-events.js";

export function registerTaskCodeLens(context: vscode.ExtensionContext): void {
  const changes = new vscode.EventEmitter<void>();
  context.subscriptions.push(
    changes,
    onDidStartTaskCheck(() => changes.fire()),
    onDidProgressTaskCheck(() => changes.fire()),
    onDidFinishTaskCheck(() => changes.fire()),
    onDidChangeTaskBusy(() => changes.fire()),
    vscode.workspace.onDidGrantWorkspaceTrust(() => changes.fire()),
    vscode.languages.registerCodeLensProvider(
      { scheme: "file", pattern: "**/src/*.{ts,cs}" },
      {
        onDidChangeCodeLenses: changes.event,
        async provideCodeLenses(document, token) {
          if (!vscode.workspace.isTrusted || document.uri.scheme !== "file") return [];
          const root = await taskRootOf(document.uri.fsPath);
          if (!root || token.isCancellationRequested) return [];
          const task = await loadTask(root);
          if (!task.ok || !vscode.workspace.isTrusted || token.isCancellationRequested) return [];
          const problem = problemForPath(task.manifest, path.relative(root, document.uri.fsPath));
          if (!problem) return [];

          const text = document.getText();
          const firstExport = /^[^\S\r\n]*export\b/m.exec(text);
          const line = firstExport ? document.positionAt(firstExport.index).line : 0;
          const range = new vscode.Range(line, 0, line, 0);
          const active = activeTaskCheck();
          if (active && sameTaskRoot(active.root, root) && active.problemId === problem.id) {
            const label = checkProgressLabel(active.progress);
            return [
              new vscode.CodeLens(range, {
                title: label ? `$(sync~spin) 確認中 ${label}` : "$(sync~spin) 確認中…",
                command: "stella.showRunLog",
              }),
            ];
          }
          const busy = taskBusy();
          if (busy) {
            return [
              new vscode.CodeLens(range, {
                title: TASK_BUSY_LABEL[busy],
                command: busy === "submit" ? "" : "stella.showRunLog",
              }),
            ];
          }
          return [
            new vscode.CodeLens(range, {
              title: "▷ 確認して提出",
              command: "stella.submitTask",
              arguments: [root, problem.id],
            }),
          ];
        },
      },
    ),
  );
}
