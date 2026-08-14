import type { Assignment } from "../types.js";
import { getStarterFiles } from "../assignment-helpers.js";

export function exerciseRoot(homeDir: string, assignmentId: string): string {
  const home = homeDir.replace(/[/\\]+$/, "");
  return `${home}/.falcon-informal/exercises/${assignmentId}`;
}

/** True when `fsPath` is `dirPath` or a file under it (not a prefix sibling like asg-1 vs asg-10). */
export function isPathInsideDir(fsPath: string, dirPath: string): boolean {
  const file = fsPath.replace(/\\/g, "/").toLowerCase();
  const dir = dirPath.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
  return file === dir || file.startsWith(`${dir}/`);
}

export function assignmentIdFromExercisePath(
  fsPath: string,
  homeDir: string,
): string | undefined {
  const file = fsPath.replace(/\\/g, "/");
  const prefix = `${homeDir.replace(/[/\\]+$/, "").replace(/\\/g, "/")}/.falcon-informal/exercises/`;
  if (!file.toLowerCase().startsWith(prefix.toLowerCase())) {
    return undefined;
  }
  const id = file.slice(prefix.length).split("/").filter(Boolean)[0];
  return id;
}

export function filesToWrite(
  assignment: Assignment,
): Array<{ relPath: string; content: string; readonly: boolean }> {
  return getStarterFiles(assignment).map((file) => ({
    relPath: file.path,
    content: file.content,
    readonly: file.readonly === true,
  }));
}
