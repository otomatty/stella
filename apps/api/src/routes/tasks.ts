import { Hono } from "hono";
import { and, asc, eq, inArray } from "drizzle-orm";
import { parsePublicTaskBundle, type TaskSummary } from "@stella/shared/tasks/catalog";
import type { TaskKind } from "@stella/shared/tasks/manifest";
import type { Env } from "../env.js";
import { sections, tasks, taskProgress } from "../db/schema.js";
import { ApiError, errorResponse, getCaller } from "../lib/authz.js";
import { canAccessTasks } from "../lib/task-access.js";

export const tasksRoute = new Hono<{ Bindings: Env }>();

tasksRoute.get("/api/tasks/for-stage/:stageId", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const stageId = c.req.param("stageId");
    if (!(await canAccessTasks(db, caller, stageId)))
      throw new ApiError("task stage not found", 404);
    // definition と bundle と task_private は一覧の SELECT に含めない。
    const rows = await db
      .select({
        id: tasks.id,
        sectionId: tasks.sectionId,
        title: tasks.title,
        kind: tasks.kind,
        pattern: tasks.pattern,
        skills: tasks.skills,
        estimatedMinutes: tasks.estimatedMinutes,
        contentHash: tasks.contentHash,
      })
      .from(tasks)
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .where(and(eq(sections.stageId, stageId), eq(tasks.active, true)))
      .orderBy(asc(sections.order), asc(tasks.order));
    const progress =
      rows.length === 0
        ? []
        : await db
            .select({
              taskId: taskProgress.taskId,
              status: taskProgress.status,
              contentHash: taskProgress.contentHash,
            })
            .from(taskProgress)
            .innerJoin(tasks, eq(tasks.id, taskProgress.taskId))
            .innerJoin(sections, eq(sections.id, tasks.sectionId))
            .where(
              and(
                eq(taskProgress.userId, caller.id),
                eq(sections.stageId, stageId),
                eq(tasks.active, true),
              ),
            );
    const progressByTaskId = new Map(progress.map((p) => [p.taskId, p]));
    const result: TaskSummary[] = rows.map(({ contentHash, ...task }) => {
      const p = progressByTaskId.get(task.id);
      const status =
        p && (p.contentHash === contentHash || p.status === "passed") ? p.status : "not-started";
      return { ...task, kind: task.kind as TaskKind, status };
    });
    return c.json({ tasks: result });
  } catch (err) {
    return errorResponse(c, err);
  }
});

tasksRoute.get("/api/tasks/bundle", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const [row] = await db
      .select({ bundle: tasks.bundle, stageId: sections.stageId })
      .from(tasks)
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .where(and(eq(tasks.id, c.req.query("taskId") ?? ""), eq(tasks.active, true)))
      .limit(1);
    if (!row || !(await canAccessTasks(db, caller, row.stageId)))
      throw new ApiError("task not found", 404);
    return c.json({ bundle: parsePublicTaskBundle(JSON.parse(row.bundle)) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 手元の合格は自己申告の記録。AI・講師の判定へ昇格させる経路にはしない。 */
tasksRoute.post("/api/tasks/local-result", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError("invalid JSON", 400);
    }
    if (
      !body ||
      typeof body !== "object" ||
      !("taskId" in body) ||
      !("contentHash" in body) ||
      typeof body.taskId !== "string" ||
      typeof body.contentHash !== "string"
    )
      throw new ApiError("taskId and contentHash are required", 400);
    const [row] = await db
      .select({ id: tasks.id, contentHash: tasks.contentHash, stageId: sections.stageId })
      .from(tasks)
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .where(and(eq(tasks.id, body.taskId), eq(tasks.active, true)))
      .limit(1);
    if (!row || !(await canAccessTasks(db, caller, row.stageId, "write")))
      throw new ApiError("task not found", 404);
    if (row.contentHash !== body.contentHash)
      throw new ApiError("教材が更新されています。課題を開き直してください", 409);
    await db
      .insert(taskProgress)
      .values({
        userId: caller.id,
        taskId: row.id,
        contentHash: row.contentHash,
        status: "local-passed",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [taskProgress.userId, taskProgress.taskId],
        set: { contentHash: row.contentHash, status: "local-passed", updatedAt: new Date() },
        setWhere: inArray(taskProgress.status, ["not-started", "local-passed", "resubmit"]),
      });
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});
