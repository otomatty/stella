/**
 * 新形式の課題 (`.stella/task.json`) を手元で確かめるコマンド。
 *
 * - STELLA: 課題を確認する   … 開いているファイルの課題フォルダーで runner を実行する
 * - STELLA: 開発環境を診断する … Node.js・npm・Git の版を確かめる
 * - STELLA: 実行ログを表示する … 道具の出力をそのまま見る
 * - STELLA: 課題文を表示する   … README.md を OS のタブ付きで読み、先頭の「進め方」に
 *                               編集するファイルを開くリンクと課題の状態を出す
 *
 * 課題文のパネル・ステータスバー・エディターの右上のボタンからは、課題フォルダー (または
 * そのファイル) を引数で受け取る。受け取った場所は、ワークスペースの中の課題フォルダーか
 * 改めて確かめてから使う (`requestedTaskRoot`)。
 *
 * 外部プロセスを起動するので、信頼したフォルダー (Workspace Trust) でだけ実行する。
 */

import { homedir } from "node:os";
import path from "node:path";
import { type CiRunClaim, deployUrlProblem, runUrlProblem } from "@stella/shared/tasks/ci-run";
import type { TaskManifest } from "@stella/shared/tasks/manifest";
import {
  canSubmit,
  type RunOutcome,
  type RunResult,
  type TestCaseResult,
} from "@stella/shared/tasks/run-result";
import { CONSULT_SUPPORT_DETAIL } from "@stella/shared/tasks/support-record";
import { problemFiles } from "@stella/shared/tasks/problems";
import { RUNNERS } from "@stella/shared/tasks/runners";
import * as vscode from "vscode";
import { apiSession } from "./api.js";
import { AuthSessionChanged, type AuthStore, onDidChangeAuthSession } from "./auth.js";
import { type CatalogLesson, getCachedCatalog } from "./catalog.js";
import { stellaUrl } from "./config.js";
import { findTestLine } from "./find-test-line.js";
import { sendLocalRunReport } from "./local-run-report.js";
import {
  findTaskRoot,
  type LoadedTask,
  loadTask,
  runTask,
  saveRunResult,
} from "./runner/run-task.js";
import { isRunResult, type SupportEvent } from "@stella/shared/tasks/submission";
import { readFileInRoot, resolveFileInRoot, writeStateFile } from "./runner/files.js";
import type { CiRunInput } from "./runner/steps.js";
import {
  prepareLocalTaskSubmission,
  readDistribution,
  readRecordedSupport,
  readSubmissionNotes,
  sendTaskSubmission,
  SUBMIT_AGAIN,
} from "./task-submission.js";
import { readTestSource, resolveDiagnosticFile } from "./task-diagnostics.js";
import { readLastResult, resolveEditFiles } from "./task-guide.js";
import {
  onTaskReadmeVisible,
  showTaskPanel,
  showTaskReadme,
  taskReadmeRoot,
} from "./task-panel.js";
import {
  chooseProblem,
  nextUnsubmittedProblem,
  prepareProblemSubmission,
  problemCountLabel,
  problemForPath,
  problemForTestPath,
  problemTaskProgress,
  problemToWorkOn,
  readProblemRun,
  sendProblemConsultation,
  sendProblemSubmission,
  type ProblemState,
  type ProblemSubmitResponse,
  type TaskProblems,
} from "./task-problems.js";
import { loadTaskProblems } from "./task-update-guard.js";
import { finishTaskCheck, startTaskCheck } from "./task-run-events.js";
import {
  getTaskState,
  notifyProblemTaskOpened,
  refreshTaskState,
  registerTaskState,
} from "./task-state.js";
import { setCurrentTask } from "./task-status.js";
import { registerSubmissionForms, showSubmissionForm } from "./submission-form.js";
import type { SubmissionDraft } from "./submission-form-view.js";
import { refreshLearningSidebar } from "./tree.js";

let running = false;
let submitting = false;
const OPEN_SUBMISSION_WEB = "Web で開く";
export { helpUrl } from "./task-state.js";

function findSubmissionLesson(
  lessons: readonly CatalogLesson[],
  taskId: string,
  problemId?: string,
): CatalogLesson | undefined {
  if (problemId !== undefined) {
    const problemLessons = lessons.filter((lesson) => lesson.problem?.taskId === taskId);
    const problemLesson =
      problemLessons.find((lesson) => lesson.problem?.id === problemId) ?? problemLessons[0];
    if (problemLesson) return problemLesson;
  }
  return lessons.find((lesson) => lesson.task?.id === taskId);
}

function submissionWebUrl(taskId: string, problemId?: string): string {
  // レッスン ID は課題一覧の応答から作ったカタログにあり、配布記録には含まれない。
  const lessons = getCachedCatalog().flatMap((stage) =>
    stage.sections.flatMap((section) => section.lessons),
  );
  const lesson = findSubmissionLesson(lessons, taskId, problemId);
  return `${stellaUrl("webUrl")}${
    lesson?.stageId && lesson.id
      ? `/stages/${encodeURIComponent(lesson.stageId)}/lessons/${encodeURIComponent(lesson.id)}`
      : "/"
  }`;
}

export function workspaceRoots(): string[] {
  return (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);
}

export function isInside(file: string, dir: string): boolean {
  const rel = path.relative(dir, file);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/** 課題フォルダーを含むワークスペースのフォルダー。学習フォルダーとして配布の基準にする。 */
function trainingRootOf(taskRoot: string): string | undefined {
  return workspaceRoots().find((folder) => isInside(taskRoot, folder));
}

/**
 * 開いているファイル、なければワークスペースのフォルダーから課題フォルダーを探す。
 * 探すのはワークスペースのフォルダーの中だけ。外のファイルを開いていても、その親を
 * たどらない — 信頼したのはワークスペースのフォルダーで、外の課題ではないため。
 */
export async function locateTask(): Promise<string | null> {
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

/** ワークスペースの中のファイル (またはフォルダー) から、課題フォルダーを探す。外なら null。 */
export async function taskRootOf(fsPath: string): Promise<string | null> {
  const owner = workspaceRoots().find((root) => isInside(fsPath, root));
  return owner ? findTaskRoot(fsPath, [owner]) : null;
}

function isFileUri(value: unknown): value is { scheme: "file"; fsPath: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { scheme?: unknown }).scheme === "file" &&
    typeof (value as { fsPath?: unknown }).fsPath === "string"
  );
}

