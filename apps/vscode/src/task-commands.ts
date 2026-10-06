/**
 * 新形式の課題 (`.stella/task.json`) を手元で確かめるコマンド。
 *
 * - STELLA: 課題を確認する   … 開いているファイルの課題フォルダーで runner を実行する
 * - STELLA: 開発環境を診断する … Node.js・npm・Git の版を確かめる
 * - STELLA: 実行ログを表示する … 道具の出力をそのまま見る
 * - STELLA: 課題文を表示する   … README.md を OS のタブ付きで読む (ファイルを読むだけ)
 *
 * 外部プロセスを起動するので、信頼したフォルダー (Workspace Trust) でだけ実行する。
 */

import { homedir } from "node:os";
import path from "node:path";
import { type CiRunClaim, deployUrlProblem, runUrlProblem } from "@stella/shared/tasks/ci-run";
import type { TaskManifest } from "@stella/shared/tasks/manifest";
import { toLocalRunReport } from "@stella/shared/tasks/local-report";
import { canSubmit, type RunOutcome } from "@stella/shared/tasks/run-result";
import { CONSULT_SUPPORT_DETAIL } from "@stella/shared/tasks/support-record";
import { RUNNERS } from "@stella/shared/tasks/runners";
import * as vscode from "vscode";
import { apiRequest } from "./api.js";
import {
  findTaskRoot,
  type LoadedTask,
  loadTask,
  runTask,
  saveRunResult,
} from "./runner/run-task.js";
import {
  isRunResult,
  SUPPORT_KINDS,
  SUPPORT_LABELS,
  type DebuggingRecord,
} from "@stella/shared/tasks/submission";
import { readFileInRoot, writeStateFile } from "./runner/files.js";
import type { CiRunInput } from "./runner/steps.js";
import {
  readDistribution,
  readRecordedSupport,
  readSubmissionNotes,
  sendTaskSubmission,
} from "./task-submission.js";
import { showTaskPanel, showTaskReadme } from "./task-panel.js";

let running = false;

export function workspaceRoots(): string[] {
  return (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);
}

