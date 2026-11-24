/**
 * 「課題を確認する」の結果パネル。スクリプトは動かさず、HTML だけを描く。
 * 先頭に確認の要約と提出のボタンを置き、直すところのある手順を先に出す。
 * 出典の HTTP(S) リンクと、許可した再実行・ログ表示のコマンドだけを使う。
 * 課題文 (README.md) を OS のタブ付きで開くパネル (先頭に「進め方」) も、ここに置く。
 *
 * 課題のパネル (課題文・確認の結果・ヒント) は、狭いときは同じグループのタブにまとめる。
 * 広いときは、左の列でファイルを開いていれば右の列 (2 列目) にそろえる (`sideColumn`)。
 */

import { randomBytes } from "node:crypto";
import { type CiRunClaim, safeHttpsHref } from "@stella/shared/tasks/ci-run";
import { TASK_HELP_POLICIES } from "@stella/shared/tasks/help";
import { TASK_KIND_LABELS, type TaskManifest } from "@stella/shared/tasks/manifest";
import {
  canSubmit,
  RUN_OUTCOME_LABELS,
  type RunResult,
  type RunStepResult,
  type TestCaseResult,
} from "@stella/shared/tasks/run-result";
import { RUNNERS } from "@stella/shared/tasks/runners";
import * as vscode from "vscode";
import {
  isPublicSourceUrl,
  type PublicSourceReference,
} from "@stella/shared/tasks/source-reference";
import type { OsName } from "@stella/shared/markdown/os-blocks";
import { defaultOsForPlatform, escapeHtml, markdownToHtml, OS_TABS_CSS } from "./markdown-html.js";
import {
  buildTaskGuideHtml,
  GUIDE_COMMANDS,
  GUIDE_CSS,
  guideMetaText,
  stripLeadingTitle,
  type TaskGuideInput,
} from "./task-guide.js";
import {
  countTests,
  remainingSteps,
  RUN_SUMMARY_CSS,
  shortStepLabel,
  STEP_MARKS,
  stepChips,
  type StepSummary,
  testBar,
  type TestCounts,
} from "./task-run-summary.js";
import { expectedActual } from "./task-test-message.js";

export const NARROW_WIDTH = 420;
export const WIDE_WIDTH = 900;
let compact = false;
const taskSidePanels = new Set<vscode.WebviewPanel>();

export function isCompactTaskLayout(): boolean {
  return compact;
}

export function trackTaskSidePanel(panel: vscode.WebviewPanel): void {
  taskSidePanels.add(panel);
  panel.onDidDispose(() => {
    taskSidePanels.delete(panel);
  });
}

export function decideReadmeLayout(input: {
  compact: boolean;
  width: number;
  inSideColumn: boolean;
  hasLeftEditor: boolean;
  groupHasOtherTabs: boolean;
}): "collapse" | "expand" | "stay" {
  if (!input.compact && input.inSideColumn && input.hasLeftEditor && input.width < NARROW_WIDTH)
    return "collapse";
  if (input.compact && input.width >= WIDE_WIDTH && input.groupHasOtherTabs) return "expand";
  return "stay";
}

/** 左の列 (1 列目) で開いているテキストエディター。 */
function leftTextEditor(): vscode.TextEditor | undefined {
  return vscode.window.visibleTextEditors?.find(
    (editor) => editor.viewColumn === vscode.ViewColumn.One,
  );
}

function hasLeftEditor(): boolean {
  return leftTextEditor() !== undefined;
}

function activeColumn(): vscode.ViewColumn {
  return vscode.window.tabGroups.activeTabGroup?.viewColumn ?? vscode.ViewColumn.Active;
}

/**
 * 課題のパネルを出す列。左の列でファイルを開いていれば右の列 (2 列目) にそろえる —
 * パネルのリンクから開くたびに「隣」へ 3 列目・4 列目を作らないため。
 */
export function sideColumn(): vscode.ViewColumn {
  if (compact) return activeColumn();
  return hasLeftEditor() ? vscode.ViewColumn.Two : vscode.ViewColumn.Beside;
}

const VIEW_TYPE = "stella.taskResult";
let currentPanel: vscode.WebviewPanel | undefined;

