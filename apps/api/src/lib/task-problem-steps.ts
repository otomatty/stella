import {
  type PresentedProblemStep,
  presentProblemStep,
  problemStepLabel,
  type TaskProblemStepSummary,
} from "@stella/shared/tasks/problem-steps";
import type { TaskProblem } from "@stella/shared/tasks/problems";
import { lockKindOfLessonType, type LockStep } from "@stella/shared/tasks/step-lock";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { Db } from "../db/client.js";
import {
  lessonProgress,
  lessons,
  sections,
  taskProblemResults,
  taskProblemSteps,
  taskProgress,
  taskRevisions,
  tasks,
} from "../db/schema.js";
import { loadProblemRevisionHashes, type ProblemHashCache } from "./task-problem-hashes.js";
import { countedProblemIds, readTaskDefinition } from "./task-problem-submission.js";

export const PROBLEM_STEPS_NOT_READY = "問題の準備中です。少し待ってからもう一度開いてください。";

type SavedProblem = Pick<
  typeof taskProblemResults.$inferSelect,
  "problemId" | "contentHash" | "source" | "path" | "code" | "firstPassedAt"
>;

type StageProblemStep = TaskProblemStepSummary & PresentedProblemStep;

interface StageProblemTask {
  problems: TaskProblem[];
  saved: SavedProblem[];
  counted: Set<string>;
  status: (typeof taskProgress.$inferSelect)["status"] | null;
  gated: boolean;
  ready: boolean;
  steps: StageProblemStep[];
}

const afterLesson = alias(lessons, "after_lesson");