/** 課題フォルダーからの `/` 区切りの相対パス。外なら undefined。 */
function relativeInRoot(root: string, fsPath: string): string | undefined {
  if (!isInside(fsPath, root)) return undefined;
  const rel = path.relative(root, fsPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return undefined;
  return rel.split(path.sep).join("/");
}

/**
 * 確認・提出する問題のファイル。引数がファイルならそれ、無ければ開いているファイル。
 * 課題フォルダーそのものを渡されたときは、開いているファイルを見る。
 */
function requestedProblemPath(root: string, requested: unknown): string | undefined {
  if (isFileUri(requested)) return relativeInRoot(root, requested.fsPath);
  const active = vscode.window.activeTextEditor?.document.uri;
  if (active?.scheme === "file") return relativeInRoot(root, active.fsPath);
  return undefined;
}

/**
 * コマンドの引数から課題フォルダーを決める。引数が無ければ開いているファイルから探す。
 * 課題文のパネルとステータスバーは課題フォルダーのパス、エディターの右上のボタンは
 * 開いているファイルの URI を渡す。どちらも、ワークスペースの中の課題フォルダーに当たる
 * ときだけ使う (課題フォルダーそのものを渡されたら、上の課題へは登らない)。
 */
export async function requestedTaskRoot(requested: unknown): Promise<string | null> {
  if (typeof requested === "string") {
    const root = path.resolve(requested);
    return (await taskRootOf(root)) === root ? root : null;
  }
  if (isFileUri(requested)) return taskRootOf(requested.fsPath);
  return locateTask();
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

function dirtyTaskDocuments(root: string): vscode.TextDocument[] {
  return vscode.workspace.textDocuments.filter(
    (doc) => doc.isDirty && doc.uri.scheme === "file" && isInside(doc.uri.fsPath, root),
  );
}

/** 保存していない変更があれば、保存してから確かめるか尋ねる。 */
async function confirmUnsaved(
  dirty: readonly vscode.TextDocument[],
  forSubmission = false,
): Promise<boolean> {
  if (dirty.length === 0) return true;
  const action = forSubmission ? "提出" : "確認";
  const save = `保存して${action}する`;
  const asIs = "保存せずに確認する";
  const choice = await vscode.window.showWarningMessage(
    `保存していないファイルが ${dirty.length} 件あります。${action}するのは保存した内容です。`,
    save,
    ...(forSubmission ? [] : [asIs]),
  );
  if (choice === save) {
    for (const doc of dirty) {
      // 読み取り専用・保存時の処理の失敗・競合の取り消しでは false が返る。そのまま
      // 確かめると、エディターと違うディスクの内容で結果を残してしまう。
      if (!(await doc.save())) {
        void vscode.window.showWarningMessage(
          `${path.basename(doc.uri.fsPath)} を保存できなかったため、${action}をやめました。保存してからもう一度実行してください`,
        );
        return false;
      }
    }
    return true;
  }
  return !forSubmission && choice === asIs;
}

async function runWithProgress<T>(
  output: vscode.OutputChannel,
  title: string,
  work: (signal: AbortSignal, log: (text: string) => void) => Promise<T>,
): Promise<T | undefined> {
  output.clear();
  output.appendLine(`[${new Date().toLocaleString()}] ${title}`);
  try {
    return await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title, cancellable: true },
      async (_progress, token) => {
        const controller = new AbortController();
        token.onCancellationRequested(() => controller.abort());
        return work(controller.signal, (text) => output.append(text));
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(message);
    void vscode.window.showErrorMessage(`確認を実行できませんでした: ${message}`);
  }
}

function notify(outcome: RunOutcome, output: vscode.OutputChannel, forSubmission = false): void {
  const submissionNotice = forSubmission ? "まだ提出していません。" : "";
  if (outcome === "cancelled") {
    void vscode.window.showInformationMessage("確認を中断しました");
  } else if (outcome === "passed") {
    if (!forSubmission) void vscode.window.showInformationMessage("手元の確認がすべて通りました");
  } else if (outcome === "failed") {
    void vscode.window.showWarningMessage(
      `直すところがあります。${submissionNotice}結果のパネルを確認してください`,
    );
  } else {
    const show = "ログを表示";
    void vscode.window
      .showErrorMessage(
        `環境の問題で確認できませんでした。${submissionNotice}結果のパネルを確認してください`,
        show,
      )
      .then((choice) => {
        if (choice === show) output.show(true);
      });
  }
}

/** 前回の確認で控えた CI の申告 (同じ課題のときだけ)。読めなければ undefined。 */
async function previousCiClaim(root: string, taskId: string): Promise<CiRunClaim | undefined> {
  try {
    const raw: unknown = JSON.parse(
      new TextDecoder().decode(await readFileInRoot(root, ".stella/last-run.json", 1024 * 1024)),
    );
    return isRunResult(raw) && raw.taskId === taskId ? raw.ci : undefined;
  } catch {
    return undefined;
  }
}

/**
 * CI と公開の課題で、GitHub Actions の実行の URL と公開先の URL を尋ねる (07 §5.5)。
 * 形だけを確かめ、GitHub には問い合わせない。前回の確認で控えた URL を初期値にする。
 * 取り消したら undefined (確認しない)。
 */
async function askCiRun(root: string, manifest: TaskManifest): Promise<CiRunInput | undefined> {
  const previous = await previousCiClaim(root, manifest.id);
  const runUrl = await vscode.window.showInputBox({
    title: "CI の実行 (1/2)",
    prompt:
      "push したあとの GitHub Actions の実行の画面の URL。実行が成功してから入力してください (LMS が提出のときに GitHub で確かめます)",
    placeHolder: "https://github.com/<owner>/<repo>/actions/runs/<番号>",
    value: previous?.runUrl ?? "",
    ignoreFocusOut: true,
    validateInput: (value) => runUrlProblem(value.trim()) ?? undefined,
  });
  if (runUrl === undefined) return undefined;
  const deployUrl = await vscode.window.showInputBox({
    title: "公開先 (2/2)",
    prompt: "公開したページの URL (https://…)",
    placeHolder: "https://<公開先のドメイン>/",
    value: previous?.deployUrl ?? "",
    ignoreFocusOut: true,
    validateInput: (value) => deployUrlProblem(value.trim()) ?? undefined,
  });
  if (deployUrl === undefined) return undefined;
  return { runUrl: runUrl.trim(), deployUrl: deployUrl.trim() };
}

async function runTaskCommand(
  output: vscode.OutputChannel,
  requested?: unknown,
  requestedProblem?: unknown,
): Promise<void> {
  if (running || submitting) {
    void vscode.window.showInformationMessage("いま確認しています。終わるまで待ってください");
    return;
  }
  running = true;
  try {
    const root = await requestedTaskRoot(requested);
    if (!root) {
      void vscode.window.showInformationMessage(
        "課題フォルダーのファイルを開いてから実行してください (.stella/task.json がある課題フォルダー)",
      );
      return;
    }
    const loaded = await loadTask(root);
    if (!loaded.ok) {
      showTaskPanel({ kind: "invalid", root, errors: loaded.errors });
      return;
    }
    await checkTask(output, loaded, {
      requested,
      ...(loaded.manifest.problemSteps ? { requestedProblem } : {}),
    });
  } finally {
    running = false;
  }
}

interface ProblemSelection {
  id: string;
  snapshot: TaskProblems;
}

async function selectTaskProblem(
  root: string,
  manifest: TaskManifest,
  openPath: string | undefined,
  requestedProblem?: unknown,
  forSubmission = false,
): Promise<ProblemSelection | undefined> {
  if (
    requestedProblem !== undefined &&
    !manifest.problems?.some((problem) => problem.id === requestedProblem)
  )
    throw new Error("提出する問題がありません");
  if (!manifest.problems?.length) return undefined;
  const snapshot = await loadTaskProblems(root, manifest, {
    trainingRoot: trainingRootOf(root),
  });
  const { states, blocked, releasePending, releaseError } = snapshot;
  if (manifest.problemSteps && releasePending) {
    throw new Error(
      releaseError ?? "残りの問題のファイルを書き出してから、もう一度実行してください",
    );
  }
  const chosen =
    requestedProblem === undefined
      ? chooseProblem(states, openPath, manifest)
      : states.find((state) => state.id === requestedProblem);
  if (requestedProblem !== undefined && !chosen) throw new Error("提出する問題がありません");
  if (forSubmission && manifest.problemSteps && chosen) {
    const reason = blocked.get(chosen.id);
    if (reason) throw new Error(reason);
  }
  return chosen ? { id: chosen.id, snapshot } : undefined;
}

async function checkTask(
  output: vscode.OutputChannel,
  loaded: Extract<LoadedTask, { ok: true }>,
  options: {
    requested?: unknown;
    requestedProblem?: unknown;
    openPath?: string;
    forSubmission?: boolean;
    selection?: ProblemSelection;
  },
): Promise<
  { result: RunResult; manifest: TaskManifest; selection?: ProblemSelection } | undefined
> {
  let { root, manifest, manifestSha256 } = loaded;
  let { selection } = options;
  // HTML の確認は拡張の中でファイルを読むだけなので、信頼していないフォルダーでも動かす。
  if (manifest.runner !== "static-preview" && !(await requireTrust())) return;
  const dirty = dirtyTaskDocuments(root);
  if (!(await confirmUnsaved(dirty, options.forSubmission))) return;
  if (options.forSubmission && dirty.length > 0) {
    // 保存した task.json で確認する。HTML から外部プロセスを使う課題に変わった場合も信頼を確かめる。
    const current = await loadTask(root);
    if (!current.ok) throw new Error(current.errors.join("\n"));
    if (
      manifest.runner === "static-preview" &&
      current.manifest.runner !== "static-preview" &&
      !(await requireTrust())
    )
      return;
    if (manifestSha256 !== current.manifestSha256) selection = undefined;
    ({ manifest, manifestSha256 } = current);
  }
  // CI と公開の課題は、手元では GitHub の実行の URL と公開先を控え、コミットを確かめるだけ。
  let ci: CiRunInput | undefined;
  if (manifest.runner === "ci-deploy") {
    ci = await askCiRun(root, manifest);
    if (!ci) return;
  }
  const title = options.forSubmission ? "提出の前に確認しています" : "課題を確認しています";
  return runWithProgress(output, `${title}: ${manifest.title}`, async (signal, log) => {
    // 配布記録が壊れていても手元の確認は続ける (提出時の prepareTaskSubmission で改めて検証する)。
    const receipt = await readDistribution(root).catch((error: unknown) => {
      output.appendLine(
        `配布記録を読めませんでした: ${error instanceof Error ? error.message : String(error)}`,
      );
      return undefined;
    });
    selection ??= await selectTaskProblem(
      root,
      manifest,
      options.forSubmission ? options.openPath : requestedProblemPath(root, options.requested),
      options.requestedProblem,
      options.forSubmission,
    );
    const problem = selection?.id;
    const startedAt = Date.now();
    startTaskCheck({ root, taskId: manifest.id, ...(problem ? { problemId: problem } : {}) });
    const result = await runTask({
      root,
      manifest,
      manifestSha256,
      signal,
      log,
      ci,
      ...(problem ? { problem } : {}),
    }).catch((error: unknown) => {
      finishTaskCheck({
        root,
        manifest,
        saved: false,
        result: {
          schemaVersion: 1,
          taskId: manifest.id,
          runner: manifest.runner,
          outcome: signal.aborted ? "cancelled" : "error",
          startedAt: new Date(startedAt).toISOString(),
          durationMs: Date.now() - startedAt,
          platform: process.platform,
          toolVersions: {},
          steps: [],
          files: [],
          protected: [],
          manifestSha256,
          ...(problem ? { problemId: problem } : {}),
        },
      });
      throw error;
    });
    if (receipt?.taskId === manifest.id) result.taskContentHash = receipt.contentHash;
    // 中断した実行は何も確かめていないので、前回の結果を上書きしない。
    if (result.outcome !== "cancelled") {
      try {
        await saveRunResult(root, result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        finishTaskCheck({ root, manifest, result, saved: false });
        output.appendLine(`結果を保存できませんでした: ${message}`);
        void vscode.window.showWarningMessage(
          `確認の結果を .stella/last-run.json に保存できませんでした: ${message}`,
        );
        return;
      }
    }
    finishTaskCheck({ root, manifest, result, saved: result.outcome !== "cancelled" });
    const panel = { kind: "result" as const, manifest, result, root };
    const snapshot = selection?.snapshot;
    const showProblemGuide =
      options.forSubmission &&
      snapshot &&
      (result.outcome === "failed" || result.outcome === "error") &&
      problemToWorkOn(snapshot.states)?.id === problem;
    if (showProblemGuide) {
      const active = vscode.window.activeTextEditor?.document.uri;
      const reveal =
        taskReadmeRoot() === root ||
        !active ||
        (active.scheme === "file" && (await taskRootOf(active.fsPath)) === root);
      if (reveal)
        await renderTaskReadme(root, {}, {}, snapshot, result).catch(() => showTaskPanel(panel));
    } else if (
      !options.forSubmission ||
      result.outcome === "failed" ||
      result.outcome === "error"
    ) {
      showTaskPanel(panel);
    } else if (canSubmit(result)) {
      showTaskPanel(panel, { reveal: false });
    }
    notify(result.outcome, output, options.forSubmission);
    // 課題文のパネルを開いていれば、「いまやること」を新しい結果で描き直す (前面には出さない)。
    if (
      !showProblemGuide &&
      !(selection && options.forSubmission && canSubmit(result)) &&
      result.outcome !== "cancelled" &&
      taskReadmeRoot() === root
    )
      void renderTaskReadme(root, { reveal: false }).catch(() => undefined);
    // 合格も失敗も、回数を数えるための要約だけを送る (#38)。コード・ファイル名・メッセージ・
    // ログは送らない。配布記録のない見本や中断した実行は送らない。失敗は合格と別の道に送る
    // (旧 API は local-result の本文を見ずに合格として扱うため)。
    // 確認・提出を待たせないよう、報告の完了は待たない。
    void sendLocalRunReport(result, receipt?.taskId === manifest.id ? receipt : undefined).catch(
      (err: unknown) => {
        output.appendLine(
          `手元の確認の結果を LMS に反映できませんでした: ${err instanceof Error ? err.message : String(err)}`,
        );
      },
    );
    return { result, manifest, selection };
  });
}

async function diagnoseCommand(output: vscode.OutputChannel): Promise<void> {
  if (running || submitting) {
    void vscode.window.showInformationMessage("いま確認しています。終わるまで待ってください");
    return;
  }
  running = true;
  try {
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
  } finally {
    running = false;
  }
}

const SUBMISSION_SESSION_CHANGED =
  "LMS への接続が変わったため、提出をやめました。もう一度「提出する」を押してください";

async function submitTaskCommand(
  output: vscode.OutputChannel,
  mode: "submit" | "consult",
  requestedRoot?: unknown,
  requestedProblem?: unknown,
): Promise<void> {
  if (mode === "submit" && (running || submitting)) {
    void vscode.window.showInformationMessage("いま確認しています。終わるまで待ってください");
    return;
  }
  if (submitting) return;
  submitting = true;
  try {
    const session = apiSession();
    const root =
      mode === "submit"
        ? await requestedTaskRoot(requestedRoot)
        : typeof requestedRoot === "string"
          ? requestedRoot
          : await locateTask();
    if (!root || !workspaceRoots().some((owner) => isInside(root, owner)))
      throw new Error("ワークスペース内の課題フォルダーを開いてください");
    if (mode === "consult" && dirtyTaskDocuments(root).length > 0)
      throw new Error("保存していない変更があります。保存してもう一度確認してください");
    const loaded = await loadTask(root);
    if (!loaded.ok) throw new Error(loaded.errors.join("\n"));
    let { manifest } = loaded;
    let problem: ProblemState | undefined;
    let resubmitTaskId: string | undefined;
    if (mode === "submit") {
      const openPath = requestedProblemPath(root, requestedRoot);
      let selection = await selectTaskProblem(root, manifest, openPath, requestedProblem, true);
      if (manifest.problems?.length && !selection) throw new Error("提出する問題がありません");
      const plan = RUNNERS[manifest.runner].plan;
      const previous =
        plan === "git" || plan === "ci" || dirtyTaskDocuments(root).length > 0
          ? undefined
          : await (selection
              ? prepareProblemSubmission(root, selection.id, [])
              : prepareLocalTaskSubmission(loaded, "submit")
            ).catch(() => undefined);
      let problemId = previous?.localResult.problemId;
      if (
        !previous?.localResult.taskContentHash ||
        previous.localResult.taskContentHash !== previous.contentHash ||
        dirtyTaskDocuments(root).length > 0
      ) {
        const checked = await checkTask(output, loaded, {
          forSubmission: true,
          openPath,
          requestedProblem,
          selection,
        });
        if (!checked || !canSubmit(checked.result)) return;
        ({ manifest, selection } = checked);
        problemId = checked.result.problemId;
      }
      if (selection) {
        if (problemId !== selection.id)
          throw new Error(`確認した問題が一致しません。${SUBMIT_AGAIN}`);
        if (dirtyTaskDocuments(root).length > 0)
          throw new Error(`保存していない変更があります。${SUBMIT_AGAIN}`);
        await submitProblemTask(root, manifest, problemId, selection.snapshot, session);
        return;
      }
    } else {
      let result: unknown;
      if (manifest.problems?.length) {
        const openPath = requestedProblemPath(root, undefined);
        if (manifest.problemSteps) {
          const selection = await selectTaskProblem(root, manifest, openPath, requestedProblem);
          problem = selection?.snapshot.states.find(({ id }) => id === selection.id);
        } else {
          const { states } = await loadTaskProblems(root, manifest, {
            trainingRoot: trainingRootOf(root),
          });
          problem =
            states.find((state) => state.id === requestedProblem) ??
            chooseProblem(states, openPath, manifest);
        }
        if (!problem) throw new Error("相談する問題がありません");
        result = await readProblemRun(root, manifest.id, problem.id);
        if (!result) throw new Error("先にこの問題を確認してください");
      } else {
        result = JSON.parse(
          new TextDecoder().decode(
            await readFileInRoot(root, ".stella/last-run.json", 1024 * 1024),
          ),
        );
      }
      if (!isRunResult(result) || result.taskId !== manifest.id)
        throw new Error("先にこの課題を確認してください");
      if (canSubmit(result)) {
        if (!manifest.problems?.length) {
          await refreshTaskState(root, manifest.id, { forceLms: true });
          if (session === apiSession() && getTaskState(root, manifest.id)?.lmsStatus === "resubmit")
            resubmitTaskId = manifest.id;
        }
        if (!resubmitTaskId) throw new Error("手元の確認が通っています。「提出」を使ってください");
      }
    }
    const saved = await readSubmissionNotes(root);
    const notesFor = async (draft: SubmissionDraft) => {
      const support: SupportEvent[] = [...(saved?.support ?? [])];
      for (const event of await readRecordedSupport(root)) {
        if (
          !support.some(
            (item) =>
              item.kind === event.kind && item.at === event.at && item.detail === event.detail,
          )
        )
          support.push(event);
      }
      return { ...draft, support };
    };
    const save = async (draft: SubmissionDraft) => {
      const notes = await notesFor(draft);
      await writeStateFile(root, "submission-notes.json", `${JSON.stringify(notes, null, 2)}\n`);
    };
    showSubmissionForm(
      {
        key: root,
        title: problem ? `${manifest.title} (${problem.title})` : manifest.title,
        mode,
        debug: manifest.kind === "debug",
        initial: saved,
      },
      {
        save,
        submit: async (draft) => {
          if (!workspaceRoots().some((owner) => isInside(root, owner)))
            throw new Error("ワークスペース内の課題フォルダーを開いてください");
          if (dirtyTaskDocuments(root).length > 0)
            throw new Error(
              mode === "consult"
                ? "保存していない変更があります。保存してもう一度確認してください"
                : `保存していない変更があります。${SUBMIT_AGAIN}`,
            );
          const notes = await notesFor(draft);
          if (mode === "consult")
            notes.support.push({
              kind: "instructor",
              at: new Date().toISOString(),
              detail: CONSULT_SUPPORT_DETAIL,
            });
          try {
            if (problem) await sendProblemConsultation(root, problem.id, notes, session);
            else await sendTaskSubmission(root, mode, notes, session, resubmitTaskId);
          } catch (error) {
            if (!(error instanceof AuthSessionChanged)) throw error;
            void vscode.window.showWarningMessage(SUBMISSION_SESSION_CHANGED);
            return;
          }
          if (!manifest.problems) void refreshTaskState(root, manifest.id, { forceLms: true });
          refreshLearningSidebar();
          if (taskReadmeRoot() === root) {
            void renderTaskReadme(root, { reveal: false }).catch(() => undefined);
          }
          const webUrl = submissionWebUrl(manifest.id, problem?.id);
          const result = "結果を見る";
          void vscode.window
            .showInformationMessage(
              mode === "consult"
                ? "相談を送りました。管理者の返事は通知と、Web の教材の画面の『提出・レビューを確認する』に届きます。"
                : "提出しました。AI が確かめた結果は、ふつう数分で届きます。",
              ...(mode === "consult" ? [OPEN_SUBMISSION_WEB] : [result, OPEN_SUBMISSION_WEB]),
            )
            .then(async (choice) => {
              if (choice === result)
                await vscode.commands.executeCommand("stella.showTaskHelp", root);
              else if (choice === OPEN_SUBMISSION_WEB)
                await vscode.env.openExternal(vscode.Uri.parse(webUrl));
            });
        },
      },
    );
  } catch (e) {
    if (e instanceof AuthSessionChanged)
      void vscode.window.showWarningMessage(SUBMISSION_SESSION_CHANGED);
    else void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  } finally {
    submitting = false;
  }
}

/**
 * 提出は受理済みで、問題の状態を取り直せなかったとき。
 * 件数と受理した問題だけを反映し、後続が解けるかは次に取り直すまで変えない。
 */
function reflectAcceptedProblem(
  previous: TaskProblems,
  problemId: string,
  response: ProblemSubmitResponse,
  failed: Pick<TaskProblems, "releasePending" | "releaseError"> | undefined,
): TaskProblems {
  const states = previous.states.map((state) =>
    state.id === problemId
      ? {
          id: state.id,
          title: state.title,
          source: state.source,
          status: "submitted" as const,
          ...(state.onDisk ? { onDisk: true as const } : {}),
        }
      : state,
  );
  const blocked = new Map(
    states.flatMap((state) => (state.lockReason ? ([[state.id, state.lockReason]] as const) : [])),
  );
  return {
    ...(previous.server
      ? {
          server: {
            ...previous.server,
            passedProblems: response.passedProblems,
            totalProblems: response.totalProblems,
            taskPassed: response.taskPassed,
          },
        }
      : {}),
    states,
    blocked,
    progress: { passed: response.passedProblems, total: response.totalProblems },
    ...(failed?.releasePending ? { releasePending: true } : {}),
    ...(failed?.releaseError ? { releaseError: failed.releaseError } : {}),
  };
}

/** 問題つきの課題を、説明欄なしで 1 問提出して次の問題を案内する。 */
async function submitProblemTask(
  root: string,
  manifest: TaskManifest,
  problemId: string,
  previous: TaskProblems,
  session: number | undefined,
): Promise<void> {
  const response = await sendProblemSubmission(root, problemId, session).catch((error: unknown) => {
    if (session === apiSession() && taskReadmeRoot() === root)
      void renderTaskReadme(root, { reveal: false }, {}, previous).catch(() => undefined);
    throw error;
  });
  refreshLearningSidebar();
  if (manifest.problemSteps) {
    if (session !== apiSession()) return;
    const webUrl = submissionWebUrl(manifest.id, problemId);
    void vscode.window
      .showInformationMessage(
        response.taskPassed
          ? "課題に合格しました"
          : `提出しました (${problemCountLabel(response.passedProblems, response.totalProblems)})`,
        OPEN_SUBMISSION_WEB,
      )
      .then(async (choice) => {
        if (choice === OPEN_SUBMISSION_WEB && session === apiSession())
          await vscode.env.openExternal(vscode.Uri.parse(webUrl));
      });
    let refreshed: TaskProblems | undefined;
    let refreshError: unknown;
    try {
      refreshed = await loadTaskProblems(root, manifest, {
        afterSubmission: true,
        trainingRoot: trainingRootOf(root),
      });
    } catch (error) {
      refreshError = error;
    }
    if (session !== apiSession()) return;
    const problems = refreshed?.server
      ? refreshed
      : reflectAcceptedProblem(previous, problemId, response, refreshed);
    setCurrentTask({
      root,
      title: manifest.title,
      ...problemTaskProgress(manifest, problems),
      problemActionsAvailable: !problems.releasePending,
    });
    notifyProblemTaskOpened(root);
    if (taskReadmeRoot() === root)
      void renderTaskReadme(root, { reveal: false }, {}, problems).catch(() => undefined);
    if (problems.releaseError) void vscode.window.showWarningMessage(problems.releaseError);
    if (refreshError) throw refreshError;
    return;
  }
  const marked = previous.states.map((state) =>
    state.id === problemId ? { ...state, status: "submitted" as const } : state,
  );
  const snapshot: TaskProblems = {
    ...previous,
    server: {
      ...previous.server,
      problems: previous.server?.problems ?? [],
      passedProblems: response.passedProblems,
      totalProblems: response.totalProblems,
      taskPassed: response.taskPassed,
    },
    states: marked,
    progress: { passed: response.passedProblems, total: response.totalProblems },
  };
  setCurrentTask({ root, title: manifest.title, ...problemTaskProgress(manifest, snapshot) });
  if (response.taskPassed) {
    void vscode.window.showInformationMessage("課題に合格しました");
  } else {
    void vscode.window.showInformationMessage(
      `提出しました (${problemCountLabel(response.passedProblems, response.totalProblems)})`,
    );
    const next = nextUnsubmittedProblem(marked);
    if (next) {
      const file = vscode.Uri.file(await resolveFileInRoot(root, next.source));
      await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(file), {
        viewColumn: vscode.ViewColumn.One,
        preview: false,
      });
    }
  }
  if (taskReadmeRoot() === root) {
    void renderTaskReadme(root, { reveal: false }, {}, snapshot).catch(() => undefined);
  }
}

function taskLesson(taskId: string) {
  return getCachedCatalog()
    .flatMap((stage) => stage.sections.flatMap((section) => section.lessons))
    .find((item) => item.task?.id === taskId);
}

function isWebId(id: unknown): id is string {
  return typeof id === "string" && /^[a-z0-9][a-z0-9_-]*$/i.test(id);
}

async function openTaskWebPage(stageId?: string, lessonId?: string): Promise<void> {
  const stage = typeof stageId === "string" ? `/stages/${encodeURIComponent(stageId)}` : "/";
  const lesson = typeof lessonId === "string" ? `/lessons/${encodeURIComponent(lessonId)}` : "";
  const uri = vscode.Uri.parse(`${stellaUrl("webUrl")}${stage}${lesson}`);
  if (uri.scheme === "https" || uri.scheme === "http") await vscode.env.openExternal(uri);
}

async function failedTestLines(
  root: string,
  run?: RunResult,
): Promise<Map<TestCaseResult, number>> {
  const lines = new Map<TestCaseResult, number>();
  if (!run || (run.outcome !== "failed" && run.outcome !== "error")) return lines;
  const sources = new Map<string, string>();
  for (const step of run.steps) {
    for (const test of step.tests ?? []) {
      if (test.status !== "failed" || typeof test.file !== "string") continue;
      const file = resolveDiagnosticFile(root, test.file);
      if (!file) continue;
      let source = sources.get(file);
      if (source === undefined) {
        source = await readTestSource(root, file);
        sources.set(file, source);
      }
      lines.set(test, (findTestLine(source, test.name) ?? 0) + 1);
    }
  }
  return lines;
}

/** 課題文は 1 MB まで。課題フォルダーの中の README.md だけを読む。 */
const README_MAX_BYTES = 1024 * 1024;

/**
 * 課題文 (README.md) のパネルを描く。課題の定義を読めれば、先頭に「進め方」(編集する
 * ファイル・確認・提出のリンクと、前回の確認と課題の状態から決めた「いまやること」) を置く。
 * `reveal: false` は中身を新しくするだけで、ステータスバーの課題は
 * 変えない — 確認の間に受講者が別の課題のファイルへ移っていれば、そちらが今の課題のため。
 */
async function renderTaskReadme(
  root: string,
  options: { reveal?: boolean } = {},
  refresh: { forceLms?: boolean; skipLms?: boolean } = {},
  problemSnapshot?: TaskProblems,
  latestRun?: RunResult,
): Promise<void> {
  const loaded = await loadTask(root);
  const manifest = loaded.ok ? loaded.manifest : undefined;
  const markdown = manifest?.problems?.length
    ? ""
    : new TextDecoder().decode(await readFileInRoot(root, "README.md", README_MAX_BYTES));
  if (!manifest) {
    const title = path.basename(root);
    showTaskReadme({ title, markdown, root }, options);
    if (options.reveal !== false) setCurrentTask({ root, title });
    return;
  }
  const session = apiSession();
  const [edit, problems] = await Promise.all([
    manifest.problems?.length ? { files: [], missing: [] } : resolveEditFiles(root, manifest),
    manifest.problems?.length
      ? (problemSnapshot ??
        loadTaskProblems(root, manifest, { trainingRoot: trainingRootOf(root) }))
      : undefined,
    refreshTaskState(root, manifest.id, refresh),
  ]);
  const current = problems && problemToWorkOn(problems.states);
  const problemRun =
    current &&
    (latestRun?.problemId === current.id
      ? latestRun
      : await readProblemRun(root, manifest.id, current.id));
  const problemTestLines = await failedTestLines(root, problemRun);
  let problemTestSource: { problemId: string; source: string } | undefined;
  if (current) {
    const test = problemFiles(RUNNERS[manifest.runner].plan, current.id)?.test;
    if (test?.endsWith(".test.ts")) {
      const source = await readTestSource(root, path.resolve(root, test));
      if (source) problemTestSource = { problemId: current.id, source };
    }
  }
  if (problems && session !== apiSession()) return;
  const { lastRun, lmsStatus, helpLabel } = getTaskState(root, manifest.id) ?? {};
  const server = problems?.server;
  const stageId =
    problems &&
    (taskLesson(manifest.id)?.stageId ??
      server?.problems.flatMap(({ refs }) => refs ?? []).find(({ auto }) => auto)?.stageId);
  showTaskReadme(
    {
      title: manifest.title,
      markdown,
      root,
      guide: {
        root,
        manifest,
        edit,
        ...(lastRun ? { lastRun } : {}),
        ...(problems ? { problems: problems.states } : {}),
        ...(problems?.releaseError ? { releaseError: problems.releaseError } : {}),
        ...(server ? { problemResults: server } : {}),
        ...(problemRun ? { problemRun, problemTestLines } : {}),
        ...(problemTestSource ? { problemTestSource } : {}),
        ...(stageId ? { stageId } : {}),
        ...(problems && helpLabel && !refresh.skipLms ? { helpLabel } : {}),
        ...(!manifest.problems && lmsStatus && !refresh.skipLms && session === apiSession()
          ? { taskStatus: lmsStatus }
          : {}),
      },
    },
    options,
  );
  if (manifest.problemSteps) notifyProblemTaskOpened(root);
  if (options.reveal !== false) {
    setCurrentTask({
      root,
      title: manifest.title,
      ...(problems
        ? {
            ...problemTaskProgress(manifest, problems),
            problemActionsAvailable: !problems.releasePending,
          }
        : { taskId: manifest.id }),
    });
  }
}

/** 課題文 (README.md) を OS のタブ付きで表示する。フォルダーの信頼は問わない。 */
async function showTaskReadmeCommand(requested?: unknown): Promise<void> {
  const root = await requestedTaskRoot(requested);
  if (!root) {
    void vscode.window.showInformationMessage(
      "課題フォルダーのファイルを開いてから実行してください (.stella/task.json がある課題フォルダー)",
    );
    return;
  }
  try {
    await renderTaskReadme(root, {}, { forceLms: true });
  } catch (e) {
    void vscode.window.showErrorMessage(
      `課題文を表示できませんでした: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

async function readLastProblemResult(root: string, manifest: TaskManifest, requested: unknown) {
  const target =
    isFileUri(requested) && path.relative(root, requested.fsPath) === "" ? undefined : requested;
  const file =
    typeof requested === "string" || isFileUri(requested)
      ? requestedProblemPath(root, target)
      : undefined;
  const problem = file && (problemForPath(manifest, file) ?? problemForTestPath(manifest, file));
  const visible = manifest.problemSteps
    ? (await loadTaskProblems(root, manifest, { trainingRoot: trainingRootOf(root) })).states
    : (manifest.problems ?? []);
  if (problem)
    return visible.some(({ id }) => id === problem.id)
      ? readProblemRun(root, manifest.id, problem.id)
      : undefined;

  let latest: RunResult | undefined;
  for (const { id } of visible) {
    const result = await readProblemRun(root, manifest.id, id);
    if (result && (!latest || Date.parse(result.startedAt) > Date.parse(latest.startedAt))) {
      latest = result;
    }
  }
  return latest;
}

async function showLastResultCommand(requested?: unknown): Promise<void> {
  const root = await requestedTaskRoot(requested);
  const loaded = root ? await loadTask(root) : undefined;
  if (loaded?.ok) {
    const { root, manifest } = loaded;
    const result = manifest.problems
      ? await readLastProblemResult(root, manifest, requested)
      : await readLastResult(root, manifest.id);
    if (result) {
      showTaskPanel({ kind: "result", root, manifest, result });
      return;
    }
  }
  void vscode.window.showInformationMessage(
    "まだ確認していません。「提出する」か「課題を確認する」を実行してください",
  );
}

/**
 * 課題文の「進め方」から、編集するファイルを左の列で開く。開けるのは、その課題の
 * 提出するファイル (`submit.files`) に当たり、配布したテスト・設定ではない、課題フォルダーの
 * 中の通常のファイルだけ。
 */
async function openTaskFileCommand(requested: unknown, rel: unknown): Promise<void> {
  const root = typeof requested === "string" ? await requestedTaskRoot(requested) : null;
  if (!root) throw new Error("ワークスペース内の課題フォルダーを開いてください");
  if (typeof rel !== "string") throw new Error("開くファイルが指定されていません");
  const loaded = await loadTask(root);
  if (!loaded.ok) throw new Error(loaded.errors.join("\n"));
  const { files } = await resolveEditFiles(root, loaded.manifest);
  if (!files.includes(rel)) throw new Error(`${rel} は、この課題で編集するファイルではありません`);
  // 一覧を作ってから開くまでの間にリンクへ差し替えられていないか、開く直前にも確かめる
  // (課題フォルダーの中の通常のファイルだけ)。画像などはテキストでなくても開けるよう vscode.open。
  const file = await resolveFileInRoot(root, rel);
  await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(file), {
    viewColumn: vscode.ViewColumn.One,
    preview: false,
  });
}

async function openProblemLocation(
  requested: unknown,
  problemId: unknown,
  file: unknown,
  line: unknown,
) {
  const root = typeof requested === "string" ? await requestedTaskRoot(requested) : null;
  if (
    !root ||
    typeof file !== "string" ||
    typeof line !== "number" ||
    !Number.isSafeInteger(line) ||
    line < 1
  )
    return;
  const loaded = await loadTask(root);
  if (!loaded.ok || !loaded.manifest.problems?.some(({ id }) => id === problemId)) return;
  const { manifest } = loaded;
  if (
    problemForTestPath(manifest, file)?.id !== problemId &&
    !(await resolveEditFiles(root, manifest)).files.includes(file)
  )
    return;
  const document = await vscode.workspace.openTextDocument(
    vscode.Uri.file(await resolveFileInRoot(root, file)),
  );
  const target = Math.min(line - 1, document.lineCount - 1);
  await vscode.window.showTextDocument(document, {
    viewColumn: vscode.ViewColumn.One,
    preview: false,
    selection: new vscode.Range(target, 0, target, 0),
  });
}

export function registerTaskCommands(context: vscode.ExtensionContext, auth: AuthStore): void {
  registerTaskState(context, auth);
  registerSubmissionForms(context);
  const output = vscode.window.createOutputChannel("STELLA 実行ログ");
  context.subscriptions.push(
    output,
    onDidChangeAuthSession(() => {
      const root = taskReadmeRoot();
      if (root)
        void renderTaskReadme(root, { reveal: false }, { skipLms: true }).catch(() => undefined);
    }),
    onTaskReadmeVisible((root) => {
      void renderTaskReadme(root, { reveal: false }).catch(() => undefined);
    }),
    vscode.commands.registerCommand("stella.submitTask", (root?: unknown, problemId?: unknown) =>
      submitTaskCommand(output, "submit", root, problemId),
    ),
    vscode.commands.registerCommand("stella.consultTask", (root?: string, problemId?: unknown) =>
      submitTaskCommand(output, "consult", root, problemId),
    ),
    vscode.window.onDidChangeWindowState(({ focused }) => {
      const root = taskReadmeRoot();
      if (focused && root) {
        void loadTask(root)
          .then((loaded) => {
            if (loaded.ok && loaded.manifest.problemSteps && taskReadmeRoot() === root)
              return renderTaskReadme(root, { reveal: false });
          })
          .catch(() => undefined);
      }
    }),
    vscode.commands.registerCommand("stella.runTask", (root?: unknown, problemId?: unknown) =>
      runTaskCommand(output, root, problemId),
    ),
    vscode.commands.registerCommand("stella.diagnoseEnvironment", () => diagnoseCommand(output)),
    vscode.commands.registerCommand("stella.showRunLog", () => output.show(true)),
    vscode.commands.registerCommand("stella.showLastResult", (root?: unknown) =>
      showLastResultCommand(root),
    ),
    vscode.commands.registerCommand("stella.showTaskReadme", (root?: unknown) =>
      showTaskReadmeCommand(root),
    ),
    vscode.commands.registerCommand("stella.openWalkthrough", () =>
      vscode.commands.executeCommand(
        "workbench.action.openWalkthrough",
        `${context.extension.id}#stella.gettingStarted`,
        false,
      ),
    ),
    vscode.commands.registerCommand(
      "stella.openTaskWebPage",
      (stageId: unknown, lessonId?: unknown) => {
        if (!isWebId(stageId) || (lessonId !== undefined && !isWebId(lessonId))) return;
        return openTaskWebPage(stageId, lessonId);
      },
    ),
    vscode.commands.registerCommand(
      "stella.openProblemLocation",
      (root: unknown, problemId: unknown, file: unknown, line: unknown) =>
        openProblemLocation(root, problemId, file, line).catch((error: unknown) => {
          void vscode.window.showErrorMessage(
            error instanceof Error ? error.message : String(error),
          );
        }),
    ),
    vscode.commands.registerCommand("stella.openTaskFile", (root: unknown, rel: unknown) =>
      openTaskFileCommand(root, rel).catch((e: unknown) => {
        void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
      }),
    ),
  );
}
