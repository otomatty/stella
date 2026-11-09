/**
 * 新形式の課題 (`.stella/task.json`) を手元で確かめるコマンド。
 *
 * - STELLA: 課題を確認する   … 開いているファイルの課題フォルダーで runner を実行する
 * - STELLA: 開発環境を診断する … Node.js・npm・Git の版を確かめる
 * - STELLA: 実行ログを表示する … 道具の出力をそのまま見る
 * - STELLA: 課題文を表示する   … README.md を OS のタブ付きで読む (ファイルを読むだけ)。
 *                               先頭に「進め方」と、編集するファイルを開くリンクを出す
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
import { canSubmit, type RunOutcome } from "@stella/shared/tasks/run-result";
import { CONSULT_SUPPORT_DETAIL } from "@stella/shared/tasks/support-record";
import { RUNNERS } from "@stella/shared/tasks/runners";
import * as vscode from "vscode";
import { apiSession } from "./api.js";
import { getCachedCatalog } from "./catalog.js";
import { stellaUrl } from "./config.js";
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
  readDistribution,
  readRecordedSupport,
  readSubmissionNotes,
  sendTaskSubmission,
} from "./task-submission.js";
import { readLastOutcome, resolveEditFiles } from "./task-guide.js";
import { showTaskPanel, showTaskReadme, taskReadmeRoot } from "./task-panel.js";
import {
  chooseProblem,
  fetchProblemResults,
  loadProblemStates,
  nextUnsubmittedProblem,
  problemCountLabel,
  readProblemRun,
  sendProblemConsultation,
  sendProblemSubmission,
  type ProblemState,
} from "./task-problems.js";
import { setCurrentTask } from "./task-status.js";
import { registerSubmissionForms, showSubmissionForm } from "./submission-form.js";
import type { SubmissionDraft } from "./submission-form-view.js";

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

async function runTaskCommand(output: vscode.OutputChannel, requested?: unknown): Promise<void> {
  const root = await requestedTaskRoot(requested);
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
    let problem: string | undefined;
    if (manifest.problems?.length) {
      const server = await fetchProblemResults(manifest.id).catch(() => undefined);
      const states = await loadProblemStates(root, manifest, server);
      problem = chooseProblem(states, requestedProblemPath(root, requested), manifest)?.id;
    }
    const result = await runTask({
      root,
      manifest,
      manifestSha256,
      signal,
      log,
      ci,
      ...(problem ? { problem } : {}),
    });
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
    // 課題文のパネルを開いていれば、「いまここ」を新しい結果で描き直す (前面には出さない)。
    if (result.outcome !== "cancelled" && taskReadmeRoot() === root)
      void renderTaskReadme(root, { reveal: false }).catch(() => undefined);
    // 合格も失敗も、回数を数えるための要約だけを送る (#38)。コード・ファイル名・メッセージ・
    // ログは送らない。配布記録のない見本や中断した実行は送らない。失敗は合格と別の道に送る
    // (旧 API は local-result の本文を見ずに合格として扱うため)。
    try {
      await sendLocalRunReport(result, receipt?.taskId === manifest.id ? receipt : undefined);
    } catch (err) {
      output.appendLine(
        `手元の確認の結果を LMS に反映できませんでした: ${err instanceof Error ? err.message : String(err)}`,
      );
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
  requestedProblem?: unknown,
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
    if (mode === "submit" && loaded.manifest.problems?.length) {
      await submitProblemTask(root, loaded.manifest);
      return;
    }
    let problem: ProblemState | undefined;
    let result: unknown;
    if (mode === "consult" && loaded.manifest.problems?.length) {
      const server = await fetchProblemResults(loaded.manifest.id).catch(() => undefined);
      const states = await loadProblemStates(root, loaded.manifest, server);
      problem =
        states.find((state) => state.id === requestedProblem) ??
        chooseProblem(states, requestedProblemPath(root, undefined), loaded.manifest);
      if (!problem) throw new Error("相談する問題がありません");
      result = await readProblemRun(root, loaded.manifest.id, problem.id);
      if (!result) throw new Error("先にこの問題を確認してください");
    } else {
      result = JSON.parse(
        new TextDecoder().decode(await readFileInRoot(root, ".stella/last-run.json", 1024 * 1024)),
      );
    }
    if (!isRunResult(result) || result.taskId !== loaded.manifest.id)
      throw new Error("先にこの課題を確認してください");
    if (mode === "submit" && !canSubmit(result))
      throw new Error("手元の確認がすべて通ってから提出してください");
    if (mode === "consult" && canSubmit(result))
      throw new Error("手元の確認が通っています。「提出」を使ってください");
    const saved = await readSubmissionNotes(root);
    const session = apiSession();
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
        title: problem ? `${loaded.manifest.title} (${problem.title})` : loaded.manifest.title,
        mode,
        debug: loaded.manifest.kind === "debug",
        initial: saved,
      },
      {
        save,
        submit: async (draft) => {
          if (!workspaceRoots().some((owner) => isInside(root, owner)))
            throw new Error("ワークスペース内の課題フォルダーを開いてください");
          if (
            vscode.workspace.textDocuments.some(
              (document) =>
                document.isDirty &&
                document.uri.scheme === "file" &&
                isInside(document.uri.fsPath, root),
            )
          )
            throw new Error("保存していない変更があります。保存してもう一度確認してください");
          const notes = await notesFor(draft);
          if (mode === "consult")
            notes.support.push({
              kind: "instructor",
              at: new Date().toISOString(),
              detail: CONSULT_SUPPORT_DETAIL,
            });
          if (problem) await sendProblemConsultation(root, problem.id, notes, session);
          else await sendTaskSubmission(root, mode, notes, session);
          // 課題一覧の応答から作ったカタログにだけ ID がある。配布記録には含まれない。
          const lesson = getCachedCatalog()
            .flatMap((stage) => stage.sections.flatMap((section) => section.lessons))
            .find((item) => item.task?.id === loaded.manifest.id);
          const webUrl = `${stellaUrl("webUrl")}${
            lesson?.stageId && lesson.id
              ? `/stages/${encodeURIComponent(lesson.stageId)}/lessons/${encodeURIComponent(lesson.id)}`
              : "/"
          }`;
          const web = "Web で開く";
          const result = "結果を見る";
          void vscode.window
            .showInformationMessage(
              mode === "consult"
                ? "相談を送りました。講師の返事は通知と、Web のレッスン画面の『提出・添削を確認する』に届きます。"
                : "提出しました。AI が確かめた結果は、ふつう数分で届きます。",
              ...(mode === "consult" ? [web] : [result, web]),
            )
            .then(async (choice) => {
              if (choice === result)
                await vscode.commands.executeCommand("stella.showTaskHelp", root);
              else if (choice === web) await vscode.env.openExternal(vscode.Uri.parse(webUrl));
            });
        },
      },
    );
  } catch (e) {
    void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  } finally {
    submitting = false;
  }
}

/** 問題つきの課題を、説明欄なしで 1 問提出する。通ったら次の問題のファイルを開く。 */
async function submitProblemTask(root: string, manifest: TaskManifest): Promise<void> {
  const server = await fetchProblemResults(manifest.id).catch(() => undefined);
  const states = await loadProblemStates(root, manifest, server);
  const chosen = chooseProblem(states, requestedProblemPath(root, undefined), manifest);
  if (!chosen) throw new Error("提出する問題がありません");
  const response = await sendProblemSubmission(root, chosen.id, apiSession());
  setCurrentTask({
    root,
    title: manifest.title,
    problemProgress: { passed: response.passedProblems, total: response.totalProblems },
  });
  if (response.taskPassed) {
    void vscode.window.showInformationMessage("課題に合格しました");
  } else {
    void vscode.window.showInformationMessage(
      `提出しました (${problemCountLabel(response.passedProblems, response.totalProblems)})`,
    );
    const marked = states.map((state) =>
      state.id === chosen.id ? { ...state, status: "submitted" as const } : state,
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
    void renderTaskReadme(root, { reveal: false }).catch(() => undefined);
  }
}

/** 課題文は 1 MB まで。課題フォルダーの中の README.md だけを読む。 */
const README_MAX_BYTES = 1024 * 1024;

/**
 * 課題文 (README.md) のパネルを描く。課題の定義を読めれば、先頭に「進め方」(編集する
 * ファイル・確認・提出のリンクと、前回の確認の結果から決めた「いまここ」) を置く。
 * `reveal: false` (確認のあとの描き直し) は中身を新しくするだけで、ステータスバーの課題は
 * 変えない — 確認の間に受講者が別の課題のファイルへ移っていれば、そちらが今の課題のため。
 */
async function renderTaskReadme(root: string, options: { reveal?: boolean } = {}): Promise<void> {
  const shown = (title: string, problems?: ProblemState[]) => {
    if (options.reveal === false) return;
    setCurrentTask({
      root,
      title,
      ...(problems
        ? {
            problemProgress: {
              passed: problems.filter((item) => item.status === "submitted").length,
              total: problems.length,
            },
          }
        : {}),
    });
  };
  const loaded = await loadTask(root);
  const markdown = new TextDecoder().decode(
    await readFileInRoot(root, "README.md", README_MAX_BYTES),
  );
  if (!loaded.ok) {
    showTaskReadme({ title: path.basename(root), markdown, root }, options);
    shown(path.basename(root));
    return;
  }
  const { manifest } = loaded;
  const [edit, lastOutcome, problems] = await Promise.all([
    resolveEditFiles(root, manifest),
    readLastOutcome(root, manifest.id),
    manifest.problems?.length
      ? loadProblemStates(
          root,
          manifest,
          await fetchProblemResults(manifest.id).catch(() => undefined),
        )
      : Promise.resolve(undefined),
  ]);
  showTaskReadme(
    {
      title: manifest.title,
      markdown,
      root,
      guide: {
        root,
        manifest,
        edit,
        ...(lastOutcome ? { lastOutcome } : {}),
        ...(problems ? { problems } : {}),
      },
    },
    options,
  );
  shown(manifest.title, problems);
}

/** 課題文 (README.md) を OS のタブ付きで表示する。ファイルを読むだけなので信頼は問わない。 */
async function showTaskReadmeCommand(requested?: unknown): Promise<void> {
  const root = await requestedTaskRoot(requested);
  if (!root) {
    void vscode.window.showInformationMessage(
      "課題フォルダーのファイルを開いてから実行してください (.stella/task.json がある課題フォルダー)",
    );
    return;
  }
  try {
    await renderTaskReadme(root);
  } catch (e) {
    void vscode.window.showErrorMessage(
      `課題文を表示できませんでした: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
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

export function registerTaskCommands(context: vscode.ExtensionContext): void {
  registerSubmissionForms(context);
  const output = vscode.window.createOutputChannel("STELLA 実行ログ");
  context.subscriptions.push(
    output,
    vscode.commands.registerCommand("stella.submitTask", (root?: string) =>
      submitTaskCommand("submit", root),
    ),
    vscode.commands.registerCommand("stella.consultTask", (root?: string, problemId?: unknown) =>
      submitTaskCommand("consult", root, problemId),
    ),
    vscode.commands.registerCommand("stella.runTask", (root?: unknown) =>
      runTaskCommand(output, root),
    ),
    vscode.commands.registerCommand("stella.diagnoseEnvironment", () => diagnoseCommand(output)),
    vscode.commands.registerCommand("stella.showRunLog", () => output.show(true)),
    vscode.commands.registerCommand("stella.showTaskReadme", (root?: unknown) =>
      showTaskReadmeCommand(root),
    ),
    vscode.commands.registerCommand("stella.openTaskFile", (root: unknown, rel: unknown) =>
      openTaskFileCommand(root, rel).catch((e: unknown) => {
        void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
      }),
    ),
  );
}
