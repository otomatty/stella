/**
 * 管理 API (ユーザー管理 #22 + 組織マスタ #29) — Cloudflare D1 版。
 *
 * 呼び出し元は admin であることを必須とし、 操作対象を同テナントに限定する。
 *
 *   GET  /api/admin/users          一覧 (同テナント)
 *   POST /api/admin/users/invite   招待 (Google ログイン / 組織の席数上限を強制)
 *   POST /api/admin/users/role     ロール変更
 *   POST /api/admin/users/disable  無効化 / 復帰 (getCaller の disabled ゲートで即時有効)
 *   GET  /api/admin/orgs           組織一覧 + 所属ユーザー数
 *   POST /api/admin/orgs/upsert    組織の作成 / 編集
 *   GET  /api/admin/settings       テナント設定 (テストモード) の取得
 *   POST /api/admin/settings       テナント設定 (テストモード) の更新
 *
 * テストモード ON のテナントでは、 招待 (ユーザー登録) 時にテストデータ
 * (受講登録・進捗・通知) を投入する (`lib/test-data.ts`)。
 *
 * 無効化は profiles.disabled を立てるだけで、 API 経由の全アクセスが getCaller の
 * disabled チェックで遮断される。
 */

import {
  isAssignableProfileRole,
  validateInviteUsersRequest,
  validateUpsertOrganization,
  type InviteResult,
  type OrganizationRow,
} from "@falcon/shared/admin/types";
import { Hono, type Context } from "hono";
import { and, asc, count, eq, inArray } from "drizzle-orm";

import { authUsers, profiles, tenants } from "../db/schema.js";
import {
  errorResponse,
  getCaller,
  requirePlatformAdmin,
  requireTenantAdmin,
  ApiError,
  requireReturning,
} from "../lib/authz.js";
import type { Caller } from "../lib/authz.js";
import type { Db } from "../db/client.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import { resolveInviteAuthUserId } from "../lib/auth-users.js";
import { insertTestDataForNewUser } from "../lib/test-data.js";
import type { Env } from "../env.js";

export const adminRoute = new Hono<{ Bindings: Env }>();

function initialsFrom(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

/** ユーザー管理用: tenant admin (admin | platform_admin) + caller 解決。 */
async function requireTenantAdminCtx(
  c: Context<{ Bindings: Env }>,
): Promise<{ caller: Caller; db: Db }> {
  const { caller, db } = await getCaller(c);
  requireTenantAdmin(caller);
  return { caller, db };
}

/** org ルート用: platform_admin のみ。 */
async function requirePlatformAdminCtx(
  c: Context<{ Bindings: Env }>,
): Promise<{ caller: Caller; db: Db }> {
  const { caller, db } = await getCaller(c);
  requirePlatformAdmin(caller);
  return { caller, db };
}

/**
 * 組織 (テナント) の席数上限と現在の使用席数を返す (Issue #29 — 席数上限管理)。
 *
 * 使用席数は無効化されていない所属プロフィール数で数える (組織一覧の member_count と同義)。
 * 集計は DB 側の COUNT(*) で行う。 planSeats が null のテナントは無制限。
 */
async function getSeatUsage(
  db: Db,
  tenantId: string,
): Promise<{ planSeats: number | null; seatsUsed: number; testMode: boolean }> {
  const tenantRow = (
    await db
      .select({ planSeats: tenants.planSeats, testMode: tenants.testMode })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1)
  )[0];
  const planSeats = tenantRow?.planSeats ?? null;
  const countRow = (
    await db
      .select({ value: count() })
      .from(profiles)
      .where(and(eq(profiles.tenantId, tenantId), eq(profiles.disabled, false)))
  )[0];
  return {
    planSeats,
    seatsUsed: Number(countRow?.value ?? 0),
    testMode: tenantRow?.testMode ?? false,
  };
}

