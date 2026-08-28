import * as vscode from "vscode";
import { escapeHtml, markdownToHtml } from "./lesson-doc.js";
import type { ExecutionResult } from "./grader-protocol.js";

const VIEW_TYPE = "falcon.exercise";

export interface ExerciseNextLesson {
  stageId: string;
  lessonId: string;
  title: string;
}

export interface ExercisePanelInput {
  assignmentTitle: string;
  description: string;
  stageId: string;
  lessonId: string;
  result?: ExecutionResult;
  nextLesson?: ExerciseNextLesson;
  alreadyCleared?: boolean;
  /** 未クリア時に「講師に引き継ぐ」 を出せるか (直近の採点が控えてある時だけ)。 */
  assignmentId?: string;
  canEscalate?: boolean;
}

let currentPanel: vscode.WebviewPanel | undefined;

function checkLabel(passed: boolean): string {
  return passed ? "通過" : "失敗";
}

function renderGradeResults(result: ExecutionResult): string {
  const { lintPassed, astPassed, testsPassed } = result.evaluation.checks;
  const status = result.evaluation.cleared ? "クリア" : "未クリア";
  const tests = result.testResults
    .map((test) => {
      const mark = test.passed ? "✓" : "✗";
      const err = test.error ? ` — ${escapeHtml(test.error)}` : "";
      return `<li>${mark} ${escapeHtml(test.name)}${err}</li>`;
    })
    .join("");
  const extra = result.errorMessage ? `<p>${escapeHtml(result.errorMessage)}</p>` : "";
  return [
    `<h2>採点結果</h2>`,
    `<p><strong>${status}</strong></p>`,
    `<ul>`,
    `<li>Lint: ${checkLabel(lintPassed)}</li>`,
    `<li>AST: ${checkLabel(astPassed)}</li>`,
    `<li>テスト: ${checkLabel(testsPassed)}</li>`,
    `</ul>`,
    tests ? `<ol>${tests}</ol>` : "",
    extra,
  ].join("\n");
}

/**
 * 未クリアの採点直後にだけ出す「講師に引き継ぐ」。
 * クリア済み / 採点前は出さない (自動採点で通る課題を講師キューに流さない)。
 */
function escalateLink(input: ExercisePanelInput): string {
  const failed = input.result !== undefined && !input.result.evaluation.cleared;
  if (!failed || !input.canEscalate || !input.assignmentId) {
    return "";
  }
  const args = encodeURIComponent(JSON.stringify([input.assignmentId]));
  return [
    `<div class="escalate">`,
    `<p><a href="command:falcon.escalateToInstructor?${args}">講師に引き継ぐ</a></p>`,
    `<p class="hint">いま採点したコードと失敗した項目を講師の添削キューに送ります。 レッスンの完了にはなりません。</p>`,
    `</div>`,
  ].join("\n");
}

function nextLessonLink(input: ExercisePanelInput): string {
  const cleared = input.result?.evaluation.cleared === true || input.alreadyCleared === true;
  if (!cleared || !input.nextLesson) {
    return "";
  }
  const args = encodeURIComponent(JSON.stringify([input.stageId, input.lessonId]));
  return `<p><a href="command:falcon.openNextLesson?${args}">次のレッスンへ</a></p>`;
}

export function buildExercisePanelHtml(input: ExercisePanelInput): string {
  const body = markdownToHtml(input.description);
  const results = input.result ? renderGradeResults(input.result) : "";
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:;" />
  <title>${escapeHtml(input.assignmentTitle)}</title>
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
    pre {
      overflow: auto;
      padding: 0.75rem 1rem;
      background: var(--vscode-textCodeBlock-background);
      border-radius: 4px;
    }
    code { font-family: var(--vscode-editor-font-family); font-size: 0.9em; }
    a { color: var(--vscode-textLink-foreground); }
    ul, ol { padding-left: 1.4rem; }
    .escalate {
      margin-top: 1.5rem;
      padding: 0.75rem 1rem;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
    }
    .escalate p { margin: 0.25rem 0; }
    .hint { color: var(--vscode-descriptionForeground); font-size: 0.9em; }
  </style>
</head>
<body>
<h1>${escapeHtml(input.assignmentTitle)}</h1>
${body}
${results}
${escalateLink(input)}
${nextLessonLink(input)}
</body>
</html>`;
}

export function openExercisePanel(input: ExercisePanelInput): void {
  const html = buildExercisePanelHtml(input);

  if (!currentPanel) {
    currentPanel = vscode.window.createWebviewPanel(
      VIEW_TYPE,
      input.assignmentTitle,
      vscode.ViewColumn.Beside,
      {
        enableScripts: false,
        localResourceRoots: [],
        enableCommandUris: ["falcon.openNextLesson", "falcon.escalateToInstructor"],
      },
    );
    currentPanel.onDidDispose(() => {
      currentPanel = undefined;
    });
  } else {
    currentPanel.title = input.assignmentTitle;
    currentPanel.reveal(vscode.ViewColumn.Beside, true);
  }

  currentPanel.webview.html = html;
}
