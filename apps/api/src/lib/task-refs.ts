import { RETIRED_STAGES } from "@stella/shared/curriculum/retired-stages";
import type { TaskRefSummary } from "@stella/shared/tasks/problem-steps";
import { lockKindOfLessonType } from "@stella/shared/tasks/step-lock";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { Db } from "../db/client.js";
import {
  enrollments,
  lessonProgress,
  lessons,
  sections,
  stages,
  taskRefs,
  tasks,
} from "../db/schema.js";
import { type Caller, isStaffRole } from "./authz.js";

const refSections = alias(sections, "ref_sections");
const retiredStageKeys = new Set(
  RETIRED_STAGES.map(({ tenantId, slug }) => `${tenantId}\0${slug}`),
);

/**
 * 課題と問題の手がかり。教材に書いた `task_refs` に加え、問題レッスンの直前にある
 * 動画・スライドを自動の手がかりにする。自動の手がかりは `task_problem_steps` を読まず、
 * ステージのレッスン順から求める。
 */
export async function loadTaskRefs(
  db: Db,
  caller: Caller,
  scope: { taskId: string } | { stageId: string },
) {
  const taskScope =
    "taskId" in scope
      ? eq(tasks.id, scope.taskId)
      : and(eq(sections.stageId, scope.stageId), isNull(tasks.variantOf));
  const scopedTasks = await db
    .select({ id: tasks.id, stageId: sections.stageId })
    .from(tasks)
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .where(and(taskScope, eq(tasks.active, true)));
  const taskIds = new Set(scopedTasks.map((task) => task.id));
  const stageIds = [...new Set(scopedTasks.map((task) => task.stageId))];

  const authored = await db
    .select({
      taskId: taskRefs.taskId,
      problemId: taskRefs.problemId,
      position: taskRefs.position,
      taskStageId: sections.stageId,
      lessonId: lessons.id,
      title: lessons.title,
      lessonType: lessons.type,
      stageId: stages.id,
      stageTitle: stages.title,
      stageSlug: stages.slug,
      tenantId: stages.tenantId,
      stageStatus: stages.status,
      completed: lessonProgress.completed,
      enrollmentId: enrollments.id,
    })
    .from(tasks)
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .innerJoin(taskRefs, eq(taskRefs.taskId, tasks.id))
    .innerJoin(lessons, eq(lessons.id, taskRefs.lessonId))
    .innerJoin(refSections, eq(refSections.id, lessons.sectionId))
    .innerJoin(stages, eq(stages.id, refSections.stageId))
    .leftJoin(
      lessonProgress,
      and(eq(lessonProgress.lessonId, lessons.id), eq(lessonProgress.userId, caller.id)),
    )
    .leftJoin(
      enrollments,
      and(eq(enrollments.stageId, stages.id), eq(enrollments.userId, caller.id)),
    )
    .where(and(taskScope, eq(tasks.active, true)))
    .orderBy(asc(taskRefs.taskId), asc(taskRefs.problemId), asc(taskRefs.position));

  const lessonRows =
    stageIds.length === 0
      ? []
      : await db
          .select({
            id: lessons.id,
            type: lessons.type,
            title: lessons.title,
            problemTaskId: lessons.problemTaskId,
            problemId: lessons.problemId,
            stageId: sections.stageId,
            stageTitle: stages.title,
            stageSlug: stages.slug,
            tenantId: stages.tenantId,
            stageStatus: stages.status,
            completed: lessonProgress.completed,
          })
          .from(lessons)
          .innerJoin(sections, eq(sections.id, lessons.sectionId))
          .innerJoin(stages, eq(stages.id, sections.stageId))
          .leftJoin(
            lessonProgress,
            and(eq(lessonProgress.lessonId, lessons.id), eq(lessonProgress.userId, caller.id)),
          )
          .where(inArray(sections.stageId, stageIds))
          .orderBy(asc(sections.stageId), asc(sections.order), asc(lessons.order), asc(lessons.id));

  const byTask = new Map<string, Map<string, TaskRefSummary[]>>();
  const staff = isStaffRole(caller.role);
  const push = (taskId: string, problemId: string, ref: TaskRefSummary, prepend = false) => {
    const byProblem = byTask.get(taskId) ?? new Map<string, TaskRefSummary[]>();
    const refs = byProblem.get(problemId) ?? [];
    if (prepend) refs.unshift(ref);
    else refs.push(ref);
    byProblem.set(problemId, refs);
    byTask.set(taskId, byProblem);
  };

  for (const row of authored) {
    if (row.stageStatus !== "published") continue;
    if (retiredStageKeys.has(`${row.tenantId}\0${row.stageSlug}`)) continue;
    const sameStage = row.stageId === row.taskStageId;
    push(row.taskId, row.problemId, {
      lessonId: row.lessonId,
      stageId: row.stageId,
      title: row.title,
      lessonType: row.lessonType,
      ...(sameStage ? {} : { stageTitle: row.stageTitle }),
      completed: Boolean(row.completed),
      accessible: staff || sameStage || row.enrollmentId !== null,
    });
  }

  let stageId = "";
  let lastContent: (typeof lessonRows)[number] | undefined;
  for (const lesson of lessonRows) {
    if (lesson.stageId !== stageId) {
      stageId = lesson.stageId;
      lastContent = undefined;
    }
    if (lesson.problemTaskId && lesson.problemId) {
      if (
        lastContent &&
        taskIds.has(lesson.problemTaskId) &&
        lastContent.stageStatus === "published" &&
        !retiredStageKeys.has(`${lastContent.tenantId}\0${lastContent.stageSlug}`)
      ) {
        push(
          lesson.problemTaskId,
          lesson.problemId,
          {
            lessonId: lastContent.id,
            stageId: lastContent.stageId,
            title: lastContent.title,
            lessonType: lastContent.type,
            completed: Boolean(lastContent.completed),
            accessible: true,
            auto: true,
          },
          true,
        );
      }
      continue;
    }
    if (lockKindOfLessonType(lesson.type) === "content") lastContent = lesson;
  }
  return byTask;
}
