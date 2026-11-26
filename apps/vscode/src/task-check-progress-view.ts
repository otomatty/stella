import { STEP_STATUS_LABELS } from "@stella/shared/tasks/run-result";
import { escapeHtml } from "./markdown-html.js";
import {
  type CheckProgress,
  type CheckProgressStep,
  currentCheckStep,
  finishedCheckSteps,
} from "./task-check-progress.js";
import { barWidth, STEP_MARKS } from "./task-run-summary.js";

export interface TaskCheckView {
  progress: CheckProgress;
  target?: string;
  note?: string;
}

export function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} 秒`;
}

function checkStepHtml({ label, status, durationMs }: CheckProgressStep): string {
  const running = status === "running";
  const mark = running ? "" : status === "pending" ? "・" : STEP_MARKS[status];
  const markLabel = running ? "実行中" : status === "pending" ? "まだ" : STEP_STATUS_LABELS[status];
  const time = running
    ? "実行中…"
    : status !== "pending" && status !== "skipped" && durationMs !== undefined
      ? seconds(durationMs)
      : "";
  return `<li class="${status}"${running ? ' aria-current="step"' : ""}><span class="check-mark" role="img" aria-label="${markLabel}">${mark}</span><span class="check-label">${escapeHtml(label)}</span>${time ? `<span class="check-time">${time}</span>` : ""}</li>`;
}

export function checkProgressHtml(
  progress: CheckProgress,
  { target, note }: Omit<TaskCheckView, "progress"> = {},
): string {
  const total = progress.steps.length;
  const current = currentCheckStep(progress);
  const finished = finishedCheckSteps(progress);
  const count = total
    ? `<span class="check-count">${current ? current.index + 1 : 0} / ${total}</span>`
    : "";
  const heading = `<header><strong>確認しています</strong>${target ? `<span class="check-target">${escapeHtml(target)}</span>` : ""}${count}</header>`;
  return [
    '<section class="check-progress" aria-label="確認の進み具合">',
    heading,
    ...(total
      ? [
          `<div class="check-bar" role="progressbar" aria-label="終わった手順" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${finished}"><div style="width:${barWidth(finished, total)}%"></div></div>`,
          `<ol>${progress.steps.map(checkStepHtml).join("")}</ol>`,
          note ? `<p>${escapeHtml(note)}</p>` : "",
        ]
      : ["<p>準備しています…</p>"]),
    "</section>",
  ].join("\n");
}

export const CHECK_PROGRESS_CSS = `
    .check-progress {
      padding: 0.7rem 0.9rem 0.75rem;
      margin: 0.8rem 0 0.5rem;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      background: var(--vscode-textBlockQuote-background);
    }
    .check-progress header, .check-progress li {
      display: flex;
      align-items: baseline;
      gap: 0.6rem;
    }
    .check-progress header { flex-wrap: wrap; }
    .check-progress .check-target, .check-progress .check-label { overflow-wrap: anywhere; min-width: 0; }
    .check-progress .check-count, .check-progress .check-time {
      margin-inline-start: auto;
      white-space: nowrap;
      color: var(--vscode-descriptionForeground);
      font-variant-numeric: tabular-nums;
    }
    .check-progress .check-bar {
      height: 6px;
      margin: 0.5rem 0;
      border-radius: 3px;
      overflow: hidden;
      background: var(--vscode-panel-border);
    }
    .check-progress .check-bar > div { height: 100%; background: var(--vscode-progressBar-background); }
    .check-progress ol { margin: 0; padding: 0; list-style: none; }
    .check-progress .check-mark { flex: none; width: 1em; text-align: center; }
    .check-progress .passed .check-mark { color: var(--vscode-testing-iconPassed); }
    .check-progress .failed .check-mark { color: var(--vscode-testing-iconFailed); }
    .check-progress .error .check-mark { color: var(--vscode-editorWarning-foreground); }
    .check-progress .skipped .check-mark, .check-progress .pending .check-mark,
    .check-progress p { color: var(--vscode-descriptionForeground); }
    .check-progress p { margin: 0.4rem 0 0; }
    .check-progress .running .check-mark {
      box-sizing: border-box;
      height: 1em;
      align-self: center;
      border: 2px solid var(--vscode-panel-border);
      border-top-color: var(--vscode-progressBar-background);
      border-radius: 50%;
      animation: check-progress-spin 0.8s linear infinite;
    }
    @keyframes check-progress-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) {
      .check-progress .running .check-mark { animation: none; }
    }
`;
