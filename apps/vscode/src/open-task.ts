import { homedir } from "node:os";
import path from "node:path";
import * as vscode from "vscode";
import type { TaskBundle } from "@stella/shared/tasks/catalog";
import { apiRequest } from "./api.js";
import { installTask } from "./task-distribution.js";

export async function openDistributedTask(taskId: string): Promise<void> {
  const { bundle } = await apiRequest<{ bundle: TaskBundle }>(
    `/api/tasks/bundle?${new URLSearchParams({ taskId })}`,
  );
  if (bundle.manifest.id !== taskId) throw new Error("配布する課題の ID が一致しません");
  const trainingRoot = path.join(homedir(), "web-training");
  const root = await installTask(trainingRoot, bundle);
  if (!vscode.workspace.workspaceFolders?.some((f) => f.uri.fsPath === trainingRoot)) {
    vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders?.length ?? 0, 0, {
      uri: vscode.Uri.file(trainingRoot),
      name: "web-training",
    });
  }
  const readme = await vscode.workspace.openTextDocument(
    vscode.Uri.file(path.join(root, "README.md")),
  );
  await vscode.window.showTextDocument(readme);
}
