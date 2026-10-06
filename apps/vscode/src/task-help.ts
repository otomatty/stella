/**
 * 課題パネルの「ヒント・解答・解説・参照元・レビューの結果」(#36・07 §8)。
 *
 * - 何を開けるかはサーバー (`/api/tasks/help`) が `@stella/shared/tasks/help` の表で決める。
 *   拡張は同じ表の結果を表示するだけで、本文は開いた素材のぶんしか受け取らない。
 * - 開くと支援の記録に残る (罰ではなく記録)。合格前の解答例だけ、開く前に確かめる。
 * - 素材は配布記録 (`.stella/distribution.json`) の版のものを受け取る (手元の版と違う版を出さない)。
 * - 解答例は学習フォルダーに書き出さず、拡張にも控えない。読み取り専用の仮想ドキュメント
 *   (`stella-solution:`) は開くたびに今の接続の受講者で LMS に確かめて読み、VS Code の差分エディタ
 *   (`vscode.diff`) で自分のコードと並べる。接続が変わったら、ヘルプのパネルを閉じ、開いている
 *   解答例のドキュメントを読み直させる (前の受講者の解答例を残さない)。
 * - パネルはスクリプトを動かさない。リンクは公開の HTTP(S) と、このファイルが登録する固定の
 *   コマンドだけ。コマンドの引数 (課題フォルダー・素材の種類・段・ファイル) は受け取るたびに検証し、
 *   課題ファイルや画面の文字列をコマンドにしない。ファイルを読むだけなので信頼は問わない。
 */

import { lstat } from "node:fs/promises";
import path from "node:path";
import type { OsName } from "@stella/shared/markdown/os-blocks";
import type { LearnerAiFeedback } from "@stella/shared/review/ai-review";
import { FINDING_SEVERITY_LABELS } from "@stella/shared/review/ai-review";
import { TASK_STATUS_LABELS } from "@stella/shared/tasks/catalog";
import {
  HELP_ITEMS,
  HELP_LOCK_LABELS,
  type HelpItem,
  type HelpItemView,
  type TaskHelpResponse,
} from "@stella/shared/tasks/help";
import {
  isSafeRelativePattern,
  TASK_KIND_LABELS,
  type TaskManifest,
} from "@stella/shared/tasks/manifest";
import * as vscode from "vscode";
import { apiRequest } from "./api.js";
import { onDidChangeAuth } from "./auth.js";
import { defaultOsForPlatform, escapeHtml, markdownToHtml, OS_TABS_CSS } from "./lesson-doc.js";
import { loadTask } from "./runner/run-task.js";
import { isInside, locateTask, workspaceRoots } from "./task-commands.js";
import { referencesHtml } from "./task-panel.js";
import { readDistribution } from "./task-submission.js";

/** 受講者向けの提出の詳細 (`GET /api/submissions/:id`) のうち、パネルに出す部分。 */
export interface LearnerSubmissionView {
  attempt: number;
  submitted_at: string;
  verdict: "pass" | "resubmit" | "fail" | null;
  review_notes: string;
  ai_suggestions: unknown[];
  ai_feedback?: LearnerAiFeedback | null;
}

const VERDICT_LABELS = { pass: "合格", resubmit: "再提出", fail: "不合格" } as const;

/** 解答例の仮想ドキュメントの scheme。読み取り専用で、ディスクに書かない。 */
export const SOLUTION_SCHEME = "stella-solution";

const command = (id: string, args: unknown[]) =>
  `command:${id}?${encodeURIComponent(JSON.stringify(args))}`;

function decode(base64: string): string {
  return Buffer.from(base64, "base64").toString("utf8");
}

function isBinary(text: string): boolean {
  return text.includes("\u0000") || text.includes("�");
}

function lockedHtml(view: Extract<HelpItemView, { state: "locked" }>): string {
  return `<p class="locked">🔒 ${escapeHtml(HELP_LOCK_LABELS[view.reason])}</p>`;
}

