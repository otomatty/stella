import {
  type PresentedProblemStep,
  presentProblemStep,
  problemStepLabel,
  type TaskProblemStepSummary,
} from "@stella/shared/tasks/problem-steps";
import type { TaskProblem } from "@stella/shared/tasks/problems";
import { RUNNERS, type RunnerPlanKind } from "@stella/shared/tasks/runners";
import { lockKindOfLessonType, type LockStep } from "@stella/shared/tasks/step-lock";
import { and, asc, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import type { Db } from "../db/client.js";
import {
  lessonProgress,
  lessons,
  sections,
  taskProblemResults,
  taskProgress,
  taskRevisions,
  tasks,
} from "../db/schema.js";
import { chunk } from "./enrollment-bulk.js";
import {
  loadProblemRevisionHashes,
  type ProblemHashCache,
  type ProblemRevisionHashes,
} from "./task-problem-hashes.js";
import { countedProblemIds, readTaskDefinition } from "./task-problem-submission.js";

export const PROBLEM_STEPS_NOT_READY = "問題の準備中です。少し待ってからもう一度開いてください。";

type SavedProblem = Pick<
  typeof taskProblemResults.$inferSelect,
  "problemId" | "contentHash" | "source" | "path" | "firstPassedAt"
> & { code?: string | null };

/** 今の版と一致する提出と、手で済みにした提出はコードを読まなくても数えられる。 */
function submissionNeedsCode(
  row: Pick<SavedProblem, "problemId" | "contentHash" | "source">,
  currentHash: string,
  taskPassed: boolean,
  revisions: ProblemRevisionHashes | undefined,
): boolean {
  if (taskPassed || row.contentHash === currentHash || row.source === "manual") return false;
  const current = revisions?.get(currentHash);
  const previous = revisions?.get(row.contentHash);
  const hash = current?.hashes[row.problemId];
  return (
    typeof hash === "string" && hash === previous?.hashes[row.problemId] && !!current && !!previous
  );
}

type StageProblemStep = TaskProblemStepSummary & PresentedProblemStep;

interface StageProblemTask {
  problems: TaskProblem[];
  saved: SavedProblem[];
  counted: Set<string>;
  status: (typeof taskProgress.$inferSelect)["status"] | null;
  gated: boolean;
  ready: boolean;
  plan?: RunnerPlanKind;
  steps: StageProblemStep[];
}

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
      .orderBy(asc(sections.order), asc(lessons.order), asc(lessons.id)),
    db
      .select({
        taskId: lessons.problemTaskId,
        problemId: lessons.problemId,
        stepLessonId: lessons.id,
      })
      .from(lessons)
      .innerJoin(sections, eq(sections.id, lessons.sectionId))
      .innerJoin(tasks, eq(tasks.id, lessons.problemTaskId))
      .where(and(listedTasks, isNotNull(lessons.problemId))),
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
        firstPassedAt: taskProblemResults.firstPassedAt,
      })
      .from(taskProblemResults)
      .innerJoin(tasks, eq(tasks.id, taskProblemResults.taskId))
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .where(and(resultTasks, eq(taskProblemResults.userId, userId))),
  ]);

  const byTask = new Map<string, StageProblemTask>();
  const scopes = definitions.flatMap(({ id, contentHash, definition, status }) => {
    const parsed = readTaskDefinition(definition);
    const problems = parsed.problems;
    if (!problems) return [];
    const saved: SavedProblem[] = [];
    const plan = parsed.runner ? RUNNERS[parsed.runner].plan : undefined;
    byTask.set(id, {
      problems,
      saved,
      counted: new Set(),
      status,
      gated: problems.some((problem) => problem.after),
      ready: false,
      plan,
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
  const codeTaskIds = scopes.flatMap((scope) =>
    scope.rows.some((row) =>
      submissionNeedsCode(row, scope.currentHash, scope.taskPassed, hashes.get(scope.taskId)),
    )
      ? [scope.taskId]
      : [],
  );
  // 旧版の依存を照合する課題だけ、依存先の提出も含めてコードを読む。
  for (const part of chunk(codeTaskIds, 80)) {
    const codes = await db
      .select({
        taskId: taskProblemResults.taskId,
        problemId: taskProblemResults.problemId,
        code: taskProblemResults.code,
      })
      .from(taskProblemResults)
      .where(and(eq(taskProblemResults.userId, userId), inArray(taskProblemResults.taskId, part)));
    for (const row of codes) {
      const saved = byTask.get(row.taskId)?.saved.find((item) => item.problemId === row.problemId);
      if (saved) saved.code = row.code;
    }
  }
  for (const { taskId, currentHash, rows, taskPassed } of scopes) {
    const task = byTask.get(taskId);
    if (task) task.counted = countedProblemIds(rows, currentHash, taskPassed, hashes.get(taskId));
  }

  const problemLessons = stepRows.flatMap((row) =>
    row.taskId !== null && row.problemId !== null
      ? [{ taskId: row.taskId, problemId: row.problemId, stepLessonId: row.stepLessonId }]
      : [],
  );
  const rowsByLesson = new Map<string, typeof problemLessons>();
  const rowCounts = new Map<string, number>();
  for (const row of problemLessons) {
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
      const blocking = presented.blocking;
      byTask.get(row.taskId)?.steps.push({
        id: problem.id,
        title: problem.title,
        label: problemStepLabel(problem.title, problem.index),
        stepLessonId: lesson.id,
        refs: [],
        ...presented,
        ...(blocking ? { afterLessonId: blocking.id, afterTitle: blocking.title } : {}),
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
