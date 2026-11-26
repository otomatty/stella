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
import {
  type CheckProgress,
  checkProgressLabel,
  checkProgressShortLabel,
} from "./task-check-progress.js";
import { problemTaskProgress } from "./task-problems.js";
import {
  activeTaskCheck,
  onDidFinishTaskCheck,
  onDidProgressTaskCheck,
  onDidStartTaskCheck,
} from "./task-run-events.js";
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
  problemTaskCode?: string;
  currentProblem?: { id: string; label: string };
  problemSteps?: true;
  /** 古い配布の書き出しが終わるまで、確認と提出を出さない。 */
  problemActionsAvailable?: boolean;
}

let current: CurrentTask | undefined;
let inTask = false;
let stateItem: vscode.StatusBarItem | undefined;
let submitItem: vscode.StatusBarItem | undefined;
let readmeItem: vscode.StatusBarItem | undefined;
/** 開いているファイルが変わるたびに増やし、古い問い合わせの結果で上書きしない。 */
let generation = 0;
/** `followEditor` が課題を読み込んでいるあいだに保存されたファイル。公開後に問題の状態を取り直す。 */
let filesSavedDuringFollow: string[] | null = null;

function isInside(file: string, dir: string): boolean {
  const rel = path.relative(dir, file);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/** 課題フォルダーを含むワークスペースのフォルダー。学習フォルダーとして配布の基準にする。 */
function trainingRootOf(taskRoot: string): string | undefined {
  return (vscode.workspace.workspaceFolders ?? [])
    .map((folder) => folder.uri.fsPath)
    .find((folder) => isInside(taskRoot, folder));
}

/** ワークスペースの中のファイルから課題フォルダーを探す。外のファイル・課題の外なら null。 */
async function taskRootOfFile(file: string): Promise<string | null> {
  const owner = (vscode.workspace.workspaceFolders ?? [])
    .map((folder) => folder.uri.fsPath)
    .find((root) => isInside(file, root));
  return owner ? findTaskRoot(file, [owner]) : null;
}

function renderCheck(
  item: vscode.StatusBarItem,
  task: CurrentTask,
  progress?: CheckProgress,
): void {
  const shortLabel = progress && checkProgressShortLabel(progress);
  const label = progress && checkProgressLabel(progress);
  item.text = shortLabel ? `$(sync~spin) 確認中 ${shortLabel}` : "$(sync~spin) 確認中…";
  item.tooltip = `「${task.title}」を確認しています${label ? `: ${label}` : ""}`;
  item.command = "stella.showRunLog";
}

function renderState(
  item: vscode.StatusBarItem,
  task: CurrentTask,
  checkProgress?: CheckProgress,
): boolean {
  const state = task.taskId ? getTaskState(task.root, task.taskId) : undefined;
  const { running, lmsStatus, lastRun } = state ?? {};
  const passed = lmsStatus === "passed" || lmsStatus === "ai-passed";
  const inReview = lmsStatus === "submitted" || lmsStatus === "instructor-pending";
  const resubmit = lmsStatus === "resubmit" && (!lastRun || lastRun.outcome === "passed");
  const taskTitle = `「${task.title}」`;
  if (running || checkProgress) {
    renderCheck(item, task, checkProgress);
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

function submitShortcutLabel(): string {
  return process.platform === "darwin" ? "⌘⌥Enter" : "Ctrl+Alt+Enter";
}

function render(): void {
  void vscode.commands.executeCommand(
    "setContext",
    "stella.problemTask",
    inTask && Boolean(current?.problemProgress),
  );
  void vscode.commands.executeCommand("setContext", "stella.inTask", inTask);
  if (!stateItem || !submitItem || !readmeItem) return;
  if (!current) {
    stateItem.hide();
    submitItem.hide();
    readmeItem.hide();
    return;
  }
  const shortcut = submitShortcutLabel();
  submitItem.text = "$(cloud-upload) 提出する";
  submitItem.tooltip = `「${current.title}」を確認して提出します。通らなければ何も送りません (${shortcut})`;
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
  const active = activeTaskCheck();
  const checkProgress = active?.root === current.root ? active.progress : undefined;
  const progress = current.problemProgress;
  if (progress) {
    const { currentProblem } = current;
    const label = [current.problemTaskCode ?? current.title, currentProblem?.label]
      .filter(Boolean)
      .join(" ");
    stateItem.text = `$(star) ${label} ・ 提出 ${progress.passed}/${progress.total}`;
    stateItem.tooltip = `「${current.title}」の進み具合を表示します`;
    readmeItem.text = "$(book) 課題";
    readmeItem.tooltip = `「${current.title}」の進み具合といまやることを表示します`;
    stateItem.command = readmeItem.command = {
      command: "stella.showTaskReadme",
      title: "課題を表示する",
      arguments: [current.root],
    };
    stateItem.show();
    if (checkProgress) {
      renderCheck(submitItem, current, checkProgress);
      submitItem.show();
    } else if (current.problemActionsAvailable === false || !currentProblem) {
      // 解ける問題が無いあいだは出さない。古い deferred の書き出し待ちも出さない。
      submitItem.hide();
    } else {
      submitItem.text = "$(play) 確認して提出";
      submitItem.tooltip = `${currentProblem.label}を確認して提出します (${shortcut})`;
      submitItem.command = {
        command: "stella.submitTask",
        title: "確認して提出",
        arguments: [current.root, currentProblem.id],
      };
      submitItem.show();
    }
  } else if (renderState(stateItem, current, checkProgress)) submitItem.hide();
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
  const savedDuringLoad: string[] = [];
  filesSavedDuringFollow = savedDuringLoad;
  try {
    const root = await taskRootOfFile(uri.fsPath);
    if (ticket !== generation) return;
    inTask = root !== null;
    if (!root) {
      current = undefined;
      render();
      return;
    }
    let publishedProblems = false;
    if (current?.root !== root) {
      const loaded = await loadTask(root);
      if (ticket !== generation) return;
      const title = loaded.ok ? loaded.manifest.title : path.basename(root);
      if (loaded.ok && loaded.manifest.problems?.length) {
        const problems = await loadTaskProblems(root, loaded.manifest, {
          trainingRoot: trainingRootOf(root),
        });
        if (ticket !== generation) return;
        current = {
          root,
          title,
          ...problemTaskProgress(loaded.manifest, problems),
          problemActionsAvailable: !problems.releasePending,
        };
        publishedProblems = true;
        notifyProblemTaskOpened(root);
      } else {
        current = { root, title, ...(loaded.ok ? { taskId: loaded.manifest.id } : {}) };
      }
    }
    render();
    if (
      publishedProblems &&
      savedDuringLoad.some((file) => isInside(file, root)) &&
      current?.root === root
    ) {
      await refreshProblemActions(true);
    }
    if (current?.root === root) await refreshCurrentTask();
  } finally {
    if (filesSavedDuringFollow === savedDuringLoad) filesSavedDuringFollow = null;
  }
}

async function refreshCurrentTask(): Promise<void> {
  if (current?.taskId) await refreshTaskState(current.root, current.taskId);
}

let problemRefresh = 0;

async function refreshProblemActions(afterSave = false): Promise<void> {
  const task = current;
  if (!task?.problemProgress) return;
  const ticket = generation;
  const request = ++problemRefresh;
  const loaded = await loadTask(task.root);
  if (!loaded.ok || !loaded.manifest.problems?.length || ticket !== generation) return;
  // 保存前に始まった準備で止まっていた場合も、保存した状態で確かめ直す。
  const problems = await loadTaskProblems(task.root, loaded.manifest, {
    afterSubmission: afterSave,
    trainingRoot: trainingRootOf(task.root),
  });
  if (ticket !== generation || request !== problemRefresh) return;
  setCurrentTask({
    ...task,
    ...problemTaskProgress(loaded.manifest, problems),
    problemActionsAvailable: !problems.releasePending,
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
  stateItem = vscode.window.createStatusBarItem(
    "stella.taskState",
    vscode.StatusBarAlignment.Left,
    51,
  );
  stateItem.name = "STELLA: 課題の状態";
  const renderTaskCheck = ({ root }: { root: string }) => {
    if (root === current?.root) render();
  };
  context.subscriptions.push(
    submitItem,
    readmeItem,
    stateItem,
    onDidStartTaskCheck(renderTaskCheck),
    onDidProgressTaskCheck(renderTaskCheck),
    onDidFinishTaskCheck(renderTaskCheck),
    onDidChangeTaskState((root) => {
      if (root === undefined || root === current?.root) render();
    }),
    onDidChangeAuth(() => {
      void refreshCurrentTask();
      void refreshProblemActions().catch(() => undefined);
    }),
    vscode.window.onDidChangeWindowState(({ focused }) => {
      if (focused && current?.problemSteps) void refreshProblemActions().catch(() => undefined);
    }),
    vscode.workspace.onDidSaveTextDocument(({ uri }) => {
      if (uri.scheme !== "file") return;
      filesSavedDuringFollow?.push(uri.fsPath);
      if (!current?.problemSteps) return;
      // 書き出し待ちは、いまの問題があっても保存のあとでやり直す。
      if (current.problemActionsAvailable !== false && current.currentProblem) return;
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
        filesSavedDuringFollow = null;
        stateItem = undefined;
        submitItem = undefined;
        readmeItem = undefined;
        current = undefined;
        inTask = false;
      },
    },
  );
  void followEditor(vscode.window.activeTextEditor);
}
