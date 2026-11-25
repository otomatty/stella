import path from "node:path";
import * as vscode from "vscode";
import { loadTask } from "./runner/run-task.js";
import { taskRootOf } from "./task-commands.js";
import { problemForPath } from "./task-problems.js";

export function registerTaskCodeLens(context: vscode.ExtensionContext): void {
  const changes = new vscode.EventEmitter<void>();
  context.subscriptions.push(
    changes,
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
          return [
            new vscode.CodeLens(new vscode.Range(line, 0, line, 0), {
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
