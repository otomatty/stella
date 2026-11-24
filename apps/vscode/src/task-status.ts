/**
 * いま取り組んでいる課題を、ステータスバーとエディターの右上のボタンに出す。
 *
 * - ステータスバー: 課題の状態と「提出する」「課題文」。問題つきの課題は `12/20 問` も出す。
 *   コマンドパレットを知らなくても、画面の下から提出と課題文 (進め方) に戻れるようにする。
 * - コンテキストキー `stella.inTask`: 開いているファイルが課題フォルダーの中なら true。
 *   エディターの右上の「課題を提出する」「課題を確認する」「課題文を表示する」のボタンの表示条件 (package.json)。
 *
 * 課題は、開いているファイルの課題フォルダー (ワークスペースの中だけ) で決める。課題文や
 * 結果のパネル (テキストのエディターではない) に移ったときは、直前の課題を出したままにする。
 */

import path from "node:path";
import { TASK_STATUS_LABELS } from "@stella/shared/tasks/catalog";
import * as vscode from "vscode";
import { onDidChangeAuth } from "./auth.js";
import { findTaskRoot, loadTask } from "./runner/run-task.js";
import { fetchProblemResults, loadProblemStates, problemCountLabel } from "./task-problems.js";
import { loadTaskProblems } from "./task-update-guard.js";
import {
  getTaskState,
  notifyProblemTaskOpened,
  onDidChangeTaskState,
  refreshTaskState,
} from "./task-state.js";

export interface CurrentTask {
  root: string;
  title: string;
  /** 状態を表示する課題の ID。 */
  taskId?: string;
  /** 問題つきの課題の、提出済みと全部の件数。 */
  problemProgress?: { passed: number; total: number };
  problemActionsAvailable?: boolean;
}

let current: CurrentTask | undefined;
let inTask = false;
let stateItem: vscode.StatusBarItem | undefined;
let submitItem: vscode.StatusBarItem | undefined;
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

function renderState(item: vscode.StatusBarItem, task: CurrentTask): boolean {
  const state = task.taskId ? getTaskState(task.root, task.taskId) : undefined;
  const { running, lmsStatus, lastRun } = state ?? {};
  const passed = lmsStatus === "passed" || lmsStatus === "ai-passed";
  const inReview = lmsStatus === "submitted" || lmsStatus === "instructor-pending";
  const resubmit = lmsStatus === "resubmit" && (!lastRun || lastRun.outcome === "passed");
  const taskTitle = `「${task.title}」`;
  if (running) {
    item.text = "$(sync~spin) 確認中…";
    item.tooltip = `${taskTitle}を確認しています`;
    item.command = "stella.showRunLog";
  } else if (passed || inReview || resubmit) {
    const label = passed ? "合格" : TASK_STATUS_LABELS[lmsStatus];
    const icon = passed ? "pass-filled" : inReview ? "clock" : "error";
    item.text = `$(${icon}) ${label}`;
    item.tooltip = `${taskTitle}の LMS での状態は「${label}」です`;
    item.command = { command: "stella.showTaskHelp", title: label, arguments: [task.root] };
  } else if (lastRun) {
    const { outcome, tests } = lastRun;
    const labels = {
      failed: ["$(error) 直すところ", "直すところがあります"],
      error: ["$(warning) 環境の問題", "環境の問題で確認できませんでした"],
      passed: ["$(pass) 確認済み", "確認はすべて通りました"],
    };
    const [text, summary] = labels[outcome];
    const counts = outcome === "error" ? undefined : tests;
    item.text = counts ? `${text} ${counts.passed}/${counts.total}` : text;
    item.tooltip = `${taskTitle}の前回の確認: ${
      counts ? `テスト ${counts.total} 件中 ${counts.passed} 件が通りました` : summary
    }`;
    item.command = {
      command: "stella.showLastResult",
      title: "前回の確認の結果を表示する",
      arguments: [task.root],
    };
  } else {
    item.hide();
    return false;
  }
  item.show();
  return passed || inReview;
}