export async function loadStageStepLocks(
  db: Db,
  userId: string,
  stageId: string,
  options: {
    variantTaskId?: string;
    hashCache?: ProblemHashCache;
    verifyPassedTaskId?: string;
  } = {},
) {
  const stageTasks = and(eq(sections.stageId, stageId), eq(tasks.active, true));
  const listedTasks = and(stageTasks, isNull(tasks.variantOf));
  // 出題された類題の結果も読めるが、ステージの問題レッスンには数えない。
  const resultTasks = options.variantTaskId
    ? and(stageTasks, or(isNull(tasks.variantOf), eq(tasks.id, options.variantTaskId)))
    : listedTasks;
  const [lessonRows, stepRows, definitions, results] = await Promise.all([
    db
      .select({
        id: lessons.id,
        type: lessons.type,
        title: lessons.title,
        completed: lessonProgress.completed,
      })
      .from(lessons)
      .innerJoin(sections, eq(sections.id, lessons.sectionId))
      .leftJoin(
        lessonProgress,
        and(eq(lessonProgress.lessonId, lessons.id), eq(lessonProgress.userId, userId)),
      )
      .where(eq(sections.stageId, stageId))
      .orderBy(asc(sections.order), asc(lessons.order)),
    db
      .select({
        taskId: taskProblemSteps.taskId,
        problemId: taskProblemSteps.problemId,
        stepLessonId: taskProblemSteps.stepLessonId,
        afterLessonId: taskProblemSteps.afterLessonId,
        afterTitle: afterLesson.title,
      })
      .from(taskProblemSteps)
      .innerJoin(tasks, eq(tasks.id, taskProblemSteps.taskId))
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .leftJoin(afterLesson, eq(afterLesson.id, taskProblemSteps.afterLessonId))
      .where(listedTasks),
    db
      .select({
        id: tasks.id,
        contentHash: tasks.contentHash,
        definition: taskRevisions.definition,
        status: taskProgress.status,
      })
      .from(tasks)
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .innerJoin(
        taskRevisions,
        and(eq(taskRevisions.taskId, tasks.id), eq(taskRevisions.contentHash, tasks.contentHash)),
      )
      .leftJoin(
        taskProgress,
        and(eq(taskProgress.taskId, tasks.id), eq(taskProgress.userId, userId)),
      )
      .where(resultTasks),
    db
      .select({
        taskId: taskProblemResults.taskId,
        problemId: taskProblemResults.problemId,
        contentHash: taskProblemResults.contentHash,
        source: taskProblemResults.source,
        path: taskProblemResults.path,
        code: taskProblemResults.code,
        firstPassedAt: taskProblemResults.firstPassedAt,
      })
      .from(taskProblemResults)
      .innerJoin(tasks, eq(tasks.id, taskProblemResults.taskId))
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .where(and(resultTasks, eq(taskProblemResults.userId, userId))),
  ]);

  const byTask = new Map<string, StageProblemTask>();
  const scopes = definitions.flatMap(({ id, contentHash, definition, status }) => {
    const problems = readTaskDefinition(definition).problems;
    if (!problems) return [];
    const saved: SavedProblem[] = [];
    byTask.set(id, {
      problems,
      saved,
      counted: new Set(),
      status,
      gated: problems.some((problem) => problem.after),
      ready: false,
      steps: [],
    });
    return [
      {
        taskId: id,
        currentHash: contentHash,
        rows: saved,
        taskPassed: status === "passed" || status === "ai-passed",
      },
    ];
  });
  for (const { taskId, ...result } of results) byTask.get(taskId)?.saved.push(result);
  const hashes = await loadProblemRevisionHashes(
    db,
    scopes.map((scope) =>
      scope.taskId === options.verifyPassedTaskId ? { ...scope, taskPassed: false } : scope,
    ),
    options.hashCache,
  );
  for (const { taskId, currentHash, rows, taskPassed } of scopes) {
    const task = byTask.get(taskId);
    if (task) task.counted = countedProblemIds(rows, currentHash, taskPassed, hashes.get(taskId));
  }

  const rowsByLesson = new Map<string, typeof stepRows>();
  const rowCounts = new Map<string, number>();
  for (const row of stepRows) {
    const mappings = rowsByLesson.get(row.stepLessonId) ?? [];
    mappings.push(row);
    rowsByLesson.set(row.stepLessonId, mappings);
    rowCounts.set(row.taskId, (rowCounts.get(row.taskId) ?? 0) + 1);
  }

  const steps: LockStep[] = [];
  const done = new Set<string>();
  for (const lesson of lessonRows) {
    const mappings = rowsByLesson.get(lesson.id);
    steps.push({
      id: lesson.id,
      title: lesson.title,
      kind: mappings ? "problem" : lockKindOfLessonType(lesson.type),
    });
    if (
      mappings
        ? mappings.every(({ taskId, problemId }) => byTask.get(taskId)?.counted.has(problemId))
        : lesson.completed
    )
      done.add(lesson.id);
  }

  const authoredByTask = new Map(
    [...byTask].map(([id, task]) => [
      id,
      new Map(task.problems.map((problem, index) => [problem.id, { ...problem, index }])),
    ]),
  );
  for (const [index, lesson] of lessonRows.entries()) {
    const presented = presentProblemStep(steps, index, done);
    if (!presented) continue;
    for (const row of rowsByLesson.get(lesson.id) ?? []) {
      const problem = authoredByTask.get(row.taskId)?.get(row.problemId);
      if (!problem) continue;
      byTask.get(row.taskId)?.steps.push({
        id: problem.id,
        title: problem.title,
        label: problemStepLabel(problem.title, problem.index),
        stepLessonId: lesson.id,
        afterLessonId: presented.blocking?.id ?? row.afterLessonId,
        afterTitle: presented.blocking?.title ?? row.afterTitle ?? "",
        ...presented,
      });
    }
  }
  for (const [id, task] of byTask) {
    task.ready =
      task.gated &&
      rowCounts.get(id) === task.problems.length &&
      task.steps.length === task.problems.length &&
      new Set(task.steps.map((step) => step.stepLessonId)).size === task.problems.length;
  }
  return { steps, done, byTask, hashes };
}
