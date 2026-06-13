/**
 * 受講登録 API (旧 enrollments テーブル直アクセス + RLS の置き換え / Issue #20)。
 *
 * アプリ層認可 (旧 RLS の置き換え):
 *   - 受講者は自分の enrollment のみ read … GET /api/enrollments/mine
 *   - instructor/admin は同テナントを read/write … 他ルートは requireRole + tenant 突合
 */

import { Hono } from "hono";
import { and, asc, eq } from "drizzle-orm";

import { enrollments } from "../db/schema.js";
import { errorResponse, getCaller, requireRole, ApiError } from "../lib/authz.js";
import type { Env } from "../env.js";

export const enrollmentsRoute = new Hono<{ Bindings: Env }>();

const SELECT = {
  id: enrollments.id,
  tenant_id: enrollments.tenantId,
  user_id: enrollments.userId,
  course_id: enrollments.courseId,
  assigned_by: enrollments.assignedBy,
  due_at: enrollments.dueAt,
  required: enrollments.required,
  status: enrollments.status,
  enrolled_at: enrollments.enrolledAt,
  completed_at: enrollments.completedAt,
} as const;

/** 受講者本人の enrollment 一覧 (登録日昇順)。 */
enrollmentsRoute.get("/api/enrollments/mine", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const rows = await db
      .select(SELECT)
      .from(enrollments)
      .where(eq(enrollments.userId, caller.id))
      .orderBy(asc(enrollments.enrolledAt));
    return c.json({ rows });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** staff: あるコースの受講者 enrollment 一覧 (同テナント)。 */
enrollmentsRoute.get("/api/enrollments", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    const courseId = c.req.query("courseId");
    if (!courseId) throw new ApiError("courseId が必要です", 400);
    const rows = await db
      .select(SELECT)
      .from(enrollments)
      .where(
        and(
          eq(enrollments.courseId, courseId),
          eq(enrollments.tenantId, caller.tenantId),
        ),
      )
      .orderBy(asc(enrollments.enrolledAt));
    return c.json({ rows });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** staff: 受講者にコースを割り当てる (upsert で二重登録防止)。 */
enrollmentsRoute.post("/api/enrollments", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    const body = (await c.req.json()) as {
      userId: string;
      courseId: string;
      dueAt?: string | null;
      required?: boolean;
    };
    if (!body.userId || !body.courseId) {
      throw new ApiError("userId / courseId が必要です", 400);
    }
    const rows = await db
      .insert(enrollments)
      .values({
        tenantId: caller.tenantId,
        userId: body.userId,
        courseId: body.courseId,
        assignedBy: caller.id,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        required: body.required ?? true,
      })
      .onConflictDoUpdate({
        target: [enrollments.userId, enrollments.courseId],
        set: {
          assignedBy: caller.id,
          dueAt: body.dueAt ? new Date(body.dueAt) : null,
          required: body.required ?? true,
        },
      })
      .returning(SELECT);
    return c.json({ row: rows[0] });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 対象 enrollment が caller と同テナントであることを保証する。 */
async function assertSameTenant(
  db: Awaited<ReturnType<typeof getCaller>>["db"],
  id: string,
  tenantId: string,
): Promise<void> {
  const rows = await db
    .select({ tenant_id: enrollments.tenantId })
    .from(enrollments)
    .where(eq(enrollments.id, id))
    .limit(1);
  if (!rows[0]) throw new ApiError("対象が見つかりません", 404);
  if (rows[0].tenant_id !== tenantId) {
    throw new ApiError("他テナントの登録は操作できません", 403);
  }
}

/** staff: 期限 / 必須 / ステータスを更新する。 */
enrollmentsRoute.patch("/api/enrollments/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    const id = c.req.param("id");
    await assertSameTenant(db, id, caller.tenantId);
    const patch = (await c.req.json()) as {
      due_at?: string | null;
      required?: boolean;
      status?: "active" | "completed" | "expired";
      completed_at?: string | null;
    };
    await db
      .update(enrollments)
      .set({
        ...(patch.due_at !== undefined
          ? { dueAt: patch.due_at ? new Date(patch.due_at) : null }
          : {}),
        ...(patch.required !== undefined ? { required: patch.required } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.completed_at !== undefined
          ? { completedAt: patch.completed_at ? new Date(patch.completed_at) : null }
          : {}),
      })
      .where(eq(enrollments.id, id));
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** staff: 割当を解除する。 */
enrollmentsRoute.delete("/api/enrollments/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    const id = c.req.param("id");
    await assertSameTenant(db, id, caller.tenantId);
    await db.delete(enrollments).where(eq(enrollments.id, id));
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});
