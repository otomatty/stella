import {
  STEP_STATUS_LABELS,
  type StepStatus,
  type TestCaseResult,
} from "@stella/shared/tasks/run-result";
import { escapeHtml } from "./markdown-html.js";
import { expectedActual } from "./task-test-message.js";

export { shortStepLabel } from "./task-check-progress.js";

export interface TestCounts {
  passed: number;
  total: number;
}

export interface StepSummary {
  label: string;
  status: StepStatus;
  tests?: TestCounts;
}

export const STEP_MARKS: Record<StepStatus, string> = {
  passed: "✓",
  failed: "✗",
  error: "!",
  skipped: "–",
};

export function countTests(tests: readonly TestCaseResult[] = []): TestCounts {
  const counts = { passed: 0, total: 0 };
  for (const test of tests) {
    if (test.status === "skipped") continue;
    counts.total++;
    if (test.status === "passed") counts.passed++;
  }
  return counts;
}

export function barWidth(passed: number, total: number): string {
  return total > 0 ? ((100 * passed) / total).toFixed(1) : "0";
}

export function testBar({ passed, total }: TestCounts, inline = false): string {
  const wide = total > 40;
  const bars = wide
    ? `<i class="p" style="width:${barWidth(passed, total)}%"></i>`
    : '<i class="p"></i>'.repeat(passed) + "<i></i>".repeat(total - passed);
  const tag = inline ? "span" : "p";
  return `<${tag} class="tests-line">${inline ? "" : "<span>テスト</span>"}<span class="tbar${wide ? " wide" : ""}" role="img" aria-label="テスト ${total} 件中 ${passed} 件が通りました">${bars}</span><span class="count">${passed} / ${total}</span></${tag}>`;
}

export function stepChips(steps: readonly StepSummary[]): string {
  const chips = steps.map(
    ({ label, status }) =>
      `<li class="chip ${status}"><b aria-label="${STEP_STATUS_LABELS[status]}">${STEP_MARKS[status]}</b>${escapeHtml(label)}</li>`,
  );
  return `<ul class="chips">${chips.join("")}</ul>`;
}

export function remainingSteps(steps: readonly StepSummary[]): string[] {
  return steps
    .filter((step) => step.status === "failed")
    .map(({ label, tests }) => {
      const failed = tests ? tests.total - tests.passed : 0;
      return escapeHtml(failed > 0 ? `${label} ${failed} 件` : label);
    });
}

export function renderFailedTest(test: TestCaseResult, fileLink?: string): string {
  const file = fileLink
    ? ` ${fileLink}`
    : test.file
      ? ` <span class="file">${escapeHtml(test.file)}</span>`
      : "";
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

export const RUN_SUMMARY_CSS = `
    .tests-line { display: flex; align-items: center; gap: 0.6rem; font-variant-numeric: tabular-nums; }
    .tbar { display: inline-flex; gap: 3px; flex: 1; max-width: 220px; }
    .tbar i { flex: 1; height: 8px; border-radius: 2px; background: var(--vscode-panel-border); }
    .tbar i.p { background: var(--vscode-testing-iconPassed); }
    .tbar.wide {
      display: block;
      height: 8px;
      border-radius: 2px;
      background: var(--vscode-panel-border);
      overflow: hidden;
    }
    .tbar.wide i { display: block; height: 100%; border-radius: 0; }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin: 0.5rem 0;
      padding: 0;
      list-style: none;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0 0.55rem;
      border-radius: 999px;
      border: 1px solid var(--vscode-panel-border);
      font-size: 0.88em;
      white-space: nowrap;
    }
    .chip.passed b { color: var(--vscode-testing-iconPassed); }
    .chip.failed { border-color: var(--vscode-testing-iconFailed); }
    .chip.failed b { color: var(--vscode-testing-iconFailed); }
    .chip.error { border-color: var(--vscode-editorWarning-foreground); }
    .chip.error b { color: var(--vscode-editorWarning-foreground); }
    .chip.skipped { color: var(--vscode-descriptionForeground); }`;

export const FAILED_TEST_CSS = `
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
`;
