/**
 * 課題ごとの支援の記録 (#38・07 §6.5)。
 *
 * 受講者は自分の記録だけを読む。講師・管理者は同じテナントの受講者の記録を読む
 * (提出のレビューと同じ範囲。担当に限らない)。
 */

import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { profiles } from "../db/schema.js";
import type { Env } from "../env.js";
import { ApiError, errorResponse, getCaller, isStaffRole } from "../lib/authz.js";
import { canAccessTasks } from "../lib/task-access.js";
import { loadTaskSupport } from "../lib/task-support.js";

export const taskSupportRoute = new Hono<{ Bindings: Env }>();

taskSupportRoute.get("/api/task-support", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const userId = c.req.query("userId") || caller.id;
    const stageId = c.req.query("stageId") || undefined;
    if (userId !== caller.id) {
      if (!isStaffRole(caller.role)) throw new ApiError("権限がありません", 403);
      const [learner] = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(and(eq(profiles.id, userId), eq(profiles.tenantId, caller.tenantId)))
        .limit(1);
      if (!learner) throw new ApiError("受講者が見つかりません", 404);
    } else if (stageId && !(await canAccessTasks(db, caller, stageId))) {
      // 課題一覧 (`/api/tasks/for-stage`) と同じく、受講していないステージの課題名は出さない。
      throw new ApiError("task stage not found", 404);
    }
    // 本人には今読めるステージの課題だけを返す (ステージを省略しても、受講をやめた・
    // 非公開になったステージの課題名を出さない)。講師・管理者はテナントの範囲で見る。
    const records = await loadTaskSupport(db, {
      tenantId: caller.tenantId,
      userId,
      stageId,
      readableOnly: userId === caller.id,
    });
    return c.json({ tasks: records });
  } catch (err) {
    return errorResponse(c, err);
  }
});