export function isInside(file: string, dir: string): boolean {
  const rel = path.relative(dir, file);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
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
  // CI と公開の課題は、手元では GitHub の実行の URL と公開先を控え、コミットを確かめるだけ。
  let ci: CiRunInput | undefined;
  if (manifest.runner === "ci-deploy") {
    ci = await askCiRun(root, manifest);
    if (!ci) return;
  }
  await runWithProgress(output, `課題を確認しています: ${manifest.title}`, async (signal, log) => {
    // 配布記録が壊れていても手元の確認は続ける (提出時の prepareTaskSubmission で改めて検証する)。
    const receipt = await readDistribution(root).catch((error: unknown) => {
      output.appendLine(
        `配布記録を読めませんでした: ${error instanceof Error ? error.message : String(error)}`,
      );
      return undefined;
    });
    const result = await runTask({ root, manifest, manifestSha256, signal, log, ci });
    if (receipt?.taskId === manifest.id) result.taskContentHash = receipt.contentHash;
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
    showTaskPanel({ kind: "result", manifest, result, root });
    notify(result.outcome, output);
    // 合格も失敗も、回数を数えるための要約だけを送る (#38)。コード・ファイル名・メッセージ・
    // ログは送らない。配布記録のない見本や中断した実行は送らない。失敗は合格と別の道に送る
    // (旧 API は local-result の本文を見ずに合格として扱うため)。
    const report = receipt?.taskId === manifest.id ? toLocalRunReport(result, receipt) : null;
    if (report) {
      try {
        await apiRequest(
          report.outcome === "passed" ? "/api/tasks/local-result" : "/api/tasks/local-runs",
          { method: "POST", body: report },
        );
      } catch (err) {
        output.appendLine(
          `手元の確認の結果を LMS に反映できませんでした: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
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

let submitting = false;
async function submitTaskCommand(
  mode: "submit" | "consult",
  requestedRoot?: string,
): Promise<void> {
  if (submitting) return;
  submitting = true;
  try {
    const root = typeof requestedRoot === "string" ? requestedRoot : await locateTask();
    if (!root || !workspaceRoots().some((owner) => isInside(root, owner)))
      throw new Error("ワークスペース内の課題フォルダーを開いてください");
    if (
      vscode.workspace.textDocuments.some(
        (d) => d.isDirty && d.uri.scheme === "file" && isInside(d.uri.fsPath, root),
      )
    )
      throw new Error("保存していない変更があります。保存してもう一度確認してください");
    const loaded = await loadTask(root);
    if (!loaded.ok) throw new Error(loaded.errors.join("\n"));
    const result: unknown = JSON.parse(
      new TextDecoder().decode(await readFileInRoot(root, ".stella/last-run.json", 1024 * 1024)),
    );
    if (!isRunResult(result) || result.taskId !== loaded.manifest.id)
      throw new Error("先にこの課題を確認してください");
    if (mode === "submit" && !canSubmit(result))
      throw new Error("手元の確認がすべて通ってから提出してください");
    if (mode === "consult" && canSubmit(result))
      throw new Error("手元の確認が通っています。「提出」を使ってください");
    const saved = await readSubmissionNotes(root);
    const explanation = await vscode.window.showInputBox({
      title: mode === "consult" ? "講師に相談" : "課題の提出",
      prompt: mode === "consult" ? "困っていること・試したこと" : "実装した内容と判断の理由",
      value: saved?.explanation ?? "",
      ignoreFocusOut: true,
    });
    if (explanation === undefined) return;
    let debuggingRecord: DebuggingRecord | undefined;
    if (loaded.manifest.kind === "debug") {
      debuggingRecord = { reproduction: "", expected: "", cause: "", fix: "", regression: "" };
      const labels = {
        reproduction: "再現手順",
        expected: "期待した結果と実際の結果",
        cause: "原因",
        fix: "変更した箇所と修正",
        regression: "回帰確認",
      };
      for (const key of Object.keys(labels) as (keyof DebuggingRecord)[]) {
        const value = await vscode.window.showInputBox({
          title: "修正課題の記録",
          prompt: labels[key],
          value: saved?.debuggingRecord?.[key] ?? "",
          ignoreFocusOut: true,
          validateInput: (v) =>
            mode === "submit" && !v.trim() ? "記録を入力してください" : undefined,
        });
        if (value === undefined) return;
        debuggingRecord[key] = value;
      }
    }
    const recorded = await readRecordedSupport(root);
    const choices = await vscode.window.showQuickPick(
      SUPPORT_KINDS.map((kind) => ({
        label: SUPPORT_LABELS[kind],
        supportKind: kind,
        picked: saved?.support.some((e) => e.kind === kind) ?? false,
      })),
      {
        title: "この課題で使った支援を選んでください（参照資料だけなら選択不要）",
        canPickMany: true,
        ignoreFocusOut: true,
      },
    );
    if (choices === undefined) return;
    const support = [...recorded];
    for (const choice of choices)
      if (!support.some((e) => e.kind === choice.supportKind))
        support.push({
          kind: choice.supportKind,
          at: new Date().toISOString(),
          detail: "受講者の申告",
        });
    if (mode === "consult")
      support.push({
        kind: "instructor",
        at: new Date().toISOString(),
        detail: CONSULT_SUPPORT_DETAIL,
      });
    const notes = { explanation, ...(debuggingRecord ? { debuggingRecord } : {}), support };
    await writeStateFile(root, "submission-notes.json", `${JSON.stringify(notes, null, 2)}\n`);
    const row = await sendTaskSubmission(root, mode, notes);
    void vscode.window.showInformationMessage(
      `${mode === "consult" ? "講師に相談を送りました" : "課題を提出しました"} (${row.attempt} 回目)。レビューの結果は Web で確認できます`,
    );
  } catch (e) {
    void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  } finally {
    submitting = false;
  }
}

/** 課題文は 1 MB まで。課題フォルダーの中の README.md だけを読む。 */
const README_MAX_BYTES = 1024 * 1024;

/** 課題文 (README.md) を OS のタブ付きで表示する。ファイルを読むだけなので信頼は問わない。 */
async function showTaskReadmeCommand(): Promise<void> {
  const root = await locateTask();
  if (!root) {
    void vscode.window.showInformationMessage(
      "課題フォルダーのファイルを開いてから実行してください (.stella/task.json がある課題フォルダー)",
    );
    return;
  }
  try {
    const loaded = await loadTask(root);
    const markdown = new TextDecoder().decode(
      await readFileInRoot(root, "README.md", README_MAX_BYTES),
    );
    showTaskReadme({ title: loaded.ok ? loaded.manifest.title : path.basename(root), markdown });
  } catch (e) {
    void vscode.window.showErrorMessage(
      `課題文を表示できませんでした: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

export function registerTaskCommands(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("STELLA 実行ログ");
  context.subscriptions.push(
    output,
    vscode.commands.registerCommand("stella.submitTask", (root?: string) =>
      submitTaskCommand("submit", root),
    ),
    vscode.commands.registerCommand("stella.consultTask", (root?: string) =>
      submitTaskCommand("consult", root),
    ),
    vscode.commands.registerCommand("stella.runTask", () => runTaskCommand(output)),
    vscode.commands.registerCommand("stella.diagnoseEnvironment", () => diagnoseCommand(output)),
    vscode.commands.registerCommand("stella.showRunLog", () => output.show(true)),
    vscode.commands.registerCommand("stella.showTaskReadme", () => showTaskReadmeCommand()),
  );
}
