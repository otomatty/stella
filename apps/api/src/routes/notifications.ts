/**
 * 通知・お知らせ API (旧 announcements / notifications + RLS + トリガーの置き換え / Issue #25)。
 *
 * 旧トリガー / RLS のアプリ層での再現:
 *   - お知らせ作成: author を caller から確定し、 対象受講者へ通知を fan-out する
 *     (stage 指定 → 受講登録者、 未指定 → テナント全 student、 発信者自身は除外)。
 *   - お知らせ read: stage 全体は全員、 stage 指定は staff か当該ステージ受講者のみ。
 *   - 通知は本人のみ read / 既読化。 生成はサーバ内ロジックからのみ (捏造防止)。
 */

import { Hono } from "hono";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";

import { announcements, enrollments, notifications, profiles } from "../db/schema.js";
import {
  errorResponse,
  getCaller,
  requireRole,
  ApiError,
  isStaffRole,
  requireReturning,
} from "../lib/authz.js";
import type { Caller } from "../lib/authz.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";

export const notificationsRoute = new Hono<{ Bindings: Env }>();

const A_COLS = {
  id: announcements.id,
  tenant_id: announcements.tenantId,
  stage_id: announcements.stageId,
  author_id: announcements.authorId,
  author_name: announcements.authorName,
  title: announcements.title,
  body: announcements.body,
  published_at: announcements.publishedAt,
  created_at: announcements.createdAt,
} as const;

const N_COLS = {
  id: notifications.id,
  user_id: notifications.userId,
  tenant_id: notifications.tenantId,
  type: notifications.type,
  title: notifications.title,
  body: notifications.body,
  payload: notifications.payload,
  read: notifications.read,
  created_at: notifications.createdAt,
} as const;

/** caller が受講登録しているステージ ID の集合。 */
async function enrolledStageIds(db: Db, userId: string): Promise<string[]> {
  const rows = await db
    .select({ stageId: enrollments.stageId })
    .from(enrollments)
    .where(eq(enrollments.userId, userId));
  return rows.map((r) => r.stageId);
}

/** 公開順 (published_at 降順) でお知らせを取得する。 */
notificationsRoute.get("/api/announcements", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const stageId = c.req.query("stageId");
    const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
    const isStaff = isStaffRole(caller.role);

    const conds = [eq(announcements.tenantId, caller.tenantId)];
    if (stageId) conds.push(eq(announcements.stageId, stageId));

    if (!isStaff) {
      // 受講者: テナント全体 (stage_id null) か、 登録済みステージのお知らせのみ。
      const ids = await enrolledStageIds(db, caller.id);
      const visible = ids.length
        ? or(isNull(announcements.stageId), inArray(announcements.stageId, ids))
        : isNull(announcements.stageId);
      if (visible) conds.push(visible);
    }

    const rows = await db
      .select(A_COLS)
      .from(announcements)
      .where(and(...conds))
      .orderBy(desc(announcements.publishedAt))
      .limit(limit);
    return c.json({ rows });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** お知らせを作成し、 対象受講者へ通知を fan-out する (staff のみ)。 */
notificationsRoute.post("/api/announcements", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const body = (await c.req.json()) as {
      stageId?: string | null;
      title: string;
      body: string;
    };
    if (!body.title || !body.body) throw new ApiError("title / body が必要です", 400);

    const inserted = await db
      .insert(announcements)
      .values({
        tenantId: caller.tenantId,
        stageId: body.stageId ?? null,
        authorId: caller.id,
        authorName: caller.name,
        title: body.title,
        body: body.body,
      })
      .returning(A_COLS);
    const row = requireReturning(inserted, "announcement insert");

    await fanoutAnnouncement(db, caller, row.id, row.stage_id, row.title, row.body);
    return c.json({ row });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** お知らせを対象受講者 (発信者除く) へ通知として fan-out する。 */
async function fanoutAnnouncement(
  db: Db,
  caller: Caller,
  announcementId: string,
  stageId: string | null,
  title: string,
  body: string,
): Promise<void> {
  // 対象 student を解決する。
  const baseConds = [eq(profiles.tenantId, caller.tenantId), eq(profiles.role, "student")];
  let targetIds: string[];
  if (stageId) {
    const rows = await db
      .select({ id: profiles.id })
      .from(profiles)
      .innerJoin(enrollments, eq(enrollments.userId, profiles.id))
      .where(and(...baseConds, eq(enrollments.stageId, stageId)));
    targetIds = rows.map((r) => r.id);
  } else {
    const rows = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(...baseConds));
    targetIds = rows.map((r) => r.id);
  }
  const recipients = targetIds.filter((id) => id !== caller.id);
  if (recipients.length === 0) return;

  await db.insert(notifications).values(
    recipients.map((userId) => ({
      userId,
      tenantId: caller.tenantId,
      type: "announcement" as const,
      title,
      body,
      payload: { announcement_id: announcementId, stage_id: stageId },
    })),
  );
}

/** 自分宛の通知を新着順で取得する。 */
notificationsRoute.get("/api/notifications", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const unreadOnly = c.req.query("unreadOnly") === "true";
    const limit = Math.min(Number(c.req.query("limit")) || 30, 200);

    const conds = [
      eq(notifications.userId, caller.id),
      eq(notifications.tenantId, caller.tenantId),
    ];
    if (unreadOnly) conds.push(eq(notifications.read, false));

    const rows = await db
      .select(N_COLS)
      .from(notifications)
      .where(and(...conds))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    return c.json({ rows });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 通知を既読にする (本人のみ)。 */
notificationsRoute.patch("/api/notifications/:id/read", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const id = c.req.param("id");
    const updated = await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, caller.id),
          eq(notifications.tenantId, caller.tenantId),
        ),
      )
      .returning({ id: notifications.id });
    if (!updated[0]) {
      throw new ApiError("対象の通知が見つからないか、 更新権限がありません", 404);
    }
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 自分宛の未読通知をすべて既読にする (当該テナント内)。 */
notificationsRoute.post("/api/notifications/read-all", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.userId, caller.id),
          eq(notifications.tenantId, caller.tenantId),
          eq(notifications.read, false),
        ),
      );
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});
