import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  inArray,
  isNull,
  type SQL,
  sql,
} from "drizzle-orm";
import { Hono } from "hono";
import { parsePublicTaskBundle } from "@stella/shared/tasks/catalog";
import type { TaskKind } from "@stella/shared/tasks/manifest";
import {
  staffTaskSourcePath,
  type StaffTaskDetail,
  type StaffStageTask,
  type StaffStageTasksResponse,
} from "@stella/shared/tasks/staff-stage";
import type { Db } from "../db/client.js";
import {
  codingRules,
  sections,
  stages,
  taskHelpOpens,
  taskLocalRuns,
  taskPrivate,
  taskProgress,
  taskRevisions,
  tasks,
} from "../db/schema.js";
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

/** 一覧と詳細で、受講者だけを同じ状態・開始条件で数える。 */
async function taskCounts(db: Db, filter: SQL) {
  const eligible = db.select({ id: tasks.id }).from(tasks).where(filter);
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
  const progressByTask = new Map<string, Map<string, number>>();
  for (const row of progress) {
    const statuses = progressByTask.get(row.taskId) ?? new Map<string, number>();
    statuses.set(row.status, row.count);
    progressByTask.set(row.taskId, statuses);
  }
  const startedByTask = new Map(started.map((row) => [row.taskId, row.count]));

  return (taskId: string): StaffStageTask["counts"] => {
    const statuses = progressByTask.get(taskId);
    const n = (status: string) => statuses?.get(status) ?? 0;
    const passed = n("passed") + n("ai-passed");
    return {
      started: startedByTask.get(taskId) ?? 0,
      localPassed: n("local-passed"),
      reviewing: n("submitted"),
      waiting: n("instructor-pending"),
      resubmit: n("resubmit"),
      passed,
      submitted: n("submitted") + n("instructor-pending") + n("resubmit") + passed,
    };
  };
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

    const countsOf = await taskCounts(db, inArray(tasks.id, eligible));
    const variants = await db
      .select({ taskId: tasks.variantOf, count: count() })
      .from(tasks)
      .where(and(eq(tasks.active, true), inArray(tasks.variantOf, eligible)))
      .groupBy(tasks.variantOf);

    const variantsByTask = new Map(variants.map((row) => [row.taskId, row.count]));
    const result: StaffStageTask[] = rows.map(({ definition, ...task }) => {
      return {
        ...task,
        kind: task.kind as TaskKind,
        support: readSupport(definition),
        variantCount: variantsByTask.get(task.id) ?? 0,
        counts: countsOf(task.id),
      };
    });
    return c.json({ tasks: result, prerequisites } satisfies StaffStageTasksResponse);
  } catch (err) {
    return errorResponse(c, err);
  }
});

function decodeBase64(value: string | undefined): string | null {
  return value === undefined
    ? null
    : new TextDecoder().decode(Uint8Array.from(atob(value), (c) => c.charCodeAt(0)));
}

/** 元の教材定義は配布用 manifest と形が異なる。読める追加情報だけを使う。 */
function definitionObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

