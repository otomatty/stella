/**
 * LMS から課題を受け取り、学習フォルダーに準備して開く (07 §4.4)。
 *
 * - Web の「VS Code で開く」(接続コード付きの task URI) → openDistributedTask
 * - STELLA: 固定した開始点から始める → 前の実装が壊れていて進めないとき (01 §4)
 * - STELLA: 学習フォルダーを選ぶ → 学習フォルダーの場所を変える
 *
 * 学習フォルダーはウィンドウの唯一のフォルダーとして開く。ワークスペースへフォルダーを
 * 足すと無題のマルチルートになるため。フォルダーを開くと、ウィンドウが読み込み直される
 * (拡張も起動し直す) か、学習フォルダーをすでに開いている別のウィンドウへ切り替わる。
 * どちらでも課題文を開けるよう、開く課題を控え (pending-task-open.ts)、学習フォルダーの
 * ウィンドウが起動したとき・前面に来たときに受け取る。このウィンドウが学習フォルダーだけを
 * 開いていれば、読み込み直さずにそのまま課題文を開く。
 */

import { lstat } from "node:fs/promises";
import path from "node:path";
import type { TaskBundle, TaskBundleResponse } from "@stella/shared/tasks/catalog";
import * as vscode from "vscode";
import { apiRequest } from "./api.js";
import { savePendingTaskOpen, takePendingTaskOpen } from "./pending-task-open.js";
import { findTaskRoot, loadTask } from "./runner/run-task.js";
import { installTask, TaskInstallConflict, type TaskVariant } from "./task-distribution.js";
import { readDistribution } from "./task-submission.js";
import { resolveTrainingRoot, samePath } from "./training-folder.js";

type StateStore = Pick<vscode.Memento, "get" | "update">;

/** 課題を開く処理が使う保存先。学習フォルダーの場所は globalState、開く課題の控えはファイル。 */
interface TaskOpenStore {
  state: StateStore;
  /** 開く課題の控えを置くフォルダー (globalStorageUri。全ウィンドウで共有)。 */
  pendingDir: string;
}

type TaskOpenContext = Pick<vscode.ExtensionContext, "globalState" | "globalStorageUri">;

function storeOf(context: TaskOpenContext): TaskOpenStore {
  return { state: context.globalState, pendingDir: context.globalStorageUri.fsPath };
}

let output: vscode.OutputChannel | undefined;
function preparationLog(): vscode.OutputChannel {
  output ??= vscode.window.createOutputChannel("STELLA 課題の準備");
  return output;
}

