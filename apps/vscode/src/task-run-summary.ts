import {
  STEP_STATUS_LABELS,
  type StepStatus,
  type TestCaseResult,
} from "@stella/shared/tasks/run-result";
import { escapeHtml } from "./lesson-doc.js";

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

export function shortStepLabel(label: string): string {
  return label
    .trimEnd()
    .replace(/(?:\([^()]*\)|（[^（）]*）)$/, "")
    .trimEnd();
}

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
