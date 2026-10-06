/**
 * 「課題を確認する」の結果パネル。スクリプトは動かさず、HTML だけを描く。
 * 合格時は提出、不合格時は講師への相談を案内する。
 * 出典の HTTP(S) リンクと、許可した再実行・ログ表示のコマンドだけを使う。
 * 課題文 (README.md) を OS のタブ付きで開くパネルも、ここに置く。
 */

import { type CiRunClaim, safeHttpsHref } from "@stella/shared/tasks/ci-run";
import { TASK_HELP_POLICIES } from "@stella/shared/tasks/help";
import { TASK_KIND_LABELS, type TaskManifest } from "@stella/shared/tasks/manifest";
import {
  canSubmit,
  RUN_OUTCOME_LABELS,
  type RunResult,
  type RunStepResult,
  STEP_STATUS_LABELS,
} from "@stella/shared/tasks/run-result";
import { RUNNERS } from "@stella/shared/tasks/runners";
import * as vscode from "vscode";
import {
  isPublicSourceUrl,
  type PublicSourceReference,
  SOURCE_AUTHORSHIP_LABELS,
  SOURCE_REUSE_LABELS,
} from "@stella/shared/tasks/source-reference";
import type { OsName } from "@stella/shared/markdown/os-blocks";
import {
  buildLessonDocHtml,
  defaultOsForPlatform,
  escapeHtml,
  markdownToHtml,
} from "./lesson-doc.js";

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

/** 課題の参照元 (出典・読む箇所・用途・帰属表示)。リンクは公開の HTTP(S) だけ。 */
export function referencesHtml(references: readonly PublicSourceReference[] | undefined): string {
  if (!references?.length) return "";
  return `<section class="references"><h2>参照元</h2><ul>${references.map((ref) => `<li>${isPublicSourceUrl(ref.url) ? `<a href="${escapeHtml(ref.url)}">${escapeHtml(ref.title)}</a>` : escapeHtml(ref.title)} — ${escapeHtml(ref.publisher)} / ${escapeHtml(ref.section)}<p>${escapeHtml(ref.usedFor)}</p><details><summary>出典の詳細</summary><p>資料: ${escapeHtml(ref.documentVersion)} / 確認日: ${escapeHtml(ref.checkedAt)} / 環境: ${escapeHtml(ref.environmentRef)}</p><p>${escapeHtml(SOURCE_AUTHORSHIP_LABELS[ref.authorship] ?? ref.authorship)} / ${escapeHtml(SOURCE_REUSE_LABELS[ref.reuse] ?? ref.reuse)}</p></details>${attributionHtml(ref)}</li>`).join("")}</ul></section>`;
}