export type TaskPanelInput =
  | {
      kind: "result";
      manifest: TaskManifest;
      result: RunResult /** 結果を残さない実行 (課題外の環境診断) */;
      standalone?: boolean;
      root?: string;
    }
  | { kind: "invalid"; root: string; errors: string[] };

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} 秒`;
}

/** 帰属表示の文言と、原作者・再利用範囲・利用条件・条件の確認日。詳細に畳まず常に見せる。 */
function attributionHtml(ref: PublicSourceReference): string {
  if (!ref.attribution) return "";
  const text = `<p>${escapeHtml(ref.attribution)}</p>`;
  const terms = ref.attributionTerms;
  if (!terms) return text;
  const url = escapeHtml(terms.conditionsUrl);
  const conditions = isPublicSourceUrl(terms.conditionsUrl) ? `<a href="${url}">${url}</a>` : url;
  return `${text}<p>原作者: ${escapeHtml(terms.creator)} / 再利用範囲: ${escapeHtml(terms.scope)} / 利用条件: ${conditions} / 条件確認日: ${escapeHtml(terms.checkedAt)}</p>`;
}

/** 課題の参照元 (出典・読む箇所・帰属表示)。リンクは公開の HTTP(S) だけ。 */
export function referencesHtml(references: readonly PublicSourceReference[] | undefined): string {
  if (!references?.length) return "";
  return `<section class="references"><h2>参照元</h2><ul>${references.map((ref) => `<li>${isPublicSourceUrl(ref.url) ? `<a href="${escapeHtml(ref.url)}">${escapeHtml(ref.title)}</a>` : escapeHtml(ref.title)} — ${escapeHtml(ref.publisher)} / ${escapeHtml(ref.section)}${attributionHtml(ref)}</li>`).join("")}</ul></section>`;
}

function renderFailedTest(test: TestCaseResult): string {
  const file = test.file ? ` <span class="file">${escapeHtml(test.file)}</span>` : "";
  const message = test.message ?? "";
  const comparison = message ? expectedActual(message) : undefined;
  const fullMessage =
    message && (!comparison || /[\r\n]/.test(message)) ? `<pre>${escapeHtml(message)}</pre>` : "";
  const values = comparison
    ? `<dl class="expected-actual"><dt>期待</dt><dd class="expected">${escapeHtml(comparison.expected)}</dd><dt>実際</dt><dd class="actual">${escapeHtml(comparison.actual)}</dd></dl>`
    : "";
  const details =
    comparison && fullMessage
      ? `<details><summary>メッセージの全文</summary>${fullMessage}</details>`
      : fullMessage;
  return `<div class="test-fail"><p class="test-name">${escapeHtml(test.name)}${file}</p>${values}${details}</div>`;
}

function renderPassedTests(tests: readonly TestCaseResult[] = []): string {
  const others = tests.filter((test) => test.status !== "failed");
  if (others.length === 0) return "";
  const skipped = others.filter((test) => test.status === "skipped").length;
  return `<details><summary>通ったテスト ${others.length - skipped} 件${skipped ? `・省略 ${skipped} 件` : ""}</summary><ul class="tests ok">${others
    .map((test) => `<li>${STEP_MARKS[test.status]} ${escapeHtml(test.name)}</li>`)
    .join("")}</ul></details>`;
}

function renderStep(step: RunStepResult, counts: TestCounts): string {
  const parts: string[] = [
    `<section class="step ${step.status}">`,
    `<h3><span class="mark">${STEP_MARKS[step.status]}</span> ${escapeHtml(step.label)} <span class="time">${seconds(step.durationMs)}</span>${step.tests?.length ? testBar(counts, true) : ""}</h3>`,
    `<p>${escapeHtml(step.summary)}</p>`,
  ];
  const failed = step.tests?.filter((test) => test.status === "failed") ?? [];
  const expandedLimit = 5;
  parts.push(...failed.slice(0, expandedLimit).map(renderFailedTest));
  if (failed.length > expandedLimit) {
    parts.push(
      `<details><summary>ほかに直すテスト ${failed.length - expandedLimit} 件</summary>${failed.slice(expandedLimit).map(renderFailedTest).join("")}</details>`,
    );
  }
  parts.push(renderPassedTests(step.tests));
  if (step.lint && step.lint.length > 0) {
    parts.push(
      `<ul class="lint">${step.lint
        .map(
          (f) =>
            `<li><span class="badge ${f.severity === "error" ? "failed" : "skipped"}">${f.severity === "error" ? "エラー" : "警告"}</span> <span class="file">${escapeHtml(`${f.file}:${f.line}:${f.column}`)}</span> ${escapeHtml(f.message)}${f.ruleId ? ` <span class="rule">(${escapeHtml(f.ruleId)})</span>` : ""}</li>`,
        )
        .join("")}</ul>`,
    );
  }
  if (step.files && step.files.length > 0) {
    parts.push(
      `<ul class="files">${step.files.map((f) => `<li><code>${escapeHtml(f)}</code></li>`).join("")}</ul>`,
    );
  }
  if (step.logTail) {
    parts.push(
      `<details><summary>出力の末尾</summary><pre>${escapeHtml(step.logTail)}</pre></details>`,
    );
  }
  parts.push(`</section>`);
  return parts.join("\n");
}

function renderPassedStep(step: RunStepResult): string {
  return `<li class="${step.status}"><div class="row"><b>${STEP_MARKS[step.status]}</b><span class="step-name">${escapeHtml(step.label)}</span><span class="step-summary">${escapeHtml(step.summary)}</span><span class="time">${seconds(step.durationMs)}</span></div>${renderPassedTests(step.tests)}</li>`;
}

/** 外へのリンク。https の URL だけをリンクにし、それ以外は文字のまま出す。 */
function externalLink(url: string): string {
  const href = safeHttpsHref(url);
  return href ? `<a href="${escapeHtml(href)}">${escapeHtml(url)}</a>` : escapeHtml(url);
}

/** CI と公開の課題で控えた、実行・公開先の URL と手元のコミット (07 §5.5)。 */
export function ciClaimHtml(claim: CiRunClaim | undefined, workflow: string | undefined): string {
  if (!claim) return "";
  return [
    `<section class="ci"><h2>CI の実行と公開先</h2><ul>`,
    `<li>実行: ${externalLink(claim.runUrl)}</li>`,
    `<li>公開先: ${externalLink(claim.deployUrl)}</li>`,
    claim.commit ? `<li>手元のコミット: <code>${escapeHtml(claim.commit)}</code></li>` : "",
    `</ul><p class="hint">提出すると、LMS が GitHub の公開 API で、この実行が成功で終わったこと・手元と同じコミットの実行であること・課題のワークフロー${workflow ? ` (<code>${escapeHtml(workflow)}</code>)` : ""} の実行であることを確かめます。リポジトリは公開にしてください。確かめられないときは管理者が確認します。</p></section>`,
  ].join("");
}

function renderResult(input: Extract<TaskPanelInput, { kind: "result" }>): {
  title: string;
  body: string;
} {
  const { manifest, result } = input;
  const runner = RUNNERS[manifest.runner];
  const versions = Object.entries(result.toolVersions)
    .map(([tool, version]) => `${tool} ${version}`)
    .join(" / ");
  const commandArgs = input.root
    ? `?${escapeHtml(encodeURIComponent(JSON.stringify([input.root])))}`
    : "";
  const submissionArgs =
    input.root && result.problemId
      ? `?${escapeHtml(encodeURIComponent(JSON.stringify([input.root, result.problemId])))}`
      : commandArgs;
  const { outcome } = result;
  const steps: StepSummary[] = [];
  const repairs: string[] = [];
  const passedSteps: string[] = [];
  for (const step of result.steps) {
    const tests = countTests(step.tests);
    steps.push({ label: shortStepLabel(step.label), status: step.status, tests });
    if (step.status === "failed" || step.status === "error") {
      repairs.push(renderStep(step, tests));
    } else {
      passedSteps.push(renderPassedStep(step));
    }
  }
  const summaryLines = {
    failed: [...remainingSteps(steps), "まだ何も送っていません"].filter(Boolean).join(" ・ "),
    error: input.standalone ? "" : "まだ何も送っていません",
    passed:
      !input.standalone && result.problemId
        ? "この問題は通りました。提出すると次の問題を開きます。"
        : "手元の確認はすべて通りました。",
    cancelled: "途中で止めたので、結果は残していません。",
  };
  const summaryLine = summaryLines[outcome];
  const action = input.standalone
    ? `<a class="button" href="command:stella.diagnoseEnvironment">もう一度確認する</a>`
    : `<a class="button" href="command:stella.submitTask${submissionArgs}">提出する</a>`;
  const links = [
    !input.standalone && outcome !== "cancelled" && !canSubmit(result)
      ? `<a href="command:stella.consultTask${submissionArgs}">管理者に相談</a>`
      : "",
    `<a href="command:stella.showRunLog">実行ログを表示</a>`,
    input.standalone
      ? ""
      : `<a href="command:stella.showTaskHelp${commandArgs}">${TASK_HELP_POLICIES[manifest.kind].hints ? "ヒント・解答・レビューの結果" : "レビューの結果"}</a>`,
  ];
  const problemLine = result.problemId
    ? `<p class="meta">問題 <code>${escapeHtml(result.problemId)}</code></p>`
    : "";
  const body = [
    `<h1>${escapeHtml(manifest.title)}</h1>`,
    `<p class="meta">${input.standalone ? "" : `${TASK_KIND_LABELS[manifest.kind]} ・ `}${escapeHtml(runner.label)}</p>`,
    problemLine,
    referencesHtml(manifest.references),
    `<div class="summary ${outcome}"><span class="summary-mark" aria-hidden="true">${STEP_MARKS[outcome === "cancelled" ? "skipped" : outcome]}</span><div class="summary-text"><p class="summary-title">${RUN_OUTCOME_LABELS[outcome]}</p>${summaryLine ? `<p class="summary-sub">${summaryLine}</p>` : ""}</div>${action}</div>`,
    stepChips(steps),
    ...repairs,
    passedSteps.length ? `<ul class="passed-steps">${passedSteps.join("\n")}</ul>` : "",
    ciClaimHtml(result.ci, manifest.ci?.workflow),
    `<p class="links">${links.filter(Boolean).join(" ・ ")}</p>`,
    `<p class="hint">${escapeHtml(result.platform)}${versions ? ` ・ ${escapeHtml(versions)}` : ""} ・ ${seconds(result.durationMs)}</p>`,
  ].join("\n");
  return { title: manifest.title, body };
}

function renderInvalid(input: Extract<TaskPanelInput, { kind: "invalid" }>): {
  title: string;
  body: string;
} {
  return {
    title: "課題の定義を読めません",
    body: [
      `<h1>課題の定義を読めません</h1>`,
      `<p><code>${escapeHtml(input.root)}</code> の <code>.stella/task.json</code> に次の問題があります。課題の配布ファイルを確認するか、管理者に相談してください。</p>`,
      `<ul>${input.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`,
    ].join("\n"),
  };
}

export function buildTaskPanelHtml(input: TaskPanelInput): string {
  const { title, body } = input.kind === "result" ? renderResult(input) : renderInvalid(input);
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';" />
  <title>${escapeHtml(title)}</title>
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
    h3 { font-size: 1em; margin: 0 0 0.25rem; }
    pre {
      overflow: auto;
      padding: 0.5rem 0.75rem;
      background: var(--vscode-textCodeBlock-background);
      border-radius: 4px;
      white-space: pre-wrap;
    }
    code, pre, .file { font-family: var(--vscode-editor-font-family); font-size: 0.9em; }
    a { color: var(--vscode-textLink-foreground); }
    .meta, .hint, .time, .rule { color: var(--vscode-descriptionForeground); }
    .hint, .time { font-size: 0.9em; }
    .summary {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      flex-wrap: wrap;
      padding: 0.7rem 0.9rem;
      border-radius: 6px;
      margin: 0.8rem 0 0.5rem;
      border: 1px solid var(--vscode-panel-border);
      border-left-width: 3px;
      background: var(--vscode-textBlockQuote-background);
    }
    .summary.passed { border-left-color: var(--vscode-testing-iconPassed); }
    .summary.failed { border-left-color: var(--vscode-testing-iconFailed); }
    .summary.error { border-left-color: var(--vscode-editorWarning-foreground); }
    .summary-mark {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      font-size: 15px;
      color: var(--vscode-editor-background);
      background: var(--vscode-descriptionForeground);
      flex: none;
    }
    .summary.passed .summary-mark { background: var(--vscode-testing-iconPassed); }
    .summary.failed .summary-mark { background: var(--vscode-testing-iconFailed); }
    .summary.error .summary-mark { background: var(--vscode-editorWarning-foreground); }
    .summary-text { flex: 1; min-width: 150px; }
    .summary p { margin: 0; }
    .summary-title { font-weight: 600; font-size: 1.15em; }
    .summary-sub { color: var(--vscode-descriptionForeground); font-size: 0.9em; }
    .button {
      display: inline-block;
      padding: 0.3rem 0.9rem;
      border-radius: 3px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      text-decoration: none;
    }
    .button:hover { background: var(--vscode-button-hoverBackground); }
    .step {
      margin: 0.75rem 0;
      padding: 0.6rem 0.9rem;
      border: 1px solid var(--vscode-panel-border);
      border-left-width: 3px;
      border-radius: 4px;
    }
    .step.failed { border-left-color: var(--vscode-testing-iconFailed); }
    .step.error { border-left-color: var(--vscode-editorWarning-foreground); }
    .step h3 { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
    .step h3 .tests-line { flex: 1 1 9rem; max-width: 17rem; margin-inline-start: auto; }
    .step.failed .mark { color: var(--vscode-testing-iconFailed); }
    .step.error .mark { color: var(--vscode-editorWarning-foreground); }
    .step p { margin: 0.25rem 0; }
    .test-fail {
      margin: 0.5rem 0;
      padding: 0.45rem 0.7rem;
      border-radius: 4px;
      background: var(--vscode-textCodeBlock-background);
    }
    .test-fail .test-name { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
    .test-name::before { content: "✗ "; color: var(--vscode-testing-iconFailed); }
    .test-name .file { font-weight: normal; color: var(--vscode-descriptionForeground); }
    .test-fail pre, .expected-actual { font-size: 0.9em; }
    .test-fail pre {
      margin: 0.3rem 0 0;
      padding: 0;
      background: transparent;
      color: var(--vscode-testing-iconFailed);
    }
    .expected-actual {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 0.1rem 0.7rem;
      margin: 0.3rem 0 0;
    }
    .expected-actual dt { color: var(--vscode-descriptionForeground); }
    .expected-actual dd {
      margin: 0;
      font-family: var(--vscode-editor-font-family);
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
    .expected-actual .expected { color: var(--vscode-testing-iconPassed); }
    .expected-actual .actual { color: var(--vscode-testing-iconFailed); }
    .passed-steps { list-style: none; padding: 0; margin: 0.6rem 0; }
    .passed-steps > li { padding: 0.28rem 0.2rem; border-bottom: 1px solid var(--vscode-panel-border); }
    .passed-steps .row { display: flex; gap: 0.6rem; align-items: baseline; }
    .passed-steps b { color: var(--vscode-testing-iconPassed); }
    .passed-steps li.skipped b { color: var(--vscode-descriptionForeground); }
    .passed-steps .time { white-space: nowrap; }
    .step-summary { color: var(--vscode-descriptionForeground); font-size: 0.9em; flex: 1; }
    .step-name, .step-summary { overflow-wrap: anywhere; min-width: 0; }
    .badge {
      display: inline-block;
      padding: 0 0.4rem;
      border-radius: 3px;
      font-size: 0.85em;
      border: 1px solid currentColor;
    }
    .badge.failed { color: var(--vscode-testing-iconFailed); }
    .badge.skipped { color: var(--vscode-descriptionForeground); }
    ul, ol { padding-left: 1.4rem; }
    .tests.ok { color: var(--vscode-descriptionForeground); }${RUN_SUMMARY_CSS}
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

export function showTaskPanel(input: TaskPanelInput, options: { reveal?: boolean } = {}): void {
  if (!currentPanel && options.reveal === false) return;
  const html = buildTaskPanelHtml(input);
  const title = input.kind === "result" ? `確認: ${input.manifest.title}` : "課題の定義";
  if (!currentPanel) {
    currentPanel = vscode.window.createWebviewPanel(VIEW_TYPE, title, sideColumn(), {
      enableScripts: false,
      localResourceRoots: [],
      enableCommandUris: [
        "stella.diagnoseEnvironment",
        "stella.showRunLog",
        "stella.submitTask",
        "stella.consultTask",
        "stella.showTaskHelp",
      ],
    });
    trackTaskSidePanel(currentPanel);
    currentPanel.onDidDispose(() => {
      currentPanel = undefined;
    });
  } else {
    currentPanel.title = title;
    if (options.reveal !== false) currentPanel.reveal(sideColumn(), true);
  }
  currentPanel.webview.html = html;
}

// ---------------------------------------------------------------
// 課題文 (README.md)
// ---------------------------------------------------------------

const README_VIEW_TYPE = "stella.taskReadme";
let readmePanel: vscode.WebviewPanel | undefined;
/** 課題文のパネルが出している課題フォルダー。 */
let readmeRoot: string | undefined;
let readmeVisibleListener: ((root: string) => void) | undefined;

export function onTaskReadmeVisible(listener: (root: string) => void): vscode.Disposable {
  readmeVisibleListener = listener;
  return {
    dispose: () => {
      if (readmeVisibleListener === listener) readmeVisibleListener = undefined;
    },
  };
}

export interface TaskReadmeInput {
  title: string;
  markdown: string;
  os?: OsName;
  /** 課題の定義を読めたときの「進め方」。読めなければ課題文だけを出す。 */
  guide?: Omit<TaskGuideInput, "os">;
}

/**
 * 課題文のパネルの HTML。描画はレッスンのドキュメントと同じで、生の HTML は文字のまま出す。
 * OS 別のブロックは `os` (既定は `process.platform` の OS) のタブを開いておく (07 §11)。
 * 課題の定義を読めたときは、見出しの下に「進め方」を置き、課題文の先頭の同じ見出しは外す。
 * 課題文の中のリンクは HTTP(S) と mailto だけで、コマンドのリンクは「進め方」にしか出ない。
 */
export function buildTaskReadmeHtml(input: TaskReadmeInput): string {
  const nonce = randomBytes(16).toString("base64");
  const os = input.os ?? defaultOsForPlatform();
  const guide = input.guide;
  const body = guide
    ? [
        `<h1>${escapeHtml(input.title)}</h1>`,
        `<p class="meta">${escapeHtml(guideMetaText(guide.manifest))}</p>`,
        buildTaskGuideHtml({ ...guide, os }),
        `<h2 class="readme-title">課題文</h2>`,
        markdownToHtml(stripLeadingTitle(input.markdown, input.title), { os }),
      ].join("\n")
    : markdownToHtml(input.markdown, { os });
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'nonce-${nonce}';" />
  <title>${escapeHtml(input.title)}</title>
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
    h1, h2, h3, h4, h5, h6 { font-weight: 600; line-height: 1.3; }
    h1 { font-size: 1.4em; margin-bottom: 0.25rem; }
    pre {
      overflow: auto;
      padding: 0.75rem 1rem;
      background: var(--vscode-textCodeBlock-background);
      border-radius: 4px;
    }
    code { font-family: var(--vscode-editor-font-family); font-size: 0.9em; }
    a { color: var(--vscode-textLink-foreground); }
    ul, ol { padding-left: 1.4rem; }
    blockquote {
      margin: 0.75rem 0;
      padding: 0.15rem 0 0.15rem 0.9rem;
      border-left: 3px solid var(--vscode-textBlockQuote-border);
    }
    table { border-collapse: collapse; margin: 0.75rem 0; }
    th, td {
      border: 1px solid var(--vscode-panel-border);
      padding: 0.35rem 0.6rem;
      text-align: left;
    }${OS_TABS_CSS}${GUIDE_CSS}
  </style>
</head>
<body>
${body}
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const reportWidth = () => vscode.postMessage({ type: "layout", width: Math.round(window.innerWidth) });
  let resizeTimer;
  reportWidth();
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(reportWidth, 150);
  });
</script>
</body>
</html>`;
}

