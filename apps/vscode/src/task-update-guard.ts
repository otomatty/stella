import { realpath } from "node:fs/promises";
import path from "node:path";
import * as vscode from "vscode";
import { TaskInstallConflict } from "./task-distribution.js";
import { loadTaskProblems as loadProblems } from "./task-problems.js";

function isInside(dir: string, target: string): boolean {
  const rel = path.relative(dir, target);
  return rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
}

export async function requireSavedTaskDocuments(root: string): Promise<void> {
  const unsaved = [];
  for (const { isDirty, uri } of vscode.workspace.textDocuments ?? []) {
    if (!isDirty || uri.scheme !== "file") continue;
    if (isInside(root, uri.fsPath)) unsaved.push(path.relative(root, uri.fsPath));
    else {
      const [actualRoot, actualFile] = await Promise.all([
        realpath(root),
        realpath(uri.fsPath).catch(() => uri.fsPath),
      ]);
      if (isInside(actualRoot, actualFile)) unsaved.push(path.relative(actualRoot, actualFile));
    }
  }
  if (unsaved.length > 0) throw new TaskInstallConflict("unsaved", root, unsaved);
}

export async function requireSavedTaskFile(root: string, rel: string): Promise<void> {
  const target = path.join(root, rel);
  for (const { isDirty, uri } of vscode.workspace.textDocuments ?? []) {
    if (!isDirty || uri.scheme !== "file") continue;
    if (path.relative(target, uri.fsPath) === "")
      throw new TaskInstallConflict("unsaved", root, [rel]);
    const [actualTarget, actualFile] = await Promise.all([
      realpath(target).catch(() => target),
      realpath(uri.fsPath).catch(() => uri.fsPath),
    ]);
    if (path.relative(actualTarget, actualFile) === "")
      throw new TaskInstallConflict("unsaved", root, [rel]);
  }
}

export function loadTaskProblems(
  root: Parameters<typeof loadProblems>[0],
  manifest: Parameters<typeof loadProblems>[1],
  options?: Parameters<typeof loadProblems>[2],
) {
  return loadProblems(root, manifest, {
    ...options,
    beforeUpdate: requireSavedTaskDocuments,
    beforeReplace: requireSavedTaskFile,
  });
}