staffStagesRoute.get("/api/staff/tasks/detail", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const taskId = c.req.query("taskId");
    if (!taskId) throw new ApiError("taskId が必要です", 400);
    const [row] = await db
      .select({
        task: tasks,
        stage: { id: stages.id, slug: stages.slug, title: stages.title },
        section: { id: sections.id, title: sections.title },
        privateFiles: taskPrivate.files,
      })
      .from(tasks)
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .innerJoin(stages, eq(stages.id, sections.stageId))
      .leftJoin(taskPrivate, eq(taskPrivate.taskId, tasks.id))
      .where(eq(tasks.id, taskId));
    if (!row) throw new ApiError("課題が見つかりません", 404);
    let definition: unknown;
    try {
      definition = JSON.parse(row.task.definition);
    } catch {
      throw new ApiError("課題の定義が不正です", 500);
    }
    const bundle = parsePublicTaskBundle(JSON.parse(row.task.bundle));
    // 配布用 manifest に含まれないレビュー・提出要件は元の定義から読む。
    const metadata = definitionObject(definition);
    const review = definitionObject(metadata.review);
    const submission = definitionObject(metadata.submit);
    const ruleRefs = Array.isArray(review.rules)
      ? review.rules.flatMap((value: unknown) => {
          const rule = definitionObject(value);
          return typeof rule.id === "string" && typeof rule.required === "boolean"
            ? [{ id: rule.id, required: rule.required }]
            : [];
        })
      : [];
    const rubric = Array.isArray(review.rubric)
      ? review.rubric.flatMap((value: unknown) => {
          const item = definitionObject(value);
          return typeof item.id === "string" &&
            typeof item.criterion === "string" &&
            typeof item.required === "boolean"
            ? [{ id: item.id, criterion: item.criterion, required: item.required }]
            : [];
        })
      : [];
    const [countsOf, ruleRows, opens, revisions, variants, ordered] = await Promise.all([
      taskCounts(db, eq(tasks.id, taskId)),
      ruleRefs.length === 0
        ? []
        : db
            .select({
              id: codingRules.id,
              title: codingRules.title,
              statement: codingRules.statement,
            })
            .from(codingRules)
            .where(
              inArray(
                codingRules.id,
                ruleRefs.map((ref) => ref.id),
              ),
            ),
      db
        .select({
          item: taskHelpOpens.item,
          level: taskHelpOpens.level,
          learners: countDistinct(taskHelpOpens.userId),
        })
        .from(taskHelpOpens)
        .where(and(eq(taskHelpOpens.taskId, taskId), learnerOnly(taskHelpOpens.userId)))
        .groupBy(taskHelpOpens.item, taskHelpOpens.level)
        .orderBy(asc(taskHelpOpens.level)),
      db
        .select({ contentHash: taskRevisions.contentHash, createdAt: taskRevisions.createdAt })
        .from(taskRevisions)
        .where(eq(taskRevisions.taskId, taskId))
        .orderBy(desc(taskRevisions.createdAt)),
      db
        .select({ id: tasks.id, title: tasks.title, active: tasks.active })
        .from(tasks)
        .where(eq(tasks.variantOf, taskId))
        .orderBy(asc(tasks.order), asc(tasks.id)),
      db
        .select({ id: tasks.id, title: tasks.title })
        .from(tasks)
        .innerJoin(sections, eq(sections.id, tasks.sectionId))
        .where(
          and(eq(sections.stageId, row.stage.id), eq(tasks.active, true), isNull(tasks.variantOf)),
        )
        .orderBy(asc(sections.order), asc(tasks.order), asc(tasks.id)),
    ]);
    const index = ordered.findIndex((task) => task.id === taskId);
    const privateFiles = JSON.parse(row.privateFiles ?? "{}") as Record<string, string>;
    const result: StaffTaskDetail = {
      task: {
        id: row.task.id,
        title: row.task.title,
        kind: row.task.kind as TaskKind,
        pattern: row.task.pattern,
        skills: row.task.skills,
        estimatedMinutes: row.task.estimatedMinutes,
        lessonId: row.task.lessonId,
        contentHash: row.task.contentHash,
        parentTaskId: row.task.variantOf,
        manifest: bundle.manifest,
      },
      stage: row.stage,
      section: row.section,
      sourcePath: staffTaskSourcePath(taskId, row.stage.slug),
      readme: decodeBase64(bundle.files["README.md"]),
      reviewNotes: decodeBase64(privateFiles["review.md"]),
      rubric,
      submission: {
        explanation: submission.explanation === true,
        debuggingRecord: submission.debuggingRecord === true,
      },
      support: readSupport(row.task.definition),
      codingRules: ruleRefs.map((ref) => ({
        id: ref.id,
        title: ruleRows.find((rule) => rule.id === ref.id)?.title ?? ref.id,
        statement: ruleRows.find((rule) => rule.id === ref.id)?.statement ?? "",
        required: ref.required,
      })),
      counts: countsOf(taskId),
      helpOpens: {
        hints: opens
          .filter((open) => open.item === "hint")
          .map(({ level, learners }) => ({ level, learners })),
        solution: opens.find((open) => open.item === "solution")?.learners ?? 0,
        explanation: opens.find((open) => open.item === "explanation")?.learners ?? 0,
      },
      revisions: revisions.map((revision) => ({
        ...revision,
        createdAt: revision.createdAt.toISOString(),
      })),
      variants,
      neighbors: {
        previous: ordered[index - 1] ?? null,
        next: index < 0 ? null : (ordered[index + 1] ?? null),
      },
    };
    return c.json(result);
  } catch (err) {
    return errorResponse(c, err);
  }
});
