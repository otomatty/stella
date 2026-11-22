import { type ProblemStep, problemStepStates } from "@stella/shared/tasks/problem-steps";
import type { TaskProblem } from "@stella/shared/tasks/problems";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { lessonProgress, lessons, sections, taskProblemSteps, tasks } from "../db/schema.js";
import { ApiError } from "./authz.js";

export function loadProblemSteps(
  db: Db,
  userId: string,
  scope: { taskId: string } | { stageId: string },
) {
  return db
    .select({
      taskId: taskProblemSteps.taskId,
      problemId: taskProblemSteps.problemId,
      stepLessonId: taskProblemSteps.stepLessonId,
      afterLessonId: taskProblemSteps.afterLessonId,
      position: taskProblemSteps.position,
      afterTitle: lessons.title,
      completed: lessonProgress.completed,
    })
    .from(taskProblemSteps)
    .innerJoin(lessons, eq(lessons.id, taskProblemSteps.afterLessonId))
    .innerJoin(tasks, eq(tasks.id, taskProblemSteps.taskId))
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .leftJoin(
      lessonProgress,
      and(
        eq(lessonProgress.lessonId, taskProblemSteps.afterLessonId),
        eq(lessonProgress.userId, userId),
      ),
    )
    .where(
      and(
        "taskId" in scope
          ? eq(taskProblemSteps.taskId, scope.taskId)
          : eq(sections.stageId, scope.stageId),
        eq(tasks.active, true),
        isNull(tasks.variantOf),
      ),
    )
    .orderBy(asc(taskProblemSteps.position));
}

export function evaluatedProblemSteps<T extends ProblemStep & { completed: boolean | null }>(
  rows: T[],
  problems: readonly TaskProblem[],
  submitted: ReadonlySet<string>,
) {
  const authored = new Map(problems.map((problem, index) => [problem.id, { ...problem, index }]));
  // seed が途中で止まっている間も、ステップを飛ばした提出を受け付けない。
  if (
    rows.length !== authored.size ||
    rows.some((row, index) => row.position !== index || !authored.has(row.problemId))
  ) {
    throw new ApiError("問題の準備中です。少し待ってからもう一度開いてください。", 503);
  }
  const completed = new Set(rows.filter((row) => row.completed).map((row) => row.afterLessonId));
  const states = problemStepStates(rows, completed, submitted);
  return rows.map((row) => {
    const problem = authored.get(row.problemId);
    const state = states.get(row.problemId);
    if (!problem || !state)
      throw new ApiError("問題の準備中です。少し待ってからもう一度開いてください。", 503);
    return { ...row, problem, state };
  });
}
