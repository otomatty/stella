import { type Handler, Hono } from "hono";
import { and, asc, eq, inArray } from "drizzle-orm";
import { parsePublicTaskBundle, type TaskSummary } from "@stella/shared/tasks/catalog";
import type { TaskKind } from "@stella/shared/tasks/manifest";
import { type LocalRunReport, parseLocalRunReport } from "@stella/shared/tasks/local-report";
import type { Env } from "../env.js";
import { sections, tasks, taskProgress } from "../db/schema.js";
import { ApiError, errorResponse, getCaller } from "../lib/authz.js";
import { canAccessTasks } from "../lib/task-access.js";
import { localRunUpsert } from "../lib/task-support.js";

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
        p && (p.contentHash === contentHash || ["passed", "ai-passed"].includes(p.status))
          ? p.status
          : "not-started";
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

/**
 * 手元の確認の結果を受け取る (#38)。受け取るのは要約だけで、コードやメッセージは来ない。
 *
 * 合格は従来の `/api/tasks/local-result`、失敗・エラーは `/api/tasks/local-runs` に分ける。
 * 旧 API は local-result の本文を検証せずに合格として扱うので、失敗を同じ道で送ると、
 * API を戻したときに失敗が「手元で合格」として残ってしまう。別の道なら旧 API は 404 で捨てる。
 */
const handleLocalRun =
  (accepts: "passed" | "failures"): Handler<{ Bindings: Env }> =>
  async (c) => {
    try {
      const { caller, db } = await getCaller(c);
      let raw: unknown;
      try {
        raw = await c.req.json();
      } catch {
        throw new ApiError("invalid JSON", 400);
      }
      let body: LocalRunReport;
      try {
        body = parseLocalRunReport(raw);
      } catch (e) {
        throw new ApiError(e instanceof Error ? e.message : "invalid local result", 400);
      }
      if ((body.outcome === "passed") !== (accepts === "passed"))
        throw new ApiError(
          accepts === "passed"
            ? "失敗・エラーは /api/tasks/local-runs に送ってください"
            : "合格は /api/tasks/local-result に送ってください",
          400,
        );
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
      const runs = localRunUpsert(db, { userId: caller.id, tenantId: caller.tenantId }, row, body);
      if (body.outcome !== "passed") {
        await runs;
        return c.json({ ok: true });
      }
      // 手元の合格は自己申告の記録。AI・講師の判定へ昇格させる経路にはしない。
      await db.batch([
        db
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
          }),
        runs,
      ]);
      return c.json({ ok: true });
    } catch (err) {
      return errorResponse(c, err);
    }
  };

tasksRoute.post("/api/tasks/local-result", handleLocalRun("passed"));
tasksRoute.post("/api/tasks/local-runs", handleLocalRun("failures"));
