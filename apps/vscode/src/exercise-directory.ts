import * as vscode from "vscode";

async function exists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch (error) {
    if (error instanceof vscode.FileSystemError && error.code === "FileNotFound") return false;
    throw error;
  }
}

/** 旧課題をコピーしてから新フォルダーを開く。旧ファイルは復旧用に残す。 */
export async function migrateExerciseDirectory(
  root: vscode.Uri,
  legacy: vscode.Uri,
): Promise<void> {
  if (await exists(root)) return;
  if (!(await exists(legacy))) return;
  const legacyPath = legacy.fsPath.replace(/\\/g, "/").toLowerCase();
  for (const document of vscode.workspace.textDocuments) {
    const path = document.uri.fsPath.replace(/\\/g, "/").toLowerCase();
    if (document.isDirty && (path === legacyPath || path.startsWith(`${legacyPath}/`))) {
      if (!(await document.save())) throw new Error("旧演習ファイルを保存できませんでした");
    }
  }
  const parent = vscode.Uri.joinPath(root, "..");
  const staging = vscode.Uri.joinPath(parent, `.migrate-${Date.now()}`);
  await vscode.workspace.fs.createDirectory(parent);
  try {
    await vscode.workspace.fs.copy(legacy, staging, { overwrite: false });
    await vscode.workspace.fs.rename(staging, root, { overwrite: false });
  } catch (error) {
    try {
      if (await exists(staging)) await vscode.workspace.fs.delete(staging, { recursive: true });
    } catch {
      // コピー失敗を返す。一時フォルダーが残っても、新しい演習フォルダーは作らない。
    }
    throw error;
  }
}