function hintsHtml(help: TaskHelpResponse, root: string, os: OsName): string {
  if (help.hints.length === 0) return "";
  const steps = help.hints.map((hint) => {
    const heading = `ヒント ${hint.level}${hint.state === "opened" && hint.title ? ` — ${escapeHtml(hint.title)}` : ""}`;
    if (hint.state === "opened")
      return `<section class="step opened"><h3>${heading}</h3>${markdownToHtml(hint.markdown ?? "", { os })}</section>`;
    if (hint.state === "available")
      return `<section class="step"><h3>${heading}</h3><p><a href="${command("stella.openTaskHelpItem", [root, "hint", hint.level])}">ヒント ${hint.level} を開く</a></p></section>`;
    return `<section class="step"><h3>${heading}</h3>${lockedHtml(hint)}</section>`;
  });
  return `<section><h2>ヒント</h2>${steps.join("\n")}</section>`;
}

function solutionHtml(help: TaskHelpResponse, root: string): string {
  const { solution } = help;
  if (solution.state === "locked" && solution.reason === "not-offered") return "";
  const parts = ["<section><h2>解答例</h2>"];
  if (solution.state === "opened") {
    parts.push(
      "<p>自分のコードと並べて見られます。解答例は読み取り専用で、学習フォルダーには書き出しません。</p>",
    );
    for (const file of solution.files ?? []) {
      const text = decode(file.content);
      parts.push(
        `<h3><code>${escapeHtml(file.path)}</code> ・ <a href="${command("stella.compareTaskSolution", [root, file.path])}">自分のコードと並べて見る</a></h3>`,
        isBinary(text)
          ? "<p>文字ではないファイルなので、ここには表示しません。</p>"
          : `<pre><code>${escapeHtml(text)}</code></pre>`,
      );
    }
  } else if (solution.state === "available") {
    parts.push(
      `<p><a href="${command("stella.openTaskHelpItem", [root, "solution"])}">解答例を開く</a></p>`,
    );
  } else {
    parts.push(lockedHtml(solution));
    if (solution.reason === "attempts" && help.attempts)
      parts.push(
        `<p class="hint">挑戦 ${help.attempts.count} / ${help.attempts.required} 回 (手元の確認で失敗した回数と、提出した回数を数えます)</p>`,
      );
  }
  parts.push("</section>");
  return parts.join("\n");
}

function explanationHtml(help: TaskHelpResponse, root: string, os: OsName): string {
  const { explanation } = help;
  if (explanation.state === "locked" && explanation.reason === "not-offered") return "";
  const body =
    explanation.state === "opened"
      ? markdownToHtml(explanation.markdown ?? "", { os })
      : explanation.state === "available"
        ? `<p><a href="${command("stella.openTaskHelpItem", [root, "explanation"])}">解説を開く</a></p>`
        : lockedHtml(explanation);
  return `<section><h2>解説</h2>${body}</section>`;
}

function suggestionsOf(raw: unknown[]): { line: number; body: string }[] {
  return raw.flatMap((s) =>
    typeof s === "object" &&
    s !== null &&
    typeof (s as { body?: unknown }).body === "string" &&
    (s as { adopted?: unknown }).adopted === true
      ? [{ line: Number((s as { line?: unknown }).line) || 0, body: (s as { body: string }).body }]
      : [],
  );
}

