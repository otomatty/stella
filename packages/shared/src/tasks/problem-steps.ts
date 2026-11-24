import { blockingStep, type LockStep } from "./step-lock.js";

export type ProblemStepState = "locked-video" | "locked-previous" | "open" | "submitted";

export interface ProblemStep {
  problemId: string;
  afterLessonId: string;
  position: number;
}

export interface TaskProblemStepSummary {
  id: string;
  title: string;
  label: string;
  stepLessonId: string;
  /** ロック中に止めているステップ。開いている・提出済みのときは付けない。 */
  afterLessonId?: string;
  afterTitle?: string;
  state: ProblemStepState;
}

/** 問番号は教材の problems の位置、提出の順序はレッスン一覧の位置で決まります。 */
export function problemStepLabel(title: string, index: number): string {
  return title.includes("応用問題") ? "応用" : `問${index + 1}`;
}

export interface PresentedProblemStep {
  state: ProblemStepState;
  /** ロック中に止めているステップ。開いている・提出済みは null。 */
  blocking: LockStep | null;
}

export function presentProblemStep(
  steps: readonly LockStep[],
  index: number,
  done: ReadonlySet<string>,
): PresentedProblemStep | null {
  const step = steps[index];
  if (step?.kind !== "problem") return null;
  if (done.has(step.id)) return { state: "submitted", blocking: null };

  const blocking = blockingStep(steps, index, done);
  if (!blocking) return { state: "open", blocking: null };
  return { state: blocking.kind === "problem" ? "locked-previous" : "locked-video", blocking };
}
