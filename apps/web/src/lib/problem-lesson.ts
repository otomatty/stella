import type { TaskSummary } from "@stella/shared/tasks/catalog";
import type { TaskProblemStepSummary } from "@stella/shared/tasks/problem-steps";
import type { LessonStatus } from "@/data/types";

export interface ProblemLesson {
  taskId: string;
  problem: TaskProblemStepSummary;
  problems?: readonly TaskProblemStepSummary[];
}

export function problemLessonsById(tasks: readonly TaskSummary[] | null | undefined) {
  const lessons = new Map<string, ProblemLesson>();
  for (const task of tasks ?? []) {
    for (const problem of task.problems ?? []) {
      lessons.set(problem.stepLessonId, { taskId: task.id, problem, problems: task.problems });
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

export function problemLockReason(problem: TaskProblemStepSummary | undefined): string | undefined {
  if (problem?.state === "locked-video") return `「${problem.afterTitle}」の動画を見ると解けます`;
  if (problem?.state === "locked-previous") return "前の問題を提出すると解けます";
  return undefined;
}

export function firstOpenProblem(problems: readonly TaskProblemStepSummary[] | undefined) {
  return problems?.find((problem) => problem.state === "open");
}