function reviewHtml(help: TaskHelpResponse, review: LearnerSubmissionView | null): string {
  const parts = ["<section><h2>レビューの結果</h2>"];
  if (!help.latestSubmission || !review) {
    parts.push(
      `<p>${help.latestSubmission ? "提出の記録を読めませんでした。Web で確認してください。" : "まだ提出していません。"}</p>`,
    );
  } else if (!review.verdict) {
    parts.push(
      `<p>${review.attempt} 回目の提出: ${escapeHtml(TASK_STATUS_LABELS[help.status])}。結果が出たらここと Web に表示します。</p>`,
    );
  } else {
    parts.push(
      `<p class="verdict ${review.verdict}">${review.attempt} 回目の提出: ${VERDICT_LABELS[review.verdict]}</p>`,
    );
    if (review.review_notes.trim())
      parts.push(`<h3>総評</h3><pre class="notes">${escapeHtml(review.review_notes)}</pre>`);
    const suggestions = suggestionsOf(review.ai_suggestions);
    if (suggestions.length > 0)
      parts.push(
        `<h3>指摘</h3><ul>${suggestions.map((s) => `<li>${s.line > 0 ? `${s.line} 行目: ` : ""}${escapeHtml(s.body)}</li>`).join("")}</ul>`,
      );
    const feedback = review.ai_feedback;
    if (feedback) {
      parts.push(`<h3>AI の所見</h3><p>${escapeHtml(feedback.message)}</p>`);
      if (feedback.goodPoints.length > 0)
        parts.push(
          `<p>良かった点</p><ul>${feedback.goodPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`,
        );
      if (feedback.nextSteps.length > 0)
        parts.push(
          `<p>次に試すこと</p><ul>${feedback.nextSteps.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`,
        );
      if (feedback.findings.length > 0)
        parts.push(
          `<ul>${feedback.findings.map((f) => `<li><span class="badge">${FINDING_SEVERITY_LABELS[f.severity]}</span> <code>${escapeHtml(`${f.file}:${f.startLine}-${f.endLine}`)}</code> ${escapeHtml(f.comment)}</li>`).join("")}</ul>`,
        );
    }
  }
  parts.push("</section>");
  return parts.join("\n");
}

/**
 * 課題パネルの HTML。スクリプトは動かさず、`root` は受け取ったリンクの引数にだけ使う
 * (コマンドの側で改めて検証する)。
 */
export function buildTaskHelpHtml(input: {
  help: TaskHelpResponse;
  manifest?: TaskManifest;
  root: string;
  review?: LearnerSubmissionView | null;
  os?: OsName;
}): string {
  const { help, root } = input;
  const os = input.os ?? defaultOsForPlatform();
  const working = help.phase === "working";
  const body = [
    `<h1>${escapeHtml(help.title)}</h1>`,
    `<p class="meta">${TASK_KIND_LABELS[help.kind]} ・ ${escapeHtml(TASK_STATUS_LABELS[help.status])}</p>`,
    help.notice ? `<p class="notice">${escapeHtml(help.notice)}</p>` : "",
    !help.referencesOnly
      ? `<p class="hint">ヒント・解答例・解説を開くと、支援の記録に残ります。罰ではなく、学習の記録です。${working ? "" : "合格後に開いたものは、合格した提出の記録を変えません。"}</p>`
      : "",
    referencesHtml(input.manifest?.references),
    // 取り組み中の確認A・B・統合は、ヒントと解答を表示しない (07 §8)。合格後は解答例を出す種別がある。
    working && help.referencesOnly ? "" : hintsHtml(help, root, os),
    working && help.referencesOnly ? "" : solutionHtml(help, root),
    working && help.referencesOnly ? "" : explanationHtml(help, root, os),
    reviewHtml(help, input.review ?? null),
    `<p class="links"><a href="${command("stella.showTaskHelp", [root])}">読み込み直す</a></p>`,
  ].join("\n");
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';" />
  <title>${escapeHtml(help.title)}</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      line-height: 1.6;
      padding: 1.25rem 1.5rem 2rem;
      max-width: 52rem;
    }
    h1 { font-size: 1.4em; margin-bottom: 0.25rem; }
    h2 { font-size: 1.15em; margin-top: 1.5rem; }
    h3 { font-size: 1em; margin: 0.5rem 0 0.25rem; }
    pre {
      overflow: auto;
      padding: 0.5rem 0.75rem;
      background: var(--vscode-textCodeBlock-background);
      border-radius: 4px;
    }
    pre.notes { white-space: pre-wrap; font-family: var(--vscode-font-family); }
    code, pre { font-family: var(--vscode-editor-font-family); font-size: 0.9em; }
    a { color: var(--vscode-textLink-foreground); }
    .meta, .hint, .locked { color: var(--vscode-descriptionForeground); }
    .notice {
      padding: 0.5rem 0.75rem;
      border-left: 3px solid var(--vscode-editorWarning-foreground);
    }
    .step {
      margin: 0.5rem 0;
      padding: 0.4rem 0.8rem;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
    }
    .verdict { font-weight: 600; }
    .verdict.pass { color: var(--vscode-testing-iconPassed); }
    .verdict.resubmit, .verdict.fail { color: var(--vscode-testing-iconFailed); }
    .badge {
      display: inline-block;
      padding: 0 0.4rem;
      border-radius: 3px;
      font-size: 0.85em;
      border: 1px solid currentColor;
    }
    ul, ol { padding-left: 1.4rem; }${OS_TABS_CSS}
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

