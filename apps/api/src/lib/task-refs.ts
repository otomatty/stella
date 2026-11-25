import { RETIRED_STAGES } from "@stella/shared/curriculum/retired-stages";
import type { TaskRefSummary } from "@stella/shared/tasks/problem-steps";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { Db } from "../db/client.js";
import {
  enrollments,
  lessonProgress,
  lessons,
  sections,
  stages,
  taskProblemSteps,
  taskRefs,
  tasks,
} from "../db/schema.js";
import { type Caller, isStaffRole } from "./authz.js";

const refSections = alias(sections, "ref_sections");
const retiredStageKeys = new Set(
  RETIRED_STAGES.map(({ tenantId, slug }) => `${tenantId}\0${slug}`),
);

export async function loadTaskRefs(
  db: Db,
  caller: Caller,
  scope: { taskId: string } | { stageId: string },
) {
  const sources = db
    .select({
      taskId: taskRefs.taskId,
      problemId: taskRefs.problemId,
      lessonId: taskRefs.lessonId,
      position: taskRefs.position,
      auto: sql<number>`0`.as("auto"),
    })
    .from(taskRefs)
    .unionAll(
      db
        .select({
          taskId: taskProblemSteps.taskId,
          problemId: taskProblemSteps.problemId,
          lessonId: taskProblemSteps.afterLessonId,
          position: taskProblemSteps.position,
          auto: sql<number>`1`.as("auto"),
        })
        .from(taskProblemSteps),
    )
    .as("ref_sources");
  const rows = await db
    .select({
      taskId: sources.taskId,
      problemId: sources.problemId,
      auto: sources.auto,
      taskStageId: sections.stageId,
      lessonId: lessons.id,
      title: lessons.title,
      lessonType: lessons.type,
      stageId: stages.id,
      stageTitle: stages.title,
      stageSlug: stages.slug,
      tenantId: stages.tenantId,
      completed: lessonProgress.completed,
      enrollmentId: enrollments.id,
    })
    .from(tasks)
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .innerJoin(sources, eq(sources.taskId, tasks.id))
    .innerJoin(lessons, eq(lessons.id, sources.lessonId))
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
    .where(
      and(
        "taskId" in scope
          ? eq(tasks.id, scope.taskId)
          : and(eq(sections.stageId, scope.stageId), isNull(tasks.variantOf)),
        eq(tasks.active, true),
        eq(stages.status, "published"),
      ),
    )
    .orderBy(desc(sources.auto), asc(sources.position));

  const byTask = new Map<string, Map<string, TaskRefSummary[]>>();
  const staff = isStaffRole(caller.role);
  for (const row of rows) {
    if (retiredStageKeys.has(`${row.tenantId}\0${row.stageSlug}`)) continue;
    const sameStage = row.stageId === row.taskStageId;
    const byProblem = byTask.get(row.taskId) ?? new Map<string, TaskRefSummary[]>();
    const refs = byProblem.get(row.problemId) ?? [];
    refs.push({
      lessonId: row.lessonId,
      stageId: row.stageId,
      title: row.title,
      lessonType: row.lessonType,
      ...(sameStage ? {} : { stageTitle: row.stageTitle }),
      completed: Boolean(row.completed),
      accessible: staff || sameStage || row.enrollmentId !== null,
      ...(row.auto ? { auto: true } : {}),
    });
    byProblem.set(row.problemId, refs);
    byTask.set(row.taskId, byProblem);
  }
  return byTask;
}