function updateReadmeLayout(panel: vscode.WebviewPanel, message: unknown): void {
  if (
    !panel.visible ||
    !message ||
    typeof message !== "object" ||
    !("type" in message) ||
    message.type !== "layout" ||
    !("width" in message) ||
    typeof message.width !== "number" ||
    !Number.isFinite(message.width) ||
    message.width <= 0
  )
    return;

  const editor = leftTextEditor();
  const group = vscode.window.tabGroups.all.find((group) => group.viewColumn === panel.viewColumn);
  const layout = decideReadmeLayout({
    compact,
    width: message.width,
    inSideColumn: panel.viewColumn !== vscode.ViewColumn.One,
    hasLeftEditor: editor !== undefined,
    groupHasOtherTabs: group !== undefined && group.tabs.length > 1,
  });
  if (layout === "collapse" && editor) {
    compact = true;
    const document = editor.document;
    for (const sidePanel of taskSidePanels) {
      if (sidePanel.viewColumn !== vscode.ViewColumn.One) {
        sidePanel.reveal(vscode.ViewColumn.One, true);
      }
    }
    panel.reveal(vscode.ViewColumn.One, true);
    void vscode.window
      .showTextDocument(document, { viewColumn: vscode.ViewColumn.One, preview: false })
      .then(undefined, () => undefined);
  } else if (layout === "expand") {
    compact = false;
    panel.reveal(vscode.ViewColumn.Two, true);
  }
}

