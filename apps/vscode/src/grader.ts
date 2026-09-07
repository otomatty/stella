import {
  assignmentIdFromExercisePath,
  exerciseRoot,
  isPathInsideDir,
} from "@stella/shared/vscode/exercise-paths";
import type { Assignment } from "@stella/shared/types";
import * as vscode from "vscode";
import { gradeFiles } from "./grader-host.js";
import type { ExecutionResult } from "./grader-protocol.js";
import { getAssignmentForGrading, resolveHomeDir } from "./workspace.js";

export { formatGradeMessage, type ExecutionResult } from "./grader-protocol.js";

function fileUri(rootUri: vscode.Uri, relPath: string): vscode.Uri {
  const segments = relPath.split(/[/\\]/).filter(Boolean);
  return vscode.Uri.joinPath(rootUri, ...segments);
}

export function resolveActiveAssignmentId(): string | undefined {
  const home = resolveHomeDir();
  const activePath = vscode.window.activeTextEditor?.document.uri.fsPath;
  if (activePath) {
    const fromEditor = assignmentIdFromExercisePath(activePath, home);
    if (fromEditor) {
      return fromEditor;
    }
  }
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const fromFolder = assignmentIdFromExercisePath(folder.uri.fsPath, home);
    if (fromFolder) {
      return fromFolder;
    }
  }
  return undefined;
}

async function saveDirtyExerciseFiles(rootUri: vscode.Uri): Promise<void> {
  await Promise.all(
    vscode.workspace.textDocuments
      .filter((doc) => doc.isDirty && isPathInsideDir(doc.uri.fsPath, rootUri.fsPath))
      .map((doc) => doc.save()),
  );
}

async function readExerciseFiles(rootUri: vscode.Uri): Promise<Record<string, string>> {
  const files: Record<string, string> = {};

  async function walk(dir: vscode.Uri, rel: string): Promise<void> {
    const entries = await vscode.workspace.fs.readDirectory(dir);
    for (const [name, type] of entries) {
      if (name.startsWith(".")) {
        continue;
      }
      const childRel = rel ? `${rel}/${name}` : name;
      const childUri = fileUri(dir, name);
      if (type === vscode.FileType.Directory) {
        await walk(childUri, childRel);
      } else if (type === vscode.FileType.File) {
        const bytes = await vscode.workspace.fs.readFile(childUri);
        files[childRel] = new TextDecoder().decode(bytes);
      }
    }
  }

  await walk(rootUri, "");
  return files;
}

/** 採点 1 回ぶんの入出力。 「講師に引き継ぐ」 が採点した内容そのものを送れるようにする。 */
export interface GradeRun {
  assignment: Assignment;
  files: Record<string, string>;
  result: ExecutionResult;
}

export async function gradeActiveExercise(): Promise<GradeRun> {
  const assignmentId = resolveActiveAssignmentId();
  if (!assignmentId) {
    throw new Error("課題フォルダを開いてください");
  }
  const assignment = await getAssignmentForGrading(assignmentId);
  const rootUri = vscode.Uri.file(exerciseRoot(resolveHomeDir(), assignment.id));
  await saveDirtyExerciseFiles(rootUri);
  const files = await readExerciseFiles(rootUri);
  return { assignment, files, result: await gradeFiles({ assignment, files }) };
}
