import type { StepStatus } from "@stella/shared/tasks/run-result";
import type { RunProgress } from "./runner/run-task.js";

export type CheckStepStatus = "pending" | "running" | StepStatus;

export interface CheckProgressStep {
  label: string;
  status: CheckStepStatus;
  durationMs?: number;
}

export interface CheckProgress {
  steps: CheckProgressStep[];
}

export function emptyCheckProgress(): CheckProgress {
  return { steps: [] };
}

export function applyRunProgress(progress: CheckProgress, event: RunProgress): CheckProgress {
  if (event.type === "plan") {
    return { steps: event.steps.map(({ label }) => ({ label, status: "pending" })) };
  }
  const step = progress.steps[event.index];
  if (!step) return progress;
  const steps = [...progress.steps];
  steps[event.index] =
    event.type === "step-start"
      ? { label: step.label, status: "running" }
      : { label: step.label, status: event.step.status, durationMs: event.step.durationMs };
  return { steps };
}

function isFinished({ status }: CheckProgressStep): boolean {
  return status !== "pending" && status !== "running";
}

/** index は 0 始まり。 */
export function currentCheckStep(
  progress: CheckProgress,
): { index: number; total: number; label: string } | undefined {
  const { steps } = progress;
  const running = steps.findIndex(({ status }) => status === "running");
  const index = running >= 0 ? running : steps.findLastIndex(isFinished);
  const step = steps[index];
  if (step) return { index, total: steps.length, label: step.label };
}

export function checkProgressLabel(progress: CheckProgress): string | undefined {
  const step = currentCheckStep(progress);
  if (step) return `${step.index + 1}/${step.total} ${step.label}`;
}

export function shortStepLabel(label: string): string {
  return label
    .trimEnd()
    .replace(/(?:\([^()]*\)|（[^（）]*）)$/, "")
    .trimEnd();
}

export function checkProgressShortLabel(progress: CheckProgress): string | undefined {
  const step = currentCheckStep(progress);
  if (step) return `${step.index + 1}/${step.total} ${shortStepLabel(step.label)}`;
}

export function finishedCheckSteps(progress: CheckProgress): number {
  return progress.steps.filter(isFinished).length;
}