function isInside(dir: string, target: string): boolean {
  const rel = path.relative(dir, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * このウィンドウが学習フォルダーだけを開いているか。祖先 (ホームなど)・講座のフォルダー・
 * 学習フォルダーを含むマルチルートは違う — 学習フォルダーを唯一のフォルダーにするため。
 */
export async function windowIsTrainingRoot(
  folders: readonly string[],
  trainingRoot: string,
): Promise<boolean> {
  return folders.length === 1 && (await samePath(folders[0], trainingRoot));
}

function workspaceFolders(): string[] {
  return (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);
}

async function isPlainFile(file: string): Promise<boolean> {
  try {
    return (await lstat(file)).isFile();
  } catch {
    return false;
  }
}

async function showTaskReadme(taskRoot: string): Promise<void> {
  const readme = vscode.Uri.file(path.join(taskRoot, "README.md"));
  if (!(await isPlainFile(readme.fsPath))) {
    // 課題文が消えた・壊れた課題フォルダー (「今のフォルダーを開く」から来る) は、
    // 開けない README の代わりに課題フォルダーをエクスプローラーで示す。
    await vscode.commands.executeCommand("revealInExplorer", vscode.Uri.file(taskRoot)).then(
      () => undefined,
      () => undefined,
    );
    void vscode.window.showInformationMessage(
      `課題文 (README.md) が見つからないため、課題フォルダーを表示しました: ${taskRoot}`,
    );
    return;
  }
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(readme));
  // OS 別のブロックをタブで読めるよう、課題文のパネルも開く (いま開いた README から課題を探す)。
  await vscode.commands.executeCommand("stella.showTaskReadme").then(
    () => undefined,
    () => undefined,
  );
  // エクスプローラーでも課題フォルダーの場所が分かるようにする (失敗しても課題は開けている)。
  await vscode.commands.executeCommand("revealInExplorer", readme).then(
    () => undefined,
    () => undefined,
  );
}

/**
 * 課題文を開く。このウィンドウが学習フォルダーだけを開いていれば、そのまま開く。
 * それ以外は学習フォルダーを開く (読み込み直したウィンドウか、切り替わった先の学習フォルダーの
 * ウィンドウで resumePendingTaskOpen が課題文を開く)。
 */
async function openTaskInWindow(
  store: TaskOpenStore,
  trainingRoot: string,
  taskRoot: string,
): Promise<void> {
  const folders = workspaceFolders();
  if (await windowIsTrainingRoot(folders, trainingRoot)) {
    await showTaskReadme(taskRoot);
    return;
  }
  let forceNewWindow = false;
  if (folders.length > 0 || vscode.workspace.workspaceFile) {
    const here = "このウィンドウで開く";
    const other = "新しいウィンドウで開く";
    const choice = await vscode.window.showInformationMessage(
      "課題を準備しました。学習フォルダーを開いて課題文を表示します",
      {
        modal: true,
        detail: `学習フォルダー: ${trainingRoot}\n課題フォルダー: ${taskRoot}\n\nこのウィンドウで開くと、いま開いているフォルダーは閉じます。`,
      },
      here,
      other,
    );
    if (!choice) return;
    forceNewWindow = choice === other;
  }
  // 控えは openFolder より前に書き終える。切り替わった先のウィンドウがすぐ読めるように。
  await savePendingTaskOpen(store.pendingDir, { trainingRoot, taskRoot });
  await vscode.commands.executeCommand(
    "vscode.openFolder",
    vscode.Uri.file(trainingRoot),
    forceNewWindow ? { forceNewWindow: true } : { forceReuseWindow: true },
  );
}

/**
 * このウィンドウが控えた課題の学習フォルダーだけを開いていれば、受け取って課題文を開く。
 * 拡張の起動時 (読み込み直したウィンドウ) と、ウィンドウが前面に来たとき (すでに学習
 * フォルダーを開いていたウィンドウへ切り替わったとき) に呼ぶ。別のウィンドウ向けの控えは残す。
 */
export async function resumePendingTaskOpen(pendingDir: string): Promise<void> {
  const folders = workspaceFolders();
  if (folders.length !== 1) return;
  const pending = await takePendingTaskOpen(pendingDir, (p) =>
    windowIsTrainingRoot(folders, p.trainingRoot),
  );
  if (pending) await showTaskReadme(pending.taskRoot);
}

const CONFLICT_GUIDANCE: Record<TaskInstallConflict["reason"], string> = {
  occupied:
    "準備先のファイルを別の場所へ移すか、フォルダーの名前を変えてから、もう一度「VS Code で開く」を押してください。",
  updated:
    "今の課題フォルダーは前の版のまま開いて、続きの作業と提出ができます。新しい版で始めるときは、課題フォルダーの名前を変えてから開き直してください。",
  damaged:
    "足りないファイルは自動では戻しません。課題フォルダーの名前を変えてから開き直すと、新しく準備します。自分のファイルは名前を変えたフォルダーに残ります。",
};

/** 上書きせずに止めた準備の、準備先と衝突したファイルを示す (04 §6)。 */
async function showConflict(
  store: TaskOpenStore,
  trainingRoot: string,
  conflict: TaskInstallConflict,
): Promise<void> {
  const log = preparationLog();
  log.appendLine(`[${new Date().toLocaleString()}] 課題を準備できませんでした (上書きしません)`);
  log.appendLine(`理由: ${conflict.summary}`);
  log.appendLine(`準備先: ${conflict.target}`);
  log.appendLine(`衝突したファイル (${conflict.files.length} 件):`);
  for (const file of conflict.files) log.appendLine(`  - ${file}`);
  log.appendLine(CONFLICT_GUIDANCE[conflict.reason]);
  log.appendLine("");
  const shown = conflict.files.slice(0, 10).map((file) => `・${file}`);
  if (conflict.files.length > shown.length)
    shown.push(`ほか ${conflict.files.length - shown.length} 件 (一覧は出力パネル)`);
  const openExisting = "今のフォルダーを開く";
  const showList = "一覧を表示";
  const reveal = "準備先を表示";
  const actions =
    conflict.reason === "occupied" ? [showList, reveal] : [openExisting, showList, reveal];
  const choice = await vscode.window.showWarningMessage(
    `${conflict.summary}。学習者のファイルは上書きしません`,
    {
      modal: true,
      detail: [
        `準備先: ${conflict.target}`,
        ...(shown.length > 0 ? ["衝突したファイル:", ...shown] : []),
        "",
        CONFLICT_GUIDANCE[conflict.reason],
      ].join("\n"),
    },
    ...actions,
  );
  if (choice === openExisting) await openTaskInWindow(store, trainingRoot, conflict.target);
  else if (choice === showList) log.show(true);
  else if (choice === reveal)
    await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(conflict.target));
}