/** いま課題文のパネルが出している課題フォルダー。閉じていれば undefined。 */
export function taskReadmeRoot(): string | undefined {
  return readmePanel ? readmeRoot : undefined;
}

/**
 * 課題文のパネルを開く (描き直す)。スクリプトは幅の通知だけを行い、コマンドのリンクは
 * 「進め方」の固定のコマンドだけを許す。広いときは右の列に出してファイルにフォーカスを残す。
 * `reveal: false` なら前面に出さずに描き直す。
 */
export function showTaskReadme(
  input: TaskReadmeInput & { root?: string },
  options: { reveal?: boolean } = {},
): void {
  // 背景の描き直しは、同じ課題を出しているパネルだけを新しくする。読み込みを待つ間に
  // 受講者がパネルを閉じた・別の課題の課題文に切り替えたなら、作り直しも上書きもしない
  // (確かめるのは書き込む直前のここ。呼び出し元の確認は読み込みより前なので間に合わない)。
  if (options.reveal === false && (!readmePanel || readmeRoot !== input.root)) return;
  const html = buildTaskReadmeHtml(input);
  const title = `課題: ${input.title}`;
  const beside = hasLeftEditor() && !compact;
  readmeRoot = input.root;
  if (!readmePanel) {
    const panel = vscode.window.createWebviewPanel(
      README_VIEW_TYPE,
      title,
      {
        viewColumn: beside ? vscode.ViewColumn.Two : activeColumn(),
        preserveFocus: beside,
      },
      { enableScripts: true, localResourceRoots: [], enableCommandUris: [...GUIDE_COMMANDS] },
    );
    readmePanel = panel;
    const messages = panel.webview.onDidReceiveMessage((message: unknown) => {
      updateReadmeLayout(panel, message);
    });
    panel.onDidDispose(() => {
      messages.dispose();
      readmePanel = undefined;
      readmeRoot = undefined;
    });
    let wasVisible = panel.visible;
    const refreshedAt = new Map<string, number>();
    panel.onDidChangeViewState(({ webviewPanel }) => {
      const becameVisible = webviewPanel.visible && !wasVisible;
      wasVisible = webviewPanel.visible;
      const root = readmeRoot;
      if (!becameVisible || !root || !readmeVisibleListener) return;
      const now = Date.now();
      const previous = refreshedAt.get(root);
      if (previous !== undefined && now - previous < 30_000) return;
      refreshedAt.set(root, now);
      readmeVisibleListener(root);
    });
  } else {
    readmePanel.title = title;
    if (options.reveal !== false)
      readmePanel.reveal(beside ? vscode.ViewColumn.Two : activeColumn(), beside);
  }
  readmePanel.webview.html = html;
}
