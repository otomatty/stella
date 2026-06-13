/**
 * 管理 API (ユーザー管理 #22 + 組織マスタ #29) — Neon / Drizzle 版。
 *
 * 旧 Supabase service-role + RLS + 3 RPC を、 Neon Auth JWT 検証 + アプリ層認可 +
 * Drizzle に置き換えた。 呼び出し元は admin であることを必須とし、 操作対象を同テナントに限定する。
 *
 *   GET  /api/admin/users          一覧 (同テナント)
 *   POST /api/admin/users/invite   招待 (要 Neon Auth admin API)
 *   POST /api/admin/users/role     ロール変更
 *   POST /api/admin/users/disable  無効化 / 復帰 (getCaller の disabled ゲートで即時有効)
 *   GET  /api/admin/orgs           組織一覧 + 所属ユーザー数
 *   POST /api/admin/orgs/upsert    組織の作成 / 編集
 *
 * 無効化は profiles.disabled を立てるだけで、 API 経由の全アクセスが getCaller の
 * disabled チェックで遮断される。 アイデンティティ側のセッション失効を即時化したい場合は
 * Neon Auth admin API (NEON_AUTH_ADMIN_URL) を併用する。
 */

import {
  isProfileRole,
  validateInviteUsersRequest,
  validateUpsertOrganization,
  type InviteResult,
  type OrganizationRow,
} from "@falcon/shared/admin/types";
import { Hono, type Context } from "hono";
import { asc, eq, inArray } from "drizzle-orm";

import { auditLogs, profiles, tenants } from "../db/schema.js";
import { errorResponse, getCaller, requireRole, ApiError } from "../lib/authz.js";
import type { Caller } from "../lib/authz.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";

export const adminRoute = new Hono<{ Bindings: Env }>();

function clientIp(c: Context<{ Bindings: Env }>): string | null {
  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

function initialsFrom(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

/** 監査ログを 1 件記録する (best-effort)。 */
async function recordAudit(
  db: Db,
  caller: Caller,
  entry: {
    action: string;
    targetType: string;
    targetId?: string | null;
    ip?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      tenantId: caller.tenantId,
      actorId: caller.id,
      actorName: caller.name,
      actorRole: caller.role,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      ip: entry.ip ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (e) {
    console.error("[admin] audit log failed", entry.action, e);
  }
}

/** admin 認証 + caller 解決。 */
async function requireAdmin(c: Context<{ Bindings: Env }>): Promise<{ caller: Caller; db: Db }> {
  const { caller, db } = await getCaller(c);
  requireRole(caller, "admin");
  return { caller, db };
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

// ---------------------------------------------------------------
// ユーザー一覧
// ---------------------------------------------------------------
adminRoute.get("/api/admin/users", async (c) => {
  try {
    const { caller, db } = await requireAdmin(c);
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
// 招待 (要 Neon Auth admin API)
// ---------------------------------------------------------------

/** Neon Auth admin API でユーザーを作成 / 招待し、 ユーザー ID を返す。 */
async function inviteNeonAuthUser(
  env: Env,
  email: string,
  metadata: { tenant_id: string; role: string; display_name: string },
  redirectTo?: string,
): Promise<string> {
  if (!env.NEON_AUTH_ADMIN_URL || !env.NEON_AUTH_ADMIN_SECRET) {
    throw new ApiError("招待には Neon Auth admin API (NEON_AUTH_ADMIN_URL) の設定が必要です", 503);
  }
  const res = await fetch(`${env.NEON_AUTH_ADMIN_URL.replace(/\/$/, "")}/users/invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.NEON_AUTH_ADMIN_SECRET}`,
    },
    body: JSON.stringify({ email, metadata, ...(redirectTo ? { callbackUrl: redirectTo } : {}) }),
  });
  if (!res.ok) throw new ApiError("招待の発行に失敗しました", 502);
  const data = (await res.json()) as { id?: string; userId?: string };
  const id = data.id ?? data.userId;
  if (!id) throw new ApiError("Neon Auth が user id を返しませんでした", 502);
  return id;
}

function resolveInviteRedirect(env: Env): string | undefined {
  if (env.INVITE_REDIRECT_URL) return env.INVITE_REDIRECT_URL;
  return env.ALLOWED_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter((s) => s && !s.includes("*"))[0];
}

adminRoute.post("/api/admin/users/invite", async (c) => {
  try {
    const { caller, db } = await requireAdmin(c);
    const raw = await c.req.json().catch(() => null);
    const validated = validateInviteUsersRequest(raw);
    if (!validated.ok) return c.json({ error: validated.message }, validated.status);

    const redirectTo = resolveInviteRedirect(c.env);
    const ip = clientIp(c);

    // 既存プロフィールを email で一括確認 (テナントハイジャック防止)。
    const emails = validated.invites.map((i) => i.email);
    if (emails.length === 0) return c.json({ results: [] });
    const existingRows = await db
      .select({ tenantId: profiles.tenantId, email: profiles.email })
      .from(profiles)
      .where(inArray(profiles.email, emails));
    const existingByEmail = new Map(existingRows.map((r) => [r.email, r]));

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
        const userId = await inviteNeonAuthUser(
          c.env,
          inv.email,
          { tenant_id: caller.tenantId, role: inv.role, display_name: inv.displayName },
          redirectTo,
        );
        await db.insert(profiles).values({
          id: userId,
          tenantId: caller.tenantId,
          role: inv.role,
          displayName: inv.displayName,
          initials: initialsFrom(inv.displayName),
          email: inv.email,
        });
        await recordAudit(db, caller, {
          action: "user_invite",
          targetType: "user",
          targetId: userId,
          ip,
          metadata: { email: inv.email, role: inv.role },
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
    const { caller, db } = await requireAdmin(c);
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) return c.json({ error: "userId は必須です" }, 400);
    if (!isProfileRole(body.role)) return c.json({ error: "role が不正です" }, 400);
    if (userId === caller.id) {
      return c.json({ error: "自分自身のロールは変更できません" }, 400);
    }
    await requireSameTenantTarget(db, caller, userId);
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
    const { caller, db } = await requireAdmin(c);
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) return c.json({ error: "userId は必須です" }, 400);
    if (typeof body.disabled !== "boolean") {
      return c.json({ error: "disabled は真偽値である必要があります" }, 400);
    }
    if (userId === caller.id) return c.json({ error: "自分自身は無効化できません" }, 400);
    await requireSameTenantTarget(db, caller, userId);

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
    const { db } = await requireAdmin(c);
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
    const { caller, db } = await requireAdmin(c);
    const raw = await c.req.json().catch(() => null);
    const validated = validateUpsertOrganization(raw);
    if (!validated.ok) return c.json({ error: validated.message }, validated.status);
    const v = validated.value;

    const existing = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, v.id)).limit(1);
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
    const saved = (
      await db
        .insert(tenants)
        .values(values)
        .onConflictDoUpdate({
          target: tenants.id,
          set: { ...values, updatedAt: new Date() },
        })
        .returning()
    )[0]!;

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
