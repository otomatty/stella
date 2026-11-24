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
  afterLessonId: string;
  afterTitle: string;
  state: ProblemStepState;
  /** 管理者が過去の学習から引き継いだ問題にだけ付ける。 */
  manual?: boolean;
}

/** 問番号は教材の problems の位置、提出の順序はレッスン一覧の位置で決まります。 */
export function problemStepLabel(title: string, index: number): string {
  return title.includes("応用問題") ? "応用" : `問${index + 1}`;
}

export function problemStepStates(
  steps: readonly ProblemStep[],
  completedLessonIds: ReadonlySet<string>,
  submittedProblemIds: ReadonlySet<string>,
): Map<string, ProblemStepState> {
  const states = new Map<string, ProblemStepState>();
  const byPosition = new Map(steps.map((step) => [step.position, step.problemId]));
  for (const { problemId, afterLessonId, position } of steps) {
    const previous = byPosition.get(position - 1);
    let state: ProblemStepState = "open";
    if (submittedProblemIds.has(problemId)) state = "submitted";
    else if (!completedLessonIds.has(afterLessonId)) state = "locked-video";
    else if (position > 0 && (!previous || !submittedProblemIds.has(previous)))
      state = "locked-previous";
    states.set(problemId, state);
  }
  return states;
}