// ---------------------------------------------------------------
// コマンド
// ---------------------------------------------------------------

let solutionChanged: vscode.EventEmitter<vscode.Uri> | undefined;
/**
 * 接続の世代。接続が変わる (受講者の切り替え・切断) たびに進める。仮想ドキュメントの読み込みの
 * 途中で接続が変わったら、前の受講者の権限で取った解答例を返さない。
 */
let authGeneration = 0;

/**
 * 解答例の仮想ドキュメントの URI。拡張子を残し、エディタの色分けを効かせる。中身は持たず、
 * 開くたびにサーバーで今の受講者の解放と開いた記録を確かめて読む (拡張には解答例を控えない)。
 */
export function solutionUri(taskId: string, rel: string, contentHash: string): vscode.Uri {
  return vscode.Uri.from({
    scheme: SOLUTION_SCHEME,
    path: `/${encodeURIComponent(taskId)}/${rel}`,
    query: new URLSearchParams({ contentHash }).toString(),
  });
}

const helpUrl = (taskId: string, contentHash: string) =>
  `/api/tasks/help?${new URLSearchParams({ taskId, contentHash })}`;

const UNAVAILABLE =
  "解答例を表示できません。いま接続している受講者がこの課題の解答例を開いていないか、LMS に接続していません。「STELLA: ヒント・解答・レビューの結果を表示する」から開き直してください。\n";

/**
 * 仮想ドキュメントの中身。今の接続の受講者で LMS に問い合わせ、手元の版でその受講者が開いた
 * 解答例のファイルだけを返す。サーバーが本文を返さなければ (未解放・開いた記録が無い・別の
 * 受講者・未接続) 案内だけを返す。
 */
export async function solutionContent(uri: { path: string; query: string }): Promise<string> {
  const [, encodedTaskId = "", ...rest] = uri.path.split("/");
  const rel = rest.join("/");
  const contentHash = new URLSearchParams(uri.query).get("contentHash") ?? "";
  if (!encodedTaskId || !rel || !/^[a-f0-9]{64}$/.test(contentHash)) return UNAVAILABLE;
  const generation = authGeneration;
  try {
    const help = await apiRequest<TaskHelpResponse>(
      helpUrl(decodeURIComponent(encodedTaskId), contentHash),
    );
    if (generation !== authGeneration) return UNAVAILABLE;
    const file =
      help.solution.state === "opened"
        ? help.solution.files?.find((f) => f.path === rel)
        : undefined;
    return file ? decode(file.content) : UNAVAILABLE;
  } catch {
    return UNAVAILABLE;
  }
}

let helpPanel: vscode.WebviewPanel | undefined;

function showHelpPanel(html: string, title: string): void {
  if (!helpPanel) {
    helpPanel = vscode.window.createWebviewPanel(
      "stella.taskHelp",
      title,
      vscode.ViewColumn.Beside,
      {
        enableScripts: false,
        localResourceRoots: [],
        enableCommandUris: [
          "stella.showTaskHelp",
          "stella.openTaskHelpItem",
          "stella.compareTaskSolution",
        ],
      },
    );
    helpPanel.onDidDispose(() => {
      helpPanel = undefined;
    });
  } else {
    helpPanel.title = title;
    helpPanel.reveal(vscode.ViewColumn.Beside, true);
  }
  helpPanel.webview.html = html;
}

