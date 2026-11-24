import type { Lesson, LessonStatus, Stage } from "@/data/types";
import type { TaskSummary } from "@stella/shared/tasks/catalog";
import {
  presentProblemStep,
  type TaskProblemStepSummary,
} from "@stella/shared/tasks/problem-steps";
import { lockKindOfLessonType, type LockStep } from "@stella/shared/tasks/step-lock";

/** サーバーの問題に、手元で求めた止めているステップを足したもの。 */
export type ProblemStepView = TaskProblemStepSummary & {
  /** ロック中に止めているステップ。サーバーの state をそのまま使うときは無い。 */
  blocking?: LockStep | null;
};

export interface ProblemLesson {
  taskId: string;
  problem: ProblemStepView;
}

export type PresentedTask = Omit<TaskSummary, "problems"> & {
  problems?: ProblemStepView[];
};

/**
 * サーバーの `problems[].state` を、ステージの並びと手元の進捗から求め直す。
 *
 * 規則は `@stella/shared` の `presentProblemStep`。問題のレッスンはサーバーが
 * `submitted` のときだけ終わり、それ以外のレッスンは進捗の `completed` か
 * `lesson.status === "done"` で終わる。`stage` が無いときはサーバーの state を返す。
 */
export function presentStageProblems(
  tasks: readonly TaskSummary[] | null | undefined,
  stage: Stage | null | undefined,
  map: Readonly<Record<string, { completed: boolean } | undefined>>,
): readonly PresentedTask[] | null | undefined {
  if (!tasks || !stage) return tasks;
  const problemsByLesson = new Map<string, TaskProblemStepSummary[]>();
  for (const task of tasks) {
    for (const problem of task.problems ?? []) {
      const listed = problemsByLesson.get(problem.stepLessonId) ?? [];
      listed.push(problem);
      problemsByLesson.set(problem.stepLessonId, listed);
    }
  }

  const steps: LockStep[] = [];
  const done = new Set<string>();
  for (const lesson of lessonsInOrder(stage)) {
    const problems = problemsByLesson.get(lesson.id);
    steps.push({
      id: lesson.id,
      title: lesson.title,
      kind: problems ? "problem" : lockKindOfLessonType(lesson.type),
    });
    const finished = problems
      ? problems.every((problem) => problem.state === "submitted")
      : map[lesson.id]?.completed === true || lesson.status === "done";
    if (finished) done.add(lesson.id);
  }
  const indexById = new Map(steps.map((step, index) => [step.id, index]));

  return tasks.map((task) => {
    if (!task.problems?.length) return task;
    return {
      ...task,
      problems: task.problems.map((problem) => presentProblem(problem, indexById, steps, done)),
    };
  });
}

function lessonsInOrder(stage: Stage): Lesson[] {
  return (stage.sections ?? []).flatMap((section) => section.lessons);
}

function presentProblem(
  problem: TaskProblemStepSummary,
  indexById: ReadonlyMap<string, number>,
  steps: readonly LockStep[],
  done: ReadonlySet<string>,
): ProblemStepView {
  const index = indexById.get(problem.stepLessonId);
  if (index === undefined) return problem;
  const presented = presentProblemStep(steps, index, done);
  if (!presented) return problem;
  const blocking = presented.blocking;
  return {
    ...problem,
    state: presented.state,
    blocking,
    afterLessonId: blocking?.id ?? problem.afterLessonId,
    afterTitle: blocking?.title ?? problem.afterTitle,
  };
}

export function problemLessonsById(
  tasks: readonly PresentedTask[] | null | undefined,
): Map<string, ProblemLesson> {
  const lessons = new Map<string, ProblemLesson>();
  for (const task of tasks ?? []) {
    for (const problem of task.problems ?? []) {
      lessons.set(problem.stepLessonId, { taskId: task.id, problem });
    }
  }
  return lessons;
}

export function problemLessonStatus(problem: TaskProblemStepSummary): LessonStatus {
  switch (problem.state) {
    case "submitted":
      return "done";
    case "open":
      return "todo";
    case "locked-video":
    case "locked-previous":
      return "locked";
  }
}

export function problemLockReason(problem: ProblemStepView | undefined): string | undefined {
  if (!problem || problem.state === "open" || problem.state === "submitted") return undefined;
  const blocking = problem.blocking;
  const title = blocking?.title ?? problem.afterTitle;
  if (!title) return undefined;
  const blockedByProblem = blocking
    ? blocking.kind === "problem"
    : problem.state === "locked-previous";
  return blockedByProblem ? `「${title}」を提出すると解けます` : `「${title}」を終えると解けます`;
}

export function firstOpenProblem(problems: readonly TaskProblemStepSummary[] | undefined) {
  return problems?.find((problem) => problem.state === "open");
}
