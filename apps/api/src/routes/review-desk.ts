/**
 * 講師のレビュー画面の API (Issue #34、docs/curriculum/07 §6.3・§6.4)。staff (講師・管理者) だけ。
 *
 *   GET    /api/review-desk/ai-passed            AI が合格にした提出の一覧 (事後確認)
 *   POST   /api/submissions/:id/checks           確認済み・コメント・再提出に覆す
 *   GET    /api/review-desk/metrics?days=30      しきい値の月次見直しに使う数字
 *   GET    /api/review-desk/task-board?taskId=   同じ課題の提出を並べて見る
 *   POST   /api/review-desk/task-board/discovery 共通のつまずきを発見教材に回す
 *
 * 課題 ID は `<講座>/<単元>/<課題>` とスラッシュを含むので、パスではなくクエリ・本文で受ける。
 *   GET/POST/PATCH/DELETE /api/review-templates  コメント集
 *
 * 人に回した提出のキューは、これまでどおり `GET /api/submissions` が理由・確信度・担当者を返す。
 * 受講者向けの API は、人が確定する前の AI の所見を返さない (07 §6.3) — ここは staff だけが読む。
 */

import { CHECK_ACTIONS, type CheckAction } from "@stella/shared/review/review-desk";
import { Hono } from "hono";
import type { Env } from "../env.js";
import { clientIp } from "../lib/audit.js";
import { ApiError, type Caller, errorResponse, getCaller, requireRole } from "../lib/authz.js";
import {
  checkAiPassedSubmission,
  createTemplate,
  deleteTemplate,
  listAiPassed,
  listTemplates,
  parseAiPassedFilters,
  parseTemplateInput,
  reviewMetrics,
  routeTaskToDiscovery,
  taskBoard,
  updateTemplate,
} from "../lib/review-desk.js";

export const reviewDeskRoute = new Hono<{ Bindings: Env }>();

function requireStaff(caller: Caller) {
  requireRole(caller, "instructor", "admin", "platform_admin");
}

async function readJson(c: { req: { json: () => Promise<unknown> } }): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new ApiError("JSON が不正です", 400);
  }
}

reviewDeskRoute.get("/api/review-desk/ai-passed", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireStaff(caller);
    return c.json(await listAiPassed(db, caller, parseAiPassedFilters(c.req.query())));
  } catch (err) {
    return errorResponse(c, err);
  }
});

reviewDeskRoute.post("/api/submissions/:id/checks", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireStaff(caller);
    const body = (await readJson(c)) as { action?: unknown; comment?: unknown } | null;
    if (
      !body ||
      !CHECK_ACTIONS.includes(body.action as CheckAction) ||
      (body.comment !== undefined && typeof body.comment !== "string")
    )
      throw new ApiError("action は confirm・comment・overturn のどれかにしてください", 400);
    const checks = await checkAiPassedSubmission(
      db,
      caller,
      c.req.param("id"),
      { action: body.action as CheckAction, comment: (body.comment as string | undefined) ?? "" },
      clientIp(c),
    );
    return c.json({ checks });
  } catch (err) {
    return errorResponse(c, err);
  }
});

reviewDeskRoute.get("/api/review-desk/metrics", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireStaff(caller);
    const raw = c.req.query("days");
    const days = raw === undefined ? 30 : Number(raw);
    if (!Number.isInteger(days) || days < 1 || days > 366)
      throw new ApiError("days は 1〜366 で指定してください", 400);
    return c.json(await reviewMetrics(db, caller.tenantId, days));
  } catch (err) {
    return errorResponse(c, err);
  }
});

reviewDeskRoute.get("/api/review-desk/task-board", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireStaff(caller);
    const taskId = c.req.query("taskId");
    if (!taskId) throw new ApiError("taskId を指定してください", 400);
    const assigned = c.req.query("assigned");
    if (assigned !== undefined && assigned !== "mine")
      throw new ApiError("assigned には mine だけを指定できます", 400);
    return c.json(await taskBoard(db, caller, taskId, assigned === "mine"));
  } catch (err) {
    return errorResponse(c, err);
  }
});

reviewDeskRoute.post("/api/review-desk/task-board/discovery", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireStaff(caller);
    const body = (await readJson(c)) as { taskId?: unknown; rubricId?: unknown } | null;
    if (
      typeof body?.taskId !== "string" ||
      !body.taskId ||
      (body.rubricId !== undefined && body.rubricId !== null && typeof body.rubricId !== "string")
    )
      throw new ApiError("taskId・rubricId の形式が不正です", 400);
    return c.json(
      await routeTaskToDiscovery(
        db,
        caller,
        body.taskId,
        (body.rubricId as string | null | undefined) ?? null,
      ),
    );
  } catch (err) {
    return errorResponse(c, err);
  }
});

reviewDeskRoute.get("/api/review-templates", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireStaff(caller);
    const stageId = c.req.query("stageId");
    const pattern = c.req.query("pattern");
    return c.json({
      templates: await listTemplates(db, caller, {
        ...(stageId ? { stageId } : {}),
        ...(pattern ? { pattern } : {}),
      }),
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

reviewDeskRoute.post("/api/review-templates", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireStaff(caller);
    const input = parseTemplateInput(await readJson(c), false);
    return c.json({ template: await createTemplate(db, caller, input) }, 201);
  } catch (err) {
    return errorResponse(c, err);
  }
});

reviewDeskRoute.patch("/api/review-templates/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireStaff(caller);
    const input = parseTemplateInput(await readJson(c), true);
    return c.json({ template: await updateTemplate(db, caller, c.req.param("id"), input) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

reviewDeskRoute.delete("/api/review-templates/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireStaff(caller);
    await deleteTemplate(db, caller, c.req.param("id"));
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});
