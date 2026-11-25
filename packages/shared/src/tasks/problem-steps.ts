import { blockingStep, type LockStep } from "./step-lock.js";

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
  /** ロック中に止めているステップ。開いている・提出済みのときは付けない。 */
  afterLessonId?: string;
  afterTitle?: string;
  state: ProblemStepState;
  refs: TaskRefSummary[];
  /** 管理者が過去の学習から引き継いだ問題にだけ付ける。 */
  manual?: boolean;
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
