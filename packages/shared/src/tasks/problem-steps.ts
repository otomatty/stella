export type ProblemStepState = "locked-video" | "locked-previous" | "open" | "submitted";

export interface ProblemStep {
  problemId: string;
  afterLessonId: string;
  position: number;
}

export interface TaskRefSummary {
  lessonId: string;
  stageId: string;
  title: string;
  lessonType: string;
  stageTitle?: string;
  completed: boolean;
  accessible: boolean;
  auto?: true;
}

export interface TaskProblemStepSummary {
  id: string;
  title: string;
  label: string;
  stepLessonId: string;
  afterLessonId: string;
  afterTitle: string;
  state: ProblemStepState;
  refs: TaskRefSummary[];
  /** 管理者が過去の学習から引き継いだ問題にだけ付ける。 */
  manual?: boolean;
}

/** 問番号は教材の problems の位置、提出の順序はレッスン一覧の位置で決まります。 */
export function problemStepLabel(title: string, index: number): string {
  return title.includes("応用問題") ? "応用" : `問${index + 1}`;
}

/** ファイル冒頭の行コメントから、問題の見出しと本文を読む。 */
export function problemStatementFromSource(
  code: string,
): { heading: string; details: string[] } | undefined {
  const statement: string[] = [];
  for (const sourceLine of code.split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line.startsWith("//") && (line || statement.length)) break;
    if (statement.length || /^\/\/\s+(?:問|Q\d)/.test(line)) statement.push(line.slice(2).trim());
  }
  const [heading, ...details] = statement;
  return heading ? { heading, details } : undefined;
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
