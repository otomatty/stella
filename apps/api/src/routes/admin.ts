/**
 * 管理 API (ユーザー管理)。
 *
 * 呼び出し元は admin または platform_admin であることを必須とする。
 * platform_admin は他の管理者から無効化・降格されない。
 *
 *   GET  /api/admin/users          一覧
 *   POST /api/admin/users/invite   招待 (Google ログイン)
 *   POST /api/admin/users/role     ロール変更
 *   POST /api/admin/users/disable  無効化 / 復帰 (getCaller の disabled ゲートで即時有効)
 *   POST /api/admin/users/delete   受講者の削除 (提出・本棚の R2・認証まで)
 *
 * 無効化は profiles.disabled を立てるだけで、 API 経由の全アクセスが getCaller の
 * disabled チェックで遮断される。
 *
 * 受講者の削除は、外部キーの無い提出・接続・問い合わせと、受講者の id を含む通知、
 * プロフィール、auth_users を 1 つの batch で消す。本棚のファイルは library_r2_purges に積む。
 */

import { isAssignableProfileRole, validateInviteUsersRequest } from "@stella/shared/admin/types";
import type { InviteResult } from "@stella/shared/admin/types";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { Hono, type Context } from "hono";

import type { Db } from "../db/client.js";
import {
  auditLogs,
  authUsers,
  authVscodeLinks,
  libraryBooks,
  libraryR2Purges,
  notifications,
  profiles,
  submissions,
  supportInquiries,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { auditLogInsert, clientIp, recordAudit } from "../lib/audit.js";
import { resolveInviteAuthUserId } from "../lib/auth-users.js";
import { ApiError, errorResponse, getCaller, requireAdmin, type Caller } from "../lib/authz.js";

export const adminRoute = new Hono<{ Bindings: Env }>();

function initialsFrom(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

/** ユーザー管理用: admin | platform_admin + caller 解決。 */
async function requireAdminCtx(c: Context<{ Bindings: Env }>): Promise<{ caller: Caller; db: Db }> {
  const { caller, db } = await getCaller(c);
  requireAdmin(caller);
  return { caller, db };
}

/** 操作対象が存在することを保証する (自己昇格を防ぐ材料)。無ければ 404。 */
async function requireTarget(db: Db, targetId: string): Promise<{ id: string; role: string }> {
  const rows = await db
    .select({ id: profiles.id, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, targetId))
    .limit(1);
  if (!rows[0]) throw new ApiError("対象ユーザーが見つかりません", 404);
  return rows[0];
}

/** platform_admin は SQL/seed 専用。非 platform_admin からの role/disable を拒否。 */
function rejectPlatformAdminTargetUnlessCallerIsPlatformAdmin(
  caller: Caller,
  targetRole: string,
): void {
  if (targetRole === "platform_admin" && caller.role !== "platform_admin") {
    throw new ApiError("platform_admin は操作できません", 403);
  }
}

// ---------------------------------------------------------------
// ユーザー一覧
// ---------------------------------------------------------------
adminRoute.get("/api/admin/users", async (c) => {
  try {
    const { db } = await requireAdminCtx(c);
    const rows = await db.select().from(profiles).orderBy(asc(profiles.createdAt));
    return c.json({
      rows: rows.map((r) => ({
        id: r.id,
        role: r.role,
        display_name: r.displayName,
        initials: r.initials,
        email: r.email,
        disabled: r.disabled,
        created_at: r.createdAt,
      })),
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// ---------------------------------------------------------------
// 招待 (Google ログイン)
// ---------------------------------------------------------------

adminRoute.post("/api/admin/users/invite", async (c) => {
  try {
    const { caller, db } = await requireAdminCtx(c);
    const raw = await c.req.json().catch(() => null);
    const validated = validateInviteUsersRequest(raw);
    if (!validated.ok) return c.json({ error: validated.message }, validated.status);

    const ip = clientIp(c);

    // 既に登録済みのメールは招待しない。
    const emails = validated.invites.map((i) => i.email);
    if (emails.length === 0) return c.json({ results: [] });
    const existingRows = await db
      .select({ email: profiles.email })
      .from(profiles)
      .where(inArray(profiles.email, emails));
    const existingEmails = new Set(existingRows.map((r) => r.email));

    const results: InviteResult[] = [];
    for (const inv of validated.invites) {
      try {
        if (existingEmails.has(inv.email)) {
          results.push({
            email: inv.email,
            ok: false,
            error: "このメールアドレスは既に登録されています",
          });
          continue;
        }
        const { userId, authExists } = await resolveInviteAuthUserId(db, inv.email);
        const profileInsert = db.insert(profiles).values({
          id: userId,
          role: inv.role,
          displayName: inv.displayName,
          initials: initialsFrom(inv.displayName),
          email: inv.email,
        });
        if (authExists) {
          // login-before-invite: 既存 auth_users.id に profile のみ紐付け
          await profileInsert;
        } else {
          // 新規: profile + auth_users を D1 batch で原子作成
          await db.batch([
            profileInsert,
            db.insert(authUsers).values({ id: userId, email: inv.email }),
          ]);
        }
        existingEmails.add(inv.email);

        await recordAudit(db, caller, {
          action: "user_invite",
          targetType: "user",
          targetId: userId,
          ip,
          metadata: {
            email: inv.email,
            role: inv.role,
          },
        });
        results.push({ email: inv.email, ok: true, userId });
      } catch (rowErr) {
        const msg = rowErr instanceof ApiError ? rowErr.message : "招待に失敗しました";
        results.push({ email: inv.email, ok: false, error: msg });
      }
    }
    return c.json({ results });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// ---------------------------------------------------------------
// ロール変更
// ---------------------------------------------------------------
adminRoute.post("/api/admin/users/role", async (c) => {
  try {
    const { caller, db } = await requireAdminCtx(c);
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) return c.json({ error: "userId は必須です" }, 400);
    if (!isAssignableProfileRole(body.role)) return c.json({ error: "role が不正です" }, 400);
    if (userId === caller.id) {
      return c.json({ error: "自分自身のロールは変更できません" }, 400);
    }
    const target = await requireTarget(db, userId);
    rejectPlatformAdminTargetUnlessCallerIsPlatformAdmin(caller, target.role);
    await db.update(profiles).set({ role: body.role }).where(eq(profiles.id, userId));
    await recordAudit(db, caller, {
      action: "user_role_change",
      targetType: "user",
      targetId: userId,
      ip: clientIp(c),
      metadata: { new_role: body.role },
    });
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// ---------------------------------------------------------------
// 無効化 / 復帰
// ---------------------------------------------------------------
adminRoute.post("/api/admin/users/disable", async (c) => {
  try {
    const { caller, db } = await requireAdminCtx(c);
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) return c.json({ error: "userId は必須です" }, 400);
    if (typeof body.disabled !== "boolean") {
      return c.json({ error: "disabled は真偽値である必要があります" }, 400);
    }
    if (userId === caller.id) return c.json({ error: "自分自身は無効化できません" }, 400);
    const target = await requireTarget(db, userId);
    rejectPlatformAdminTargetUnlessCallerIsPlatformAdmin(caller, target.role);

    await db.update(profiles).set({ disabled: body.disabled }).where(eq(profiles.id, userId));
    await recordAudit(db, caller, {
      action: body.disabled ? "user_disable" : "user_enable",
      targetType: "user",
      targetId: userId,
      ip: clientIp(c),
      metadata: { disabled: body.disabled },
    });
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// ---------------------------------------------------------------
// 受講者の削除
// ---------------------------------------------------------------

/** 確認用メールを、一覧 API と同じ profiles.email と比べる形にそろえる。 */
function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

adminRoute.post("/api/admin/users/delete", async (c) => {
  try {
    const { caller, db } = await requireAdminCtx(c);
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) return c.json({ error: "userId は必須です" }, 400);
    if (userId === caller.id) return c.json({ error: "自分自身は削除できません" }, 400);
    const target = await requireTarget(db, userId);
    rejectPlatformAdminTargetUnlessCallerIsPlatformAdmin(caller, target.role);
    if (target.role !== "student") {
      return c.json({ error: "削除できるのは受講者だけです" }, 400);
    }
    const emailRow = (
      await db
        .select({ email: profiles.email })
        .from(profiles)
        .where(eq(profiles.id, userId))
        .limit(1)
    )[0];
    // 一覧 (GET /api/admin/users) が出すのは profiles.email。
    // 空の確認と NULL・空のメールが両方とも空文字になり、一致してしまうのを止める。
    const targetEmail = normalizeEmail(emailRow?.email);
    if (targetEmail === "") {
      return c.json({ error: "メールアドレスの無い受講者は削除できません" }, 400);
    }
    if (normalizeEmail(body.confirmEmail) !== targetEmail) {
      return c.json({ error: "確認のメールアドレスが一致しません" }, 400);
    }

    const submissionCount = (
      await db.select({ value: count() }).from(submissions).where(eq(submissions.studentId, userId))
    )[0];
    const bookCount = (
      await db.select({ value: count() }).from(libraryBooks).where(eq(libraryBooks.ownerId, userId))
    )[0];
    const deleted = {
      submissions: Number(submissionCount?.value ?? 0),
      library_books: Number(bookCount?.value ?? 0),
    };
    const now = Date.now();
    // 接頭辞は bookPrefix(bookId) と同じ `library/<tenant>/<book>/` (保存済みの tenant_id の値を使う)。
    // audit_logs.metadata は NOT NULL (既定 '{}') なので、空オブジェクトにしてメールなどを外す。
    await db.batch([
      db
        .insert(libraryR2Purges)
        .select(
          sql`SELECT 'library/' || tenant_id || '/' || id || '/', ${now}
              FROM library_books WHERE owner_id = ${userId}`,
        )
        .onConflictDoNothing(),
      db.delete(submissions).where(eq(submissions.studentId, userId)),
      db.delete(authVscodeLinks).where(eq(authVscodeLinks.userId, userId)),
      db.delete(supportInquiries).where(eq(supportInquiries.userId, userId)),
      db.delete(notifications).where(sql`instr(payload, ${userId}) > 0`),
      db
        .update(auditLogs)
        .set({ metadata: {} })
        .where(and(eq(auditLogs.targetType, "user"), eq(auditLogs.targetId, userId))),
      db
        .update(auditLogs)
        .set({ actorName: "削除したユーザー", metadata: {} })
        .where(eq(auditLogs.actorId, userId)),
      db.delete(profiles).where(eq(profiles.id, userId)),
      db.delete(authUsers).where(eq(authUsers.id, userId)),
      // 個人情報を外す UPDATE より後。この行の actor は削除する受講者ではなく管理者。
      auditLogInsert(db, caller, {
        action: "user_delete",
        targetType: "user",
        targetId: userId,
        ip: clientIp(c),
        metadata: deleted,
      }),
    ]);
    return c.json({ ok: true, deleted });
  } catch (err) {
    return errorResponse(c, err);
  }
});