interface HelpTarget {
  root: string;
  taskId: string;
  /** 配布記録 (`.stella/distribution.json`) の版。素材はこの版のものを受け取る。 */
  contentHash: string;
  manifest: TaskManifest;
}

/**
 * リンクやコマンドの引数で受け取った課題フォルダーを確かめる。ワークスペースの中にあり、
 * 課題の定義と LMS から配布した記録がある課題フォルダーだけを受け付ける。
 */
async function resolveTarget(requested: unknown): Promise<HelpTarget> {
  const root = typeof requested === "string" ? requested : await locateTask();
  if (!root || !workspaceRoots().some((owner) => isInside(root, owner)))
    throw new Error("ワークスペースの中の課題フォルダーを開いてください");
  const loaded = await loadTask(root);
  if (!loaded.ok) throw new Error(loaded.errors.join("\n"));
  const receipt = await readDistribution(root);
  if (!receipt || receipt.taskId !== loaded.manifest.id)
    throw new Error(
      "LMS から配布した課題だけで使えます。Web の「VS Code で開く」から課題を開いてください",
    );
  return {
    root,
    taskId: receipt.taskId,
    contentHash: receipt.contentHash,
    manifest: loaded.manifest,
  };
}

async function render(target: HelpTarget, help: TaskHelpResponse): Promise<void> {
  const generation = authGeneration;
  let review: LearnerSubmissionView | null = null;
  if (help.latestSubmission) {
    try {
      review = (
        await apiRequest<{ row: LearnerSubmissionView }>(
          `/api/submissions/${encodeURIComponent(help.latestSubmission.id)}`,
        )
      ).row;
    } catch {
      review = null;
    }
  }
  // 描く前に接続が変わっていたら、前の受講者の素材を描かない。
  if (generation !== authGeneration) return;
  showHelpPanel(
    buildTaskHelpHtml({ help, manifest: target.manifest, root: target.root, review }),
    `支援: ${help.title}`,
  );
  // 開いている解答例のドキュメントに、読み直してよいことを知らせる (中身はサーバーで確かめて読む)。
  if (help.solution.state === "opened")
    for (const file of help.solution.files ?? [])
      solutionChanged?.fire(solutionUri(target.taskId, file.path, target.contentHash));
}

/** パネルを開く。合格後に自動で開く種別 (基礎・接続) は、まだ開いていない解答例と解説を開く。 */
async function showTaskHelpCommand(requested?: unknown): Promise<void> {
  const target = await resolveTarget(requested);
  let help = await apiRequest<TaskHelpResponse>(helpUrl(target.taskId, target.contentHash));
  for (const item of help.autoOpen) {
    if (help[item].state !== "available") continue;
    help = await apiRequest<TaskHelpResponse>("/api/tasks/help/open", {
      method: "POST",
      body: { taskId: target.taskId, item, contentHash: target.contentHash },
    });
  }
  await render(target, help);
}

/** パネルのリンクから、ヒント 1 段・解答例・解説を開く。合格前の解答例だけは開く前に確かめる。 */
async function openTaskHelpItemCommand(
  requested: unknown,
  item: unknown,
  level: unknown,
): Promise<void> {
  if (typeof item !== "string" || !(HELP_ITEMS as readonly string[]).includes(item))
    throw new Error("開けない素材です");
  if (item === "hint" && (typeof level !== "number" || !Number.isInteger(level) || level < 1))
    throw new Error("ヒントの段が不正です");
  const target = await resolveTarget(requested);
  if (item === "solution") {
    const current = await apiRequest<TaskHelpResponse>(helpUrl(target.taskId, target.contentHash));
    if (current.phase === "working") {
      const open = "解答例を開く";
      const choice = await vscode.window.showWarningMessage(
        "解答例を開きますか",
        {
          modal: true,
          detail:
            "開いたことは記録され、この課題のこのあとの提出は「支援付き」になります。罰ではなく、学習の記録です。",
        },
        open,
      );
      if (choice !== open) return;
    }
  }
  const help = await apiRequest<TaskHelpResponse>("/api/tasks/help/open", {
    method: "POST",
    body: {
      taskId: target.taskId,
      item: item as HelpItem,
      ...(item === "hint" ? { level } : {}),
      contentHash: target.contentHash,
    },
  });
  await render(target, help);
}