function renderStep(step: RunStepResult): string {
  const parts: string[] = [
    `<section class="step ${step.status}">`,
    `<h3><span class="badge ${step.status}">${STEP_STATUS_LABELS[step.status]}</span> ${escapeHtml(step.label)} <span class="time">${seconds(step.durationMs)}</span></h3>`,
    `<p>${escapeHtml(step.summary)}</p>`,
  ];
  const tests = step.tests ?? [];
  const failed = tests.filter((t) => t.status === "failed");
  const others = tests.filter((t) => t.status !== "failed");
  if (failed.length > 0) {
    parts.push(
      `<ol class="tests">${failed
        .map(
          (t) =>
            `<li><strong>✗ ${escapeHtml(t.name)}</strong>${t.file ? ` <span class="file">${escapeHtml(t.file)}</span>` : ""}${t.message ? `<pre>${escapeHtml(t.message)}</pre>` : ""}</li>`,
        )
        .join("")}</ol>`,
    );
  }
  if (others.length > 0) {
    parts.push(
      `<ul class="tests ok">${others
        .map((t) => `<li>${t.status === "passed" ? "✓" : "－"} ${escapeHtml(t.name)}</li>`)
        .join("")}</ul>`,
    );
  }
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
    `</ul><p class="hint">提出すると、LMS が GitHub の公開 API で、この実行が成功で終わったこと・手元と同じコミットの実行であること・課題のワークフロー${workflow ? ` (<code>${escapeHtml(workflow)}</code>)` : ""} の実行であることを確かめます。リポジトリは公開にしてください。確かめられないときは講師が確認します。</p></section>`,
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
  // 課題の外からの環境診断は、課題を探さずにもう一度診断する。
  const retryCommand = input.standalone ? "stella.diagnoseEnvironment" : "stella.runTask";
  const commandArgs = input.root ? `?${encodeURIComponent(JSON.stringify([input.root]))}` : "";
  const action = canSubmit(result)
    ? `<a href="command:stella.submitTask${commandArgs}">提出</a>`
    : `<a href="command:stella.consultTask${commandArgs}">講師に相談</a>`;
  const footer = input.standalone
    ? ""
    : result.outcome === "cancelled"
      ? `<p class="next">途中で止めたので、結果は残していません。もう一度確認してください。</p>`
      : canSubmit(result)
        ? `<p class="next">手元の確認はすべて通りました。</p>`
        : result.outcome === "error"
          ? `<p class="next">環境の問題は、教材の「困ったときの案内」を見るか、講師に相談してください。直したら、もう一度確認してください。</p>`
          : `<p class="next">直したら、保存してもう一度確認してください。</p>`;
  const body = [
    `<h1>${escapeHtml(manifest.title)}</h1>`,
    `<p class="meta">${input.standalone ? "" : `${TASK_KIND_LABELS[manifest.kind]} ・ `}${escapeHtml(runner.label)}</p>`,
    referencesHtml(manifest.references),
    `<p class="outcome ${result.outcome}">${RUN_OUTCOME_LABELS[result.outcome]}</p>`,
    ...result.steps.map(renderStep),
    ciClaimHtml(result.ci, manifest.ci?.workflow),
    footer,
    !input.standalone && result.outcome !== "cancelled" ? `<p class="links">${action}</p>` : "",
    `<p class="links"><a href="command:${retryCommand}">もう一度確認する</a> ・ <a href="command:stella.showRunLog">実行ログを表示</a>${input.standalone ? "" : ` ・ <a href="command:stella.showTaskHelp${commandArgs}">${TASK_HELP_POLICIES[manifest.kind].hints ? "ヒント・解答・レビューの結果" : "レビューの結果"}</a>`}</p>`,
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
      `<p><code>${escapeHtml(input.root)}</code> の <code>.stella/task.json</code> に次の問題があります。課題の配布ファイルを確認するか、講師に相談してください。</p>`,
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
    .outcome { font-weight: 600; font-size: 1.1em; }
    .outcome.passed { color: var(--vscode-testing-iconPassed); }
    .outcome.failed { color: var(--vscode-testing-iconFailed); }
    .outcome.error { color: var(--vscode-editorWarning-foreground); }
    .outcome.cancelled { color: var(--vscode-descriptionForeground); }
    .step {
      margin: 0.75rem 0;
      padding: 0.6rem 0.9rem;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
    }
    .step p { margin: 0.25rem 0; }
    .badge {
      display: inline-block;
      padding: 0 0.4rem;
      border-radius: 3px;
      font-size: 0.85em;
      border: 1px solid currentColor;
    }
    .badge.passed { color: var(--vscode-testing-iconPassed); }
    .badge.failed { color: var(--vscode-testing-iconFailed); }
    .badge.error { color: var(--vscode-editorWarning-foreground); }
    .badge.skipped { color: var(--vscode-descriptionForeground); }
    ul, ol { padding-left: 1.4rem; }
    .tests.ok { color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

export function showTaskPanel(input: TaskPanelInput): void {
  const html = buildTaskPanelHtml(input);
  const title = input.kind === "result" ? `確認: ${input.manifest.title}` : "課題の定義";
  if (!currentPanel) {
    currentPanel = vscode.window.createWebviewPanel(VIEW_TYPE, title, vscode.ViewColumn.Beside, {
      enableScripts: false,
      localResourceRoots: [],
      enableCommandUris: [
        "stella.runTask",
        "stella.diagnoseEnvironment",
        "stella.showRunLog",
        "stella.submitTask",
        "stella.consultTask",
        "stella.showTaskHelp",
      ],
    });
    currentPanel.onDidDispose(() => {
      currentPanel = undefined;
    });
  } else {
    currentPanel.title = title;
    currentPanel.reveal(vscode.ViewColumn.Beside, true);
  }
  currentPanel.webview.html = html;
}

// ---------------------------------------------------------------
// 課題文 (README.md)
// ---------------------------------------------------------------

const README_VIEW_TYPE = "stella.taskReadme";
let readmePanel: vscode.WebviewPanel | undefined;

/**
 * 課題文のパネルの HTML。描画はレッスンのドキュメントと同じで、生の HTML は文字のまま出す。
 * OS 別のブロックは `os` (既定は `process.platform` の OS) のタブを開いておく (07 §11)。
 */
export function buildTaskReadmeHtml(input: {
  title: string;
  markdown: string;
  os?: OsName;
}): string {
  return buildLessonDocHtml({
    kind: "markdown",
    title: input.title,
    bodyHtml: markdownToHtml(input.markdown, { os: input.os ?? defaultOsForPlatform() }),
  });
}

/** 課題文をパネルで開く。スクリプトもコマンドのリンクも許さない。 */
export function showTaskReadme(input: { title: string; markdown: string }): void {
  const html = buildTaskReadmeHtml(input);
  const title = `課題文: ${input.title}`;
  if (!readmePanel) {
    readmePanel = vscode.window.createWebviewPanel(
      README_VIEW_TYPE,
      title,
      vscode.ViewColumn.Active,
      { enableScripts: false, localResourceRoots: [] },
    );
    readmePanel.onDidDispose(() => {
      readmePanel = undefined;
    });
  } else {
    readmePanel.title = title;
    readmePanel.reveal(vscode.ViewColumn.Active);
  }
  readmePanel.webview.html = html;
}