/** 操作対象が同テナントであることを保証する (自己昇格 / 越テナントを防ぐ)。 */
async function requireSameTenantTarget(
  db: Db,
  caller: Caller,
  targetId: string,
): Promise<{ id: string; tenantId: string; role: string }> {
  const rows = await db
    .select({ id: profiles.id, tenantId: profiles.tenantId, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, targetId))
    .limit(1);
  if (!rows[0]) throw new ApiError("対象ユーザーが見つかりません", 404);
  if (rows[0].tenantId !== caller.tenantId) {
    throw new ApiError("他テナントのユーザーは操作できません", 403);
  }
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
    const { caller, db } = await requireTenantAdminCtx(c);
    const rows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.tenantId, caller.tenantId))
      .orderBy(asc(profiles.createdAt));
    return c.json({
      rows: rows.map((r) => ({
        id: r.id,
        tenant_id: r.tenantId,
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
    const { caller, db } = await requireTenantAdminCtx(c);
    const raw = await c.req.json().catch(() => null);
    const validated = validateInviteUsersRequest(raw);
    if (!validated.ok) return c.json({ error: validated.message }, validated.status);

    const ip = clientIp(c);

    // 既存プロフィールを email で一括確認 (テナントハイジャック防止)。
    const emails = validated.invites.map((i) => i.email);
    if (emails.length === 0) return c.json({ results: [] });
    const existingRows = await db
      .select({ tenantId: profiles.tenantId, email: profiles.email })
      .from(profiles)
      .where(inArray(profiles.email, emails));
    const existingByEmail = new Map(existingRows.map((r) => [r.email, r]));

    // 席数上限 (Issue #29): 新規招待が plan_seats を超える分はブロックする。
    const { planSeats, seatsUsed, testMode } = await getSeatUsage(db, caller.tenantId);
    let seatsConsumed = seatsUsed;

    const results: InviteResult[] = [];
    for (const inv of validated.invites) {
      try {
        const existing = existingByEmail.get(inv.email);
        if (existing) {
          results.push({
            email: inv.email,
            ok: false,
            error:
              existing.tenantId === caller.tenantId
                ? "このユーザーは既にこのテナントに登録 / 招待されています"
                : "このメールアドレスは既に別のテナントで登録されています",
          });
          continue;
        }
        if (planSeats != null && seatsConsumed >= planSeats) {
          results.push({
            email: inv.email,
            ok: false,
            error: `席数の上限 (${planSeats}) に達しているため招待できません。 組織マスタで席数を見直してください`,
          });
          continue;
        }
        const { userId, authExists } = await resolveInviteAuthUserId(db, inv.email);
        const profileInsert = db.insert(profiles).values({
          id: userId,
          tenantId: caller.tenantId,
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
        seatsConsumed += 1;

        // テストモード: 登録直後にテストデータを投入する (失敗しても招待は成功扱い)。
        let testDataInserted = false;
        if (testMode) {
          try {
            await insertTestDataForNewUser(db, {
              tenantId: caller.tenantId,
              userId,
              role: inv.role,
              displayName: inv.displayName,
              invitedBy: caller.id,
            });
            testDataInserted = true;
          } catch (e) {
            console.error("[admin] test data insert failed", inv.email, e);
          }
        }

        await recordAudit(db, caller, {
          action: "user_invite",
          targetType: "user",
          targetId: userId,
          ip,
          metadata: {
            email: inv.email,
            role: inv.role,
            ...(testDataInserted ? { test_data: true } : {}),
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
    const { caller, db } = await requireTenantAdminCtx(c);
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) return c.json({ error: "userId は必須です" }, 400);
    if (!isAssignableProfileRole(body.role)) return c.json({ error: "role が不正です" }, 400);
    if (userId === caller.id) {
      return c.json({ error: "自分自身のロールは変更できません" }, 400);
    }
    const target = await requireSameTenantTarget(db, caller, userId);
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
    const { caller, db } = await requireTenantAdminCtx(c);
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) return c.json({ error: "userId は必須です" }, 400);
    if (typeof body.disabled !== "boolean") {
      return c.json({ error: "disabled は真偽値である必要があります" }, 400);
    }
    if (userId === caller.id) return c.json({ error: "自分自身は無効化できません" }, 400);
    const target = await requireSameTenantTarget(db, caller, userId);
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
// 組織一覧
// ---------------------------------------------------------------
adminRoute.get("/api/admin/orgs", async (c) => {
  try {
    const { db } = await requirePlatformAdminCtx(c);
    const tenantRows = await db.select().from(tenants).orderBy(asc(tenants.createdAt));
    const memberRows = await db
      .select({ tenantId: profiles.tenantId })
      .from(profiles)
      .where(eq(profiles.disabled, false));
    const counts = new Map<string, number>();
    for (const r of memberRows) counts.set(r.tenantId, (counts.get(r.tenantId) ?? 0) + 1);

    const organizations: OrganizationRow[] = tenantRows.map((t) => ({
      id: t.id,
      name: t.name,
      subtitle: t.subtitle,
      icon: t.icon,
      contact_name: t.contactName,
      contact_email: t.contactEmail,
      plan_seats: t.planSeats,
      contract_start: t.contractStart,
      contract_end: t.contractEnd,
      active: t.active,
      created_at: t.createdAt.toISOString(),
      updated_at: t.updatedAt.toISOString(),
      member_count: counts.get(t.id) ?? 0,
    }));
    return c.json({ organizations });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// ---------------------------------------------------------------
// 組織の作成 / 編集
// ---------------------------------------------------------------
adminRoute.post("/api/admin/orgs/upsert", async (c) => {
  try {
    const { caller, db } = await requirePlatformAdminCtx(c);
    const raw = await c.req.json().catch(() => null);
    const validated = validateUpsertOrganization(raw);
    if (!validated.ok) return c.json({ error: validated.message }, validated.status);
    const v = validated.value;

    const existing = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, v.id))
      .limit(1);
    if (v.expectCreate && existing[0]) {
      throw new ApiError("この組織IDは既に使用されています", 409);
    }
    const isCreate = existing.length === 0;

    const values = {
      id: v.id,
      name: v.name,
      subtitle: v.subtitle ?? null,
      contactName: v.contactName ?? null,
      contactEmail: v.contactEmail ?? null,
      planSeats: v.planSeats ?? null,
      contractStart: v.contractStart ?? null,
      contractEnd: v.contractEnd ?? null,
      active: v.active ?? true,
    };
    const saved = requireReturning(
      await db
        .insert(tenants)
        .values(values)
        .onConflictDoUpdate({
          target: tenants.id,
          set: { ...values, updatedAt: new Date() },
        })
        .returning(),
      "tenant upsert",
    );

    await recordAudit(db, caller, {
      action: isCreate ? "org_create" : "org_update",
      targetType: "org",
      targetId: v.id,
      ip: clientIp(c),
      metadata: { name: v.name, active: values.active },
    });

    return c.json({
      organization: {
        id: saved.id,
        name: saved.name,
        subtitle: saved.subtitle,
        icon: saved.icon,
        contact_name: saved.contactName,
        contact_email: saved.contactEmail,
        plan_seats: saved.planSeats,
        contract_start: saved.contractStart,
        contract_end: saved.contractEnd,
        active: saved.active,
        created_at: saved.createdAt.toISOString(),
        updated_at: saved.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// ---------------------------------------------------------------
// テナント設定 (テストモード)
// ---------------------------------------------------------------

adminRoute.get("/api/admin/settings", async (c) => {
  try {
    const { caller, db } = await requireTenantAdminCtx(c);
    const row = (
      await db
        .select({ testMode: tenants.testMode })
        .from(tenants)
        .where(eq(tenants.id, caller.tenantId))
        .limit(1)
    )[0];
    if (!row) throw new ApiError("テナントが見つかりません", 404);
    return c.json({ settings: { test_mode: row.testMode } });
  } catch (err) {
    return errorResponse(c, err);
  }
});

adminRoute.post("/api/admin/settings", async (c) => {
  try {
    const { caller, db } = await requireTenantAdminCtx(c);
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    if (typeof body.testMode !== "boolean") {
      return c.json({ error: "testMode は真偽値である必要があります" }, 400);
    }
    await db
      .update(tenants)
      .set({ testMode: body.testMode, updatedAt: new Date() })
      .where(eq(tenants.id, caller.tenantId));
    await recordAudit(db, caller, {
      action: body.testMode ? "test_mode_enable" : "test_mode_disable",
      targetType: "tenant",
      targetId: caller.tenantId,
      ip: clientIp(c),
      metadata: { test_mode: body.testMode },
    });
    return c.json({ settings: { test_mode: body.testMode } });
  } catch (err) {
    return errorResponse(c, err);
  }
});