/**
 * 解答例と自分のコードを差分エディタで並べる。自分のファイルが無ければ解答例だけを開く。
 * 並べる前に、今の受講者がこの版の解答例を開いた記録があり、そのファイルがあるかをサーバーで確かめる。
 */
async function compareTaskSolutionCommand(requested: unknown, rel: unknown): Promise<void> {
  if (typeof rel !== "string" || !isSafeRelativePattern(rel) || /[*?{}[\]]/.test(rel))
    throw new Error("解答例を開き直してから、もう一度選んでください");
  const target = await resolveTarget(requested);
  const help = await apiRequest<TaskHelpResponse>(helpUrl(target.taskId, target.contentHash));
  if (help.solution.state !== "opened" || !help.solution.files?.some((f) => f.path === rel))
    throw new Error("解答例を開き直してから、もう一度選んでください");
  const left = solutionUri(target.taskId, rel, target.contentHash);
  const own = path.join(target.root, ...rel.split("/"));
  if (!isInside(own, target.root)) throw new Error("課題フォルダーの外のファイルは開けません");
  const exists = await lstat(own).then(
    (stat) => stat.isFile(),
    () => false,
  );
  if (!exists) {
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(left), {
      preview: true,
    });
    void vscode.window.showInformationMessage(
      `課題フォルダーに ${rel} が無いので、解答例だけを開きました`,
    );
    return;
  }
  await vscode.commands.executeCommand(
    "vscode.diff",
    left,
    vscode.Uri.file(own),
    `${rel}: 解答例 ↔ 自分のコード`,
    { preview: true },
  );
}

async function reportErrors(work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch (error) {
    void vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}

/**
 * 接続が変わった (受講者の切り替え・切断): 前の受講者の素材を残さない。ヘルプのパネルを閉じ、
 * 開いている解答例のドキュメントには読み直しを知らせる (今の接続でサーバーに確かめ直すので、
 * 開いた記録の無い受講者には案内だけになる)。拡張は解答例を控えていない。
 */
export function forgetTaskHelp(): void {
  authGeneration += 1;
  helpPanel?.dispose();
  helpPanel = undefined;
  for (const document of vscode.workspace.textDocuments)
    if (document.uri.scheme === SOLUTION_SCHEME) solutionChanged?.fire(document.uri);
}

export function registerTaskHelp(context: vscode.ExtensionContext): void {
  solutionChanged = new vscode.EventEmitter<vscode.Uri>();
  const provider: vscode.TextDocumentContentProvider = {
    onDidChange: solutionChanged.event,
    provideTextDocumentContent: (uri) => solutionContent(uri),
  };
  context.subscriptions.push(
    solutionChanged,
    onDidChangeAuth(() => forgetTaskHelp()),
    vscode.workspace.registerTextDocumentContentProvider(SOLUTION_SCHEME, provider),
    vscode.commands.registerCommand("stella.showTaskHelp", (root?: unknown) =>
      reportErrors(() => showTaskHelpCommand(root)),
    ),
    vscode.commands.registerCommand(
      "stella.openTaskHelpItem",
      (root: unknown, item: unknown, level: unknown) =>
        reportErrors(() => openTaskHelpItemCommand(root, item, level)),
    ),
    vscode.commands.registerCommand("stella.compareTaskSolution", (root: unknown, rel: unknown) =>
      reportErrors(() => compareTaskSolutionCommand(root, rel)),
    ),
  );
}