function render(): void {
  void vscode.commands.executeCommand("setContext", "stella.inTask", inTask);
  if (!stateItem || !submitItem || !readmeItem || !progressItem) return;
  if (!current) {
    stateItem.hide();
    submitItem.hide();
    readmeItem.hide();
    progressItem.hide();
    return;
  }
  submitItem.text = "$(cloud-upload) 提出する";
  submitItem.tooltip = `「${current.title}」を確認して提出します。通らなければ何も送りません`;
  submitItem.command = {
    command: "stella.submitTask",
    title: "提出する",
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
  if (renderState(stateItem, current) || current.problemActionsAvailable === false)
    submitItem.hide();
  else submitItem.show();
  readmeItem.show();
}

/** 課題文のパネルを開いたときなど、課題が分かっているときに知らせる。 */
export function setCurrentTask(task: CurrentTask | undefined): void {
  ++generation;
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
    let problemActionsAvailable: boolean | undefined;
    if (loaded.ok && loaded.manifest.problemSteps) {
      const problems = await loadTaskProblems(root, loaded.manifest);
      if (ticket !== generation) return;
      problemProgress = problems.progress;
      problemActionsAvailable = problems.states.some(({ id }) => !problems.unprepared.has(id));
      notifyProblemTaskOpened(root);
    } else if (loaded.ok && loaded.manifest.problems?.length) {
      notifyProblemTaskOpened(root);
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
    current = {
      root,
      title,
      ...(loaded.ok && !loaded.manifest.problems ? { taskId: loaded.manifest.id } : {}),
      ...(problemProgress ? { problemProgress } : {}),
      ...(problemActionsAvailable === undefined ? {} : { problemActionsAvailable }),
    };
  }
  render();
  await refreshCurrentTask();
}

async function refreshCurrentTask(): Promise<void> {
  if (current?.taskId) await refreshTaskState(current.root, current.taskId);
}

let problemRefresh = 0;

async function refreshProblemActions(afterSave = false): Promise<void> {
  const task = current;
  if (task?.problemActionsAvailable === undefined) return;
  const ticket = generation;
  const request = ++problemRefresh;
  const loaded = await loadTask(task.root);
  if (!loaded.ok || !loaded.manifest.problemSteps || ticket !== generation) return;
  // 保存前に始まった準備で止まっていた場合も、保存した状態で確かめ直す。
  const problems = await loadTaskProblems(task.root, loaded.manifest, {
    afterSubmission: afterSave,
  });
  if (ticket !== generation || request !== problemRefresh) return;
  setCurrentTask({
    ...task,
    problemProgress: problems.progress,
    problemActionsAvailable: problems.states.some(({ id }) => !problems.unprepared.has(id)),
  });
  notifyProblemTaskOpened(task.root);
}

export function registerTaskStatus(context: vscode.ExtensionContext): void {
  submitItem = vscode.window.createStatusBarItem(
    "stella.submitTask",
    vscode.StatusBarAlignment.Left,
    50,
  );
  submitItem.name = "STELLA: 提出する";
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
  stateItem = vscode.window.createStatusBarItem(
    "stella.taskState",
    vscode.StatusBarAlignment.Left,
    51,
  );
  stateItem.name = "STELLA: 課題の状態";
  context.subscriptions.push(
    submitItem,
    readmeItem,
    progressItem,
    stateItem,
    onDidChangeTaskState((root) => {
      if (root === undefined || root === current?.root) render();
    }),
    onDidChangeAuth(() => void refreshCurrentTask()),
    vscode.window.onDidChangeWindowState(({ focused }) => {
      if (focused) void refreshProblemActions().catch(() => undefined);
    }),
    vscode.workspace.onDidSaveTextDocument(({ uri }) => {
      if (current?.problemActionsAvailable !== false || uri.scheme !== "file") return;
      const rel = path.relative(current.root, uri.fsPath);
      if (rel && rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel))
        return refreshProblemActions(true).catch(() => undefined);
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => followEditor(editor)),
    vscode.workspace.onDidChangeWorkspaceFolders(() =>
      followEditor(vscode.window.activeTextEditor),
    ),
    {
      dispose: () => {
        ++generation;
        stateItem = undefined;
        submitItem = undefined;
        readmeItem = undefined;
        progressItem = undefined;
        current = undefined;
        inTask = false;
      },
    },
  );
  void followEditor(vscode.window.activeTextEditor);
}
