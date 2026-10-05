/**
 * 新形式の課題 (`.stella/task.json`) を手元で確かめるコマンド。
 *
 * - STELLA: 課題を確認する   … 開いているファイルの課題フォルダーで runner を実行する
 * - STELLA: 開発環境を診断する … Node.js・npm・Git の版を確かめる
 * - STELLA: 実行ログを表示する … 道具の出力をそのまま見る
 *
 * 外部プロセスを起動するので、信頼したフォルダー (Workspace Trust) でだけ実行する。
 */

import { homedir } from "node:os";
import path from "node:path";
import type { TaskManifest } from "@stella/shared/tasks/manifest";
import type { RunOutcome } from "@stella/shared/tasks/run-result";
import { RUNNERS } from "@stella/shared/tasks/runners";
import * as vscode from "vscode";
import {
  findTaskRoot,
  type LoadedTask,
  loadTask,
  runTask,
  saveRunResult,
} from "./runner/run-task.js";
import { showTaskPanel } from "./task-panel.js";

let running = false;

function workspaceRoots(): string[] {
  return (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);
}

function isInside(file: string, dir: string): boolean {
  const rel = path.relative(dir, file);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * 開いているファイル、なければワークスペースのフォルダーから課題フォルダーを探す。
 * 探すのはワークスペースのフォルダーの中だけ。外のファイルを開いていても、その親を
 * たどらない — 信頼したのはワークスペースのフォルダーで、外の課題ではないため。
 */
async function locateTask(): Promise<string | null> {
  const roots = workspaceRoots();
  const active = vscode.window.activeTextEditor?.document.uri;
  if (active?.scheme === "file") {
    const owner = roots.find((root) => isInside(active.fsPath, root));
    if (owner) {
      const found = await findTaskRoot(active.fsPath, [owner]);
      if (found) return found;
    }
  }
  for (const root of roots) {
    const found = await findTaskRoot(root, [root]);
    if (found) return found;
  }
  return null;
}

async function requireTrust(): Promise<boolean> {
  if (vscode.workspace.isTrusted) return true;
  const manage = "フォルダーを信頼する";
  const choice = await vscode.window.showWarningMessage(
    "信頼していないフォルダーでは、課題の確認 (テストや npm の実行) をしません。自分で作った練習フォルダーか、配布元を確認した教材のときだけ信頼してください。",
    manage,
  );
  if (choice === manage) await vscode.commands.executeCommand("workbench.trust.manage");
  return false;
}

/** 保存していない変更があれば、保存してから確かめるか尋ねる。 */
async function confirmUnsaved(root: string): Promise<boolean> {
  const dirty = vscode.workspace.textDocuments.filter(
    (doc) => doc.isDirty && doc.uri.scheme === "file" && isInside(doc.uri.fsPath, root),
  );
  if (dirty.length === 0) return true;
  const save = "保存して確認する";
  const asIs = "保存せずに確認する";
  const choice = await vscode.window.showWarningMessage(
    `保存していないファイルが ${dirty.length} 件あります。確認するのは保存した内容です。`,
    save,
    asIs,
  );
  if (choice === save) {
    for (const doc of dirty) {
      // 読み取り専用・保存時の処理の失敗・競合の取り消しでは false が返る。そのまま
      // 確かめると、エディターと違うディスクの内容で結果を残してしまう。
      if (!(await doc.save())) {
        void vscode.window.showWarningMessage(
          `${path.basename(doc.uri.fsPath)} を保存できなかったため、確認をやめました。保存してからもう一度実行してください`,
        );
        return false;
      }
    }
    return true;
  }
  return choice === asIs;
}

async function runWithProgress(
  output: vscode.OutputChannel,
  title: string,
  work: (signal: AbortSignal, log: (text: string) => void) => Promise<void>,
): Promise<void> {
  if (running) {
    void vscode.window.showInformationMessage("いま確認しています。終わるまで待ってください");
    return;
  }
  running = true;
  output.clear();
  output.appendLine(`[${new Date().toLocaleString()}] ${title}`);
  try {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title, cancellable: true },
      async (_progress, token) => {
        const controller = new AbortController();
        token.onCancellationRequested(() => controller.abort());
        await work(controller.signal, (text) => output.append(text));
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(message);
    void vscode.window.showErrorMessage(`確認を実行できませんでした: ${message}`);
  } finally {
    running = false;
  }
}

function notify(outcome: RunOutcome, output: vscode.OutputChannel): void {
  if (outcome === "cancelled") {
    void vscode.window.showInformationMessage("確認を中断しました");
  } else if (outcome === "passed") {
    void vscode.window.showInformationMessage("手元の確認がすべて通りました");
  } else if (outcome === "failed") {
    void vscode.window.showWarningMessage("直すところがあります。結果のパネルを確認してください");
  } else {
    const show = "ログを表示";
    void vscode.window
      .showErrorMessage("環境の問題で確認できませんでした。結果のパネルを確認してください", show)
      .then((choice) => {
        if (choice === show) output.show(true);
      });
  }
}

async function runTaskCommand(output: vscode.OutputChannel): Promise<void> {
  const root = await locateTask();
  if (!root) {
    void vscode.window.showInformationMessage(
      "課題フォルダーのファイルを開いてから実行してください (.stella/task.json がある課題フォルダー)",
    );
    return;
  }
  const loaded: LoadedTask = await loadTask(root);
  if (!loaded.ok) {
    showTaskPanel({ kind: "invalid", root, errors: loaded.errors });
    return;
  }
  const { manifest, manifestSha256 } = loaded;
  // HTML の確認は拡張の中でファイルを読むだけなので、信頼していないフォルダーでも動かす。
  if (manifest.runner !== "static-preview" && !(await requireTrust())) return;
  if (!(await confirmUnsaved(root))) return;
  await runWithProgress(output, `課題を確認しています: ${manifest.title}`, async (signal, log) => {
    const result = await runTask({ root, manifest, manifestSha256, signal, log });
    showTaskPanel({ kind: "result", manifest, result });
    // 中断した実行は何も確かめていないので、前回の結果を上書きしない。
    if (result.outcome !== "cancelled") {
      try {
        await saveRunResult(root, result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        output.appendLine(`結果を保存できませんでした: ${message}`);
        void vscode.window.showWarningMessage(
          `確認の結果を .stella/last-run.json に保存できませんでした: ${message}`,
        );
        return;
      }
    }
    notify(result.outcome, output);
  });
}

async function diagnoseCommand(output: vscode.OutputChannel): Promise<void> {
  if (!(await requireTrust())) return;
  const root = await locateTask();
  const loaded = root ? await loadTask(root) : null;
  const environment = loaded?.ok ? loaded.manifest.environment : undefined;
  const manifest: TaskManifest = {
    schemaVersion: 1,
    id: "local/environment/diagnose",
    title: "開発環境の診断",
    kind: "basic",
    runner: "env-diagnose",
    submit: { files: [] },
    protected: [],
    checks: { lint: false, format: false },
    ...(environment ? { environment } : {}),
  };
  const cwd = root ?? workspaceRoots()[0] ?? homedir();
  await runWithProgress(output, RUNNERS["env-diagnose"].label, async (signal, log) => {
    const result = await runTask({ root: cwd, manifest, manifestSha256: "", signal, log });
    showTaskPanel({ kind: "result", manifest, result, standalone: true });
    notify(result.outcome, output);
  });
}

export function registerTaskCommands(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("STELLA 実行ログ");
  context.subscriptions.push(
    output,
    vscode.commands.registerCommand("stella.runTask", () => runTaskCommand(output)),
    vscode.commands.registerCommand("stella.diagnoseEnvironment", () => diagnoseCommand(output)),
    vscode.commands.registerCommand("stella.showRunLog", () => output.show(true)),
  );
}
