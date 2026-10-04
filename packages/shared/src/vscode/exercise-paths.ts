import type { Assignment } from "../types.js";
import { getStarterFiles } from "../assignment-helpers.js";

export function exerciseRoot(homeDir: string, assignmentId: string): string {
  const home = homeDir.replace(/[/\\]+$/, "");
  return `${home}/.stella/exercises/${assignmentId}`;
}

/** 旧ファイルをコピー・参照するときだけ使う移行元。 */
export function legacyExerciseRoot(homeDir: string, assignmentId: string): string {
  return `${homeDir.replace(/[/\\]+$/, "")}/.falcon-informal/exercises/${assignmentId}`;
}

/** 同じ課題のフォルダーが新旧とも開いているときは、新しい方を採点する。 */
export function preferredExercisePath(
  homeDir: string,
  assignmentId: string,
  candidates: readonly string[],
): string | undefined {
  const matches = candidates.filter(
    (path) => assignmentIdFromExercisePath(path, homeDir) === assignmentId,
  );
  const canonical = exerciseRoot(homeDir, assignmentId);
  return matches.find((path) => isPathInsideDir(path, canonical)) ?? matches[0];
}

export function exerciseRootForPath(
  homeDir: string,
  assignmentId: string,
  fsPath?: string,
): string {
  const legacy = legacyExerciseRoot(homeDir, assignmentId);
  return fsPath && isPathInsideDir(fsPath, legacy) ? legacy : exerciseRoot(homeDir, assignmentId);
}

/** True when `fsPath` is `dirPath` or a file under it (not a prefix sibling like asg-1 vs asg-10). */
export function isPathInsideDir(fsPath: string, dirPath: string): boolean {
  const file = fsPath.replace(/\\/g, "/").toLowerCase();
  const dir = dirPath.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
  return file === dir || file.startsWith(`${dir}/`);
}

export function assignmentIdFromExercisePath(fsPath: string, homeDir: string): string | undefined {
  const file = fsPath.replace(/\\/g, "/");
  const home = homeDir.replace(/\\/g, "/");
  const prefix = [exerciseRoot(home, ""), legacyExerciseRoot(home, "")].find((root) =>
    file.toLowerCase().startsWith(root.toLowerCase()),
  );
  if (!prefix) {
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
