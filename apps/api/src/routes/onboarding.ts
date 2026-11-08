import { Hono } from "hono";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import {
  FIRST_STAGE_SLUG,
  FIRST_TASK_ID,
  FIRST_STEP_KEYS,
  type FirstSteps,
} from "@stella/shared/study/first-steps";
import {
  authVscodeLinks,
  enrollments,
  lessonProgress,
  lessons,
  sections,
  stages,
  submissions,
  taskLocalRuns,
} from "../db/schema.js";
import { errorResponse, getCaller, requireRole } from "../lib/authz.js";
import { requirePaceLearner } from "../lib/learning-pace.js";
import type { Env } from "../env.js";
import type { Db } from "../db/client.js";

async function firstSteps(db: Db, userId: string): Promise<FirstSteps> {
  const [stage] = await db
    .select({ id: stages.id })
    .from(stages)
    .where(eq(stages.slug, FIRST_STAGE_SLUG))
    .limit(1);
  const [enrollment] = stage
    ? await db
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(and(eq(enrollments.userId, userId), eq(enrollments.stageId, stage.id)))
        .limit(1)
    : [];
  const [lesson] = await db
    .select({ at: lessonProgress.updatedAt })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(stages, eq(stages.id, sections.stageId))
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.completed, true),
        eq(stages.slug, FIRST_STAGE_SLUG),
      ),
    )
    .orderBy(asc(lessonProgress.updatedAt))
    .limit(1);
  // 使用済み・期限切れリンクの定期削除はない。現在はユーザー削除時だけ削除する。
  // 記録の状態をそのまま返し、Web に達成を永続化させない。
  const [link] = await db
    .select({ at: authVscodeLinks.usedAt })
    .from(authVscodeLinks)
    .where(and(eq(authVscodeLinks.userId, userId), isNotNull(authVscodeLinks.usedAt)))
    .orderBy(asc(authVscodeLinks.usedAt))
    .limit(1);
  const [run] = await db
    .select({ at: taskLocalRuns.firstRunAt })
    .from(taskLocalRuns)
    .where(
      and(
        eq(taskLocalRuns.userId, userId),
        eq(taskLocalRuns.taskId, FIRST_TASK_ID),
        sql`${taskLocalRuns.passedRuns} + ${taskLocalRuns.failedRuns} + ${taskLocalRuns.errorRuns} >= 1`,
      ),
    )
    .limit(1);
  const ownTask = and(eq(submissions.studentId, userId), eq(submissions.taskId, FIRST_TASK_ID));
  const [submission] = await db
    .select({ at: submissions.submittedAt })
    .from(submissions)
    .where(ownTask)
    .orderBy(asc(submissions.submittedAt))
    .limit(1);
  // submissions の受講者向け toSummaryRow と同じく、verdict があれば確定。
  const [result] = await db
    .select({ at: submissions.reviewedAt })
    .from(submissions)
    .where(and(ownTask, isNotNull(submissions.verdict)))
    .orderBy(sql`${submissions.reviewedAt} is null`, asc(submissions.reviewedAt))
    .limit(1);
  const dates = [lesson?.at, link?.at, run?.at, submission?.at, result?.at];
  return {
    stage_id: stage?.id ?? null,
    stage_started: Boolean(enrollment),
    items: FIRST_STEP_KEYS.map((key, i) => ({
      key,
      done: key === "got-result" ? Boolean(result) : dates[i] != null,
      at: dates[i]?.toISOString() ?? null,
    })),
  };
}

export const onboardingRoute = new Hono<{ Bindings: Env }>();
onboardingRoute.get("/api/onboarding/first-steps", async (c) => {
  try {
    const { db, caller } = await getCaller(c);
    return c.json(await firstSteps(db, caller.id));
  } catch (err) {
    return errorResponse(c, err);
  }
});
onboardingRoute.get("/api/onboarding/first-steps/:userId", async (c) => {
  try {
    const { db, caller } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const userId = c.req.param("userId");
    await requirePaceLearner(db, caller, userId);
    return c.json(await firstSteps(db, userId));
  } catch (err) {
    return errorResponse(c, err);
  }
});