async function prepareAndOpen(
  store: TaskOpenStore,
  bundle: TaskBundle,
  variant: TaskVariant,
): Promise<void> {
  const trainingRoot = await resolveTrainingRoot(store.state);
  if (!trainingRoot) return;
  let taskRoot: string;
  try {
    taskRoot = await installTask(trainingRoot, bundle, { variant });
  } catch (error) {
    if (error instanceof TaskInstallConflict) {
      await showConflict(store, trainingRoot, error);
      return;
    }
    throw error;
  }
  await openTaskInWindow(store, trainingRoot, taskRoot);
}

function bundleUrl(taskId: string): string {
  return `/api/tasks/bundle?${new URLSearchParams({ taskId })}`;
}

/** Web の「VS Code で開く」から来た課題を準備して開く。 */
export async function openDistributedTask(context: TaskOpenContext, taskId: string): Promise<void> {
  const { bundle } = await apiRequest<TaskBundleResponse>(bundleUrl(taskId));
  if (bundle.manifest.id !== taskId) throw new Error("配布する課題の ID が一致しません");
  await prepareAndOpen(storeOf(context), bundle, "standard");
}

/** 開いているファイルの課題フォルダーから、LMS の課題 ID を引く (ワークスペースの中だけ)。 */
async function activeTaskId(): Promise<string | undefined> {
  const active = vscode.window.activeTextEditor?.document.uri;
  if (active?.scheme !== "file") return undefined;
  const owner = workspaceFolders().find((folder) => isInside(folder, active.fsPath));
  if (!owner) return undefined;
  const root = await findTaskRoot(active.fsPath, [owner]);
  if (!root) return undefined;
  const receipt = await readDistribution(root).catch(() => undefined);
  if (receipt) return receipt.taskId;
  const loaded = await loadTask(root);
  return loaded.ok ? loaded.manifest.id : undefined;
}

/**
 * 前の課題の実装が壊れていて、この課題を始められないときに、固定した開始点を配る。
 * 今の課題フォルダーは変えず、隣の `<課題>-fixed-start/` に準備する。使ったことは
 * LMS と `.stella/support.json` に記録され、提出は「支援付き」になる。
 */
async function startFromFixedStart(store: TaskOpenStore): Promise<void> {
  const taskId = await activeTaskId();
  if (!taskId) {
    void vscode.window.showInformationMessage(
      "固定した開始点を使う課題のファイル (課題文など) を開いてから実行してください",
    );
    return;
  }
  const { fixedStart } = await apiRequest<TaskBundleResponse>(bundleUrl(taskId));
  if (!fixedStart) {
    void vscode.window.showInformationMessage(
      "この課題には固定した開始点がありません。進められないときは「STELLA: 講師に相談する」を使ってください",
    );
    return;
  }
  const use = "固定した開始点を使う";
  const choice = await vscode.window.showWarningMessage(
    "固定した開始点から始めますか",
    {
      modal: true,
      detail: [
        "前の課題の実装が壊れていて、この課題を始められないときに使います。",
        "・前の課題まで動く状態のファイルを、別のフォルダー (<課題>-fixed-start) に準備します。今の課題フォルダーは変えません。",
        "・使ったことは記録され、この課題の提出は「支援付き」になります。罰ではなく、学習の記録です。",
      ].join("\n"),
    },
    use,
  );
  if (choice !== use) return;
  const { bundle } = await apiRequest<{ bundle: TaskBundle }>("/api/tasks/fixed-start", {
    method: "POST",
    body: { taskId },
  });
  if (bundle.manifest.id !== taskId) throw new Error("配布する課題の ID が一致しません");
  await prepareAndOpen(store, bundle, "fixed-start");
}

async function reportErrors(work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch (error) {
    void vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}

/** 受け取りはウィンドウの中で 1 つずつ行う (前面に来るたびに呼ばれても重ならない)。 */
let resuming: Promise<void> = Promise.resolve();
function scheduleResume(pendingDir: string): void {
  resuming = resuming.then(() => reportErrors(() => resumePendingTaskOpen(pendingDir)));
}
/** 予約した受け取りが終わるまで待つ (テスト用)。 */
export function settledTaskOpening(): Promise<void> {
  return resuming;
}

export function registerTaskOpening(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    preparationLog(),
    vscode.commands.registerCommand("stella.chooseTrainingFolder", () =>
      reportErrors(async () => {
        const root = await resolveTrainingRoot(context.globalState, { ask: true });
        if (root)
          void vscode.window.showInformationMessage(
            `学習フォルダーを ${root} にしました。次に開く課題から、この中に準備します`,
          );
      }),
    ),
    vscode.commands.registerCommand("stella.startFromFixedStart", () =>
      reportErrors(() => startFromFixedStart(storeOf(context))),
    ),
    // 学習フォルダーをすでに開いていたウィンドウは読み込み直されず、前面に来るだけ。
    vscode.window.onDidChangeWindowState((windowState) => {
      if (windowState.focused) scheduleResume(storeOf(context).pendingDir);
    }),
  );
  scheduleResume(storeOf(context).pendingDir);
}
