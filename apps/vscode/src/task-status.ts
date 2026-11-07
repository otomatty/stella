/**
 * いま取り組んでいる課題を、ステータスバーとエディターの右上のボタンに出す。
 *
 * - ステータスバー: 「課題を確認する」と「課題文」。問題つきの課題は `12/20 問` も出す。
 *   コマンドパレットを知らなくても、画面の下から確認と課題文 (進め方) に戻れるようにする。
 * - コンテキストキー `stella.inTask`: 開いているファイルが課題フォルダーの中なら true。
 *   エディターの右上の「課題を確認する」「課題文を表示する」のボタンの表示条件 (package.json)。
 *
 * 課題は、開いているファイルの課題フォルダー (ワークスペースの中だけ) で決める。課題文や
 * 結果のパネル (テキストのエディターではない) に移ったときは、直前の課題を出したままにする。
 */

import path from "node:path";
import * as vscode from "vscode";
import { findTaskRoot, loadTask } from "./runner/run-task.js";
import { fetchProblemResults, loadProblemStates, problemCountLabel } from "./task-problems.js";

export interface CurrentTask {
  root: string;
  title: string;
  /** 問題つきの課題の、提出済みと全部の件数。 */
  problemProgress?: { passed: number; total: number };
}

let current: CurrentTask | undefined;
let inTask = false;
let runItem: vscode.StatusBarItem | undefined;
let readmeItem: vscode.StatusBarItem | undefined;
let progressItem: vscode.StatusBarItem | undefined;
/** 開いているファイルが変わるたびに増やし、古い問い合わせの結果で上書きしない。 */
let generation = 0;

function isInside(file: string, dir: string): boolean {
  const rel = path.relative(dir, file);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/** ワークスペースの中のファイルから課題フォルダーを探す。外のファイル・課題の外なら null。 */
async function taskRootOfFile(file: string): Promise<string | null> {
  const owner = (vscode.workspace.workspaceFolders ?? [])
    .map((folder) => folder.uri.fsPath)
    .find((root) => isInside(file, root));
  return owner ? findTaskRoot(file, [owner]) : null;
}

function render(): void {
  void vscode.commands.executeCommand("setContext", "stella.inTask", inTask);
  if (!runItem || !readmeItem || !progressItem) return;
  if (!current) {
    runItem.hide();
    readmeItem.hide();
    progressItem.hide();
    return;
  }
  runItem.text = "$(beaker) 課題を確認する";
  runItem.tooltip = `「${current.title}」を手元で確認します (STELLA: 課題を確認する)`;
  runItem.command = {
    command: "stella.runTask",
    title: "課題を確認する",
    arguments: [current.root],
  };
  readmeItem.text = "$(book) 課題文";
  readmeItem.tooltip = `「${current.title}」の課題文と進め方を表示します`;
  readmeItem.command = {
    command: "stella.showTaskReadme",
    title: "課題文を表示する",
    arguments: [current.root],
  };
  const progress = current.problemProgress;
  if (progress && progress.total > 0) {
    progressItem.text = problemCountLabel(progress.passed, progress.total);
    progressItem.tooltip = `「${current.title}」の提出済み ${progressItem.text}`;
    progressItem.command = {
      command: "stella.showTaskReadme",
      title: "課題文を表示する",
      arguments: [current.root],
    };
    progressItem.show();
  } else {
    progressItem.hide();
  }
  runItem.show();
  readmeItem.show();
}

/** 課題文のパネルを開いたときなど、課題が分かっているときに知らせる。 */
export function setCurrentTask(task: CurrentTask | undefined): void {
  current = task;
  render();
}

async function followEditor(editor: vscode.TextEditor | undefined): Promise<void> {
  const ticket = ++generation;
  const uri = editor?.document.uri;
  // パネル (課題文・結果) や出力に移ったときは、直前の課題を出したままにする。
  if (uri?.scheme !== "file") return;
  const root = await taskRootOfFile(uri.fsPath);
  if (ticket !== generation) return;
  inTask = root !== null;
  if (!root) {
    current = undefined;
    render();
    return;
  }
  if (current?.root !== root) {
    const loaded = await loadTask(root);
    if (ticket !== generation) return;
    const title = loaded.ok ? loaded.manifest.title : path.basename(root);
    let problemProgress: CurrentTask["problemProgress"];
    if (loaded.ok && loaded.manifest.problems?.length) {
      try {
        const states = await loadProblemStates(
          root,
          loaded.manifest,
          await fetchProblemResults(loaded.manifest.id),
        );
        if (ticket !== generation) return;
        problemProgress = {
          passed: states.filter((item) => item.status === "submitted").length,
          total: states.length,
        };
      } catch {
        problemProgress = undefined;
      }
    }
    current = { root, title, ...(problemProgress ? { problemProgress } : {}) };
  }
  render();
}

export function registerTaskStatus(context: vscode.ExtensionContext): void {
  runItem = vscode.window.createStatusBarItem("stella.runTask", vscode.StatusBarAlignment.Left, 50);
  runItem.name = "STELLA: 課題を確認する";
  readmeItem = vscode.window.createStatusBarItem(
    "stella.showTaskReadme",
    vscode.StatusBarAlignment.Left,
    49,
  );
  readmeItem.name = "STELLA: 課題文";
  progressItem = vscode.window.createStatusBarItem(
    "stella.problemProgress",
    vscode.StatusBarAlignment.Left,
    48,
  );
  progressItem.name = "STELLA: 問題の件数";
  context.subscriptions.push(
    runItem,
    readmeItem,
    progressItem,
    vscode.window.onDidChangeActiveTextEditor((editor) => followEditor(editor)),
    vscode.workspace.onDidChangeWorkspaceFolders(() =>
      followEditor(vscode.window.activeTextEditor),
    ),
    {
      dispose: () => {
        runItem = undefined;
        readmeItem = undefined;
        progressItem = undefined;
        current = undefined;
        inTask = false;
      },
    },
  );
  void followEditor(vscode.window.activeTextEditor);
}
