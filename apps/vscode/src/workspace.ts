import { getEntryFile } from "@falcon/shared/assignment-helpers";
import { mapAssignmentRowToAssignment, type AssignmentRow } from "@falcon/shared/cms/types";
import type { Assignment } from "@falcon/shared/types";
import { exerciseRoot, filesToWrite } from "@falcon/shared/vscode/exercise-paths";
import * as vscode from "vscode";
import { apiRequest } from "./api.js";

export function resolveHomeDir(): string {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  const home = env?.USERPROFILE ?? env?.HOME;
  if (!home) {
    throw new Error("ホームディレクトリが取得できません");
  }
  return home;
}

export interface ExerciseLesson {
  id?: string;
  courseId?: string;
  assignmentId?: string | null;
  completed?: boolean;
}

export interface ActiveExerciseContext {
  assignmentId: string;
  lessonId: string;
  courseId: string;
}

let activeExercise: ActiveExerciseContext | undefined;

export function rememberActiveExercise(ctx: ActiveExerciseContext): void {
  activeExercise = ctx;
}

export function getActiveExercise(): ActiveExerciseContext | undefined {
  return activeExercise;
}

interface AssignmentResponse {
  row: AssignmentRow | null;
}

function sameFsPath(a: vscode.Uri, b: vscode.Uri): boolean {
  return a.fsPath.replace(/\\/g, "/").toLowerCase() === b.fsPath.replace(/\\/g, "/").toLowerCase();
}

function fileUri(rootUri: vscode.Uri, relPath: string): vscode.Uri {
  const segments = relPath.split(/[/\\]/).filter(Boolean);
  return vscode.Uri.joinPath(rootUri, ...segments);
}

async function pathExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

function addAssignmentFolder(folderUri: vscode.Uri): void {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.some((folder) => sameFsPath(folder.uri, folderUri))) {
    return;
  }
  vscode.workspace.updateWorkspaceFolders(folders.length, 0, { uri: folderUri });
}

const assignmentById = new Map<string, Assignment>();

export function rememberAssignment(assignment: Assignment): void {
  assignmentById.set(assignment.id, assignment);
}

export async function fetchAssignment(assignmentId: string): Promise<Assignment> {
  const { row } = await apiRequest<AssignmentResponse>(
    `/api/cms/assignments/${encodeURIComponent(assignmentId)}`,
  );
  if (!row) {
    throw new Error("課題が見つかりません");
  }
  const assignment = mapAssignmentRowToAssignment(row);
  rememberAssignment(assignment);
  return assignment;
}

export async function getAssignmentForGrading(assignmentId: string): Promise<Assignment> {
  const cached = assignmentById.get(assignmentId);
  if (cached) {
    return cached;
  }
  return fetchAssignment(assignmentId);
}

async function writeStarterFiles(assignment: Assignment, overwrite: boolean): Promise<vscode.Uri> {
  rememberAssignment(assignment);
  const rootUri = vscode.Uri.file(exerciseRoot(resolveHomeDir(), assignment.id));
  await vscode.workspace.fs.createDirectory(rootUri);

  for (const file of filesToWrite(assignment)) {
    const uri = fileUri(rootUri, file.relPath);
    if (!overwrite && (await pathExists(uri))) {
      continue;
    }
    const segments = file.relPath.split(/[/\\]/).filter(Boolean);
    if (segments.length > 1) {
      await vscode.workspace.fs.createDirectory(
        vscode.Uri.joinPath(rootUri, ...segments.slice(0, -1)),
      );
    }
    await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(file.content));
  }

  addAssignmentFolder(rootUri);

  const entryUri = fileUri(rootUri, getEntryFile(assignment));
  const doc = await vscode.workspace.openTextDocument(entryUri);
  await vscode.window.showTextDocument(doc);
  return entryUri;
}

export async function openExercise(assignment: Assignment): Promise<vscode.Uri> {
  return writeStarterFiles(assignment, false);
}

export async function resetExercise(assignment: Assignment): Promise<boolean> {
  const choice = await vscode.window.showWarningMessage(
    "課題ファイルをスターターに戻します。編集内容は失われます。",
    { modal: true },
    "リセット",
  );
  if (choice !== "リセット") {
    return false;
  }
  await writeStarterFiles(assignment, true);
  return true;
}

export async function openLessonCode(lesson: ExerciseLesson): Promise<vscode.Uri | undefined> {
  if (!lesson.assignmentId) {
    void vscode.window.showInformationMessage("このレッスンには課題が紐付いていません");
    return undefined;
  }
  const assignment = await fetchAssignment(lesson.assignmentId);
  if (lesson.id && lesson.courseId) {
    rememberActiveExercise({
      assignmentId: assignment.id,
      lessonId: lesson.id,
      courseId: lesson.courseId,
    });
  }
  return openExercise(assignment);
}
