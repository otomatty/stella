import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { TaskKind } from "@stella/shared/tasks/manifest";
import type { StaffStageTask, StaffStageTasksResponse } from "@stella/shared/tasks/staff-stage";
import { sections, stages, taskLocalRuns, taskProgress, tasks } from "../db/schema.js";
import type { Env } from "../env.js";
import { ApiError, errorResponse, getCaller, requireRole } from "../lib/authz.js";
import { parsePrerequisites } from "../lib/skill-map-data.js";
import { learnerOnly } from "../lib/learner-scope.js";

export const staffStagesRoute = new Hono<{ Bindings: Env }>();

function readSupport(definition: string): StaffStageTask["support"] {
  try {
    const parsed: unknown = JSON.parse(definition);
    if (typeof parsed !== "object" || parsed === null || !("support" in parsed)) return null;
    const support = parsed.support;
    if (
      typeof support !== "object" ||
      support === null ||
      !("hintLevels" in support) ||
      typeof support.hintLevels !== "number" ||
      !("solutionUnlock" in support) ||
      typeof support.solutionUnlock !== "string"
    )
      return null;
    return { hintLevels: support.hintLevels, solutionUnlock: support.solutionUnlock };
  } catch {
    return null;
  }
}

staffStagesRoute.get("/api/staff/stages/:stageId/tasks", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const stageId = c.req.param("stageId");
    const [stage] = await db
      .select({ id: stages.id, tenantId: stages.tenantId, prerequisites: stages.prerequisites })
      .from(stages)
      .where(eq(stages.id, stageId));
    if (!stage) throw new ApiError("ステージが見つかりません", 404);

    const slugs = parsePrerequisites(stage.prerequisites);
    const candidates =
      slugs.length === 0
        ? []
        : await db
            .select({ id: stages.id, title: stages.title, slug: stages.slug })
            .from(stages)
            .where(and(eq(stages.tenantId, stage.tenantId), inArray(stages.slug, slugs)));
    const prerequisites: StaffStageTasksResponse["prerequisites"] = slugs.flatMap((slug) => {
      const found = candidates.find((candidate) => candidate.slug === slug);
      return found ? [{ id: found.id, title: found.title }] : [];
    });

    const eligible = db
      .select({ id: tasks.id })
      .from(tasks)
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .where(and(eq(sections.stageId, stageId), eq(tasks.active, true), isNull(tasks.variantOf)));
    const rows = await db
      .select({
        id: tasks.id,
        sectionId: tasks.sectionId,
        title: tasks.title,
        kind: tasks.kind,
        estimatedMinutes: tasks.estimatedMinutes,
        lessonId: tasks.lessonId,
        definition: tasks.definition,
      })
      .from(tasks)
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .where(inArray(tasks.id, eligible))
      .orderBy(asc(sections.order), asc(tasks.order));
    if (rows.length === 0)
      return c.json({ tasks: [], prerequisites } satisfies StaffStageTasksResponse);

    const progress = await db
      .select({ taskId: taskProgress.taskId, status: taskProgress.status, count: count() })
      .from(taskProgress)
      .where(and(inArray(taskProgress.taskId, eligible), learnerOnly(taskProgress.userId)))
      .groupBy(taskProgress.taskId, taskProgress.status);
    // 両方に記録がある人も 1 人。not-started だけの進捗は開始に含めない。
    const started = await db.all<{ taskId: string; count: number }>(sql`
      select task_id as taskId, count(distinct user_id) as count from (
        select ${taskProgress.taskId} as task_id, ${taskProgress.userId} as user_id
        from ${taskProgress}
        where ${taskProgress.status} <> 'not-started' and ${learnerOnly(taskProgress.userId)}
          and ${taskProgress.taskId} in (${eligible})
        union all
        select ${taskLocalRuns.taskId} as task_id, ${taskLocalRuns.userId} as user_id
        from ${taskLocalRuns}
        where ${learnerOnly(taskLocalRuns.userId)} and ${taskLocalRuns.taskId} in (${eligible})
      ) group by task_id
    `);
    const variants = await db
      .select({ taskId: tasks.variantOf, count: count() })
      .from(tasks)
      .where(and(eq(tasks.active, true), inArray(tasks.variantOf, eligible)))
      .groupBy(tasks.variantOf);

    const progressByTask = new Map<string, Map<string, number>>();
    for (const row of progress) {
      const statuses = progressByTask.get(row.taskId) ?? new Map<string, number>();
      statuses.set(row.status, row.count);
      progressByTask.set(row.taskId, statuses);
    }
    const startedByTask = new Map(started.map((row) => [row.taskId, row.count]));
    const variantsByTask = new Map(variants.map((row) => [row.taskId, row.count]));
    const result: StaffStageTask[] = rows.map(({ definition, ...task }) => {
      const statuses = progressByTask.get(task.id);
      const n = (status: string) => statuses?.get(status) ?? 0;
      const passed = n("passed") + n("ai-passed");
      return {
        ...task,
        kind: task.kind as TaskKind,
        support: readSupport(definition),
        variantCount: variantsByTask.get(task.id) ?? 0,
        counts: {
          started: startedByTask.get(task.id) ?? 0,
          localPassed: n("local-passed"),
          reviewing: n("submitted"),
          waiting: n("instructor-pending"),
          resubmit: n("resubmit"),
          passed,
          submitted: n("submitted") + n("instructor-pending") + n("resubmit") + passed,
        },
      };
    });
    return c.json({ tasks: result, prerequisites } satisfies StaffStageTasksResponse);
  } catch (err) {
    return errorResponse(c, err);
  }
});
