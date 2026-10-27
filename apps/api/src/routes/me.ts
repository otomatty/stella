/**
 * 認証済みユーザー自身のプロフィール API (旧 auth.ts の profiles 直アクセスの置き換え)。
 *
 *   GET  /api/me  … caller のプロフィールを返す (未招待は invite_required)
 *   POST /api/me  … 表示名・週の時間・開始日・教材の OS の自己更新 / 未招待は invite_required
 *
 * role / tenant / email は招待と Clerk のログインが真実なので、
 * 本人からは変更させない (別テナントのメールを名乗るなりすましを防ぐ)。
 *
 * getCaller は「プロフィール必須」だが、 ここは利用者の検証だけをして profile の有無で
 * invite_required を返すため、 resolveIdentity を直接使う。
 */

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { parseOsPreference } from "@stella/shared/markdown/os-blocks";
import { parsePaceSettings } from "@stella/shared/study/pace";

import { getDb } from "../db/client.js";
import { profiles, tenants } from "../db/schema.js";
import {
  ApiError,
  assertStaffAccess,
  assertTenantActive,
  errorResponse,
  profileMatch,
  recordDisabled,
  recordUninvited,
  resolveIdentity,
} from "../lib/authz.js";
import type { Env } from "../env.js";
import { paceProfileUpdate } from "../lib/learning-pace.js";
import { markRequestActor, trackSession } from "../lib/security-events.js";

export const meRoute = new Hono<{ Bindings: Env }>();

/** ユーザー名の上限。 一覧・修了証・アバターの表示が破綻しない範囲。 */
const MAX_DISPLAY_NAME_LENGTH = 50;

const PROFILE_COLS = {
  id: profiles.id,
  tenant_id: profiles.tenantId,
  role: profiles.role,
  display_name: profiles.displayName,
  initials: profiles.initials,
  avatar_url: profiles.avatarUrl,
  email: profiles.email,
  disabled: profiles.disabled,
  created_at: profiles.createdAt,
  weekly_hours: profiles.weeklyHours,
  learning_start_date: profiles.learningStartDate,
  os_preference: profiles.osPreference,
} as const;

meRoute.get("/api/me", async (c) => {
  try {
    const identity = await resolveIdentity(c);
    const db = getDb(c.env);
    // テナント表示名は seed カタログではなく DB を真実とするため、 profile と一緒に返す。
    const rows = await db
      .select({
        ...PROFILE_COLS,
        tenant_name: tenants.name,
        tenant_subtitle: tenants.subtitle,
        tenant_icon: tenants.icon,
        tenant_active: tenants.active,
      })
      .from(profiles)
      .leftJoin(tenants, eq(profiles.tenantId, tenants.id))
      .where(profileMatch(identity))
      .limit(1);
    const row = rows[0];
    if (!row) {
      recordUninvited(c, identity);
      throw new ApiError("invite_required", 403);
    }
    if (row.disabled) {
      recordDisabled(c, { id: row.id, tenantId: row.tenant_id, role: row.role, email: row.email });
      throw new ApiError("このアカウントは無効化されています", 403);
    }
    assertTenantActive(c, {
      id: row.id,
      tenantId: row.tenant_id,
      role: row.role,
      email: row.email,
      tenantActive: row.tenant_active,
    });
    const actor = { id: row.id, tenantId: row.tenant_id, role: row.role, email: row.email };
    // 講師・管理者が受講者用の入口から開いたら staff_host_required (画面が講師・管理者用の入口へ案内する)。
    await assertStaffAccess(c, actor, identity);
    // 画面を開くと最初に呼ばれるので、ここでも新しいサインインを拾う。
    markRequestActor(c, actor);
    trackSession(c, actor, identity.sessionKey);
    const { tenant_name, tenant_subtitle, tenant_icon, tenant_active: _active, ...profile } = row;
    return c.json({
      profile,
      tenant:
        tenant_name != null
          ? {
              id: profile.tenant_id,
              name: tenant_name,
              subtitle: tenant_subtitle,
              icon: tenant_icon,
            }
          : null,
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

meRoute.post("/api/me", async (c) => {
  try {
    const identity = await resolveIdentity(c);
    const db = getDb(c.env);
    const existing = await db
      .select({
        id: profiles.id,
        tenantId: profiles.tenantId,
        role: profiles.role,
        email: profiles.email,
        disabled: profiles.disabled,
        tenantActive: tenants.active,
      })
      .from(profiles)
      .leftJoin(tenants, eq(profiles.tenantId, tenants.id))
      .where(profileMatch(identity))
      .limit(1);
    const me = existing[0];
    if (!me) {
      recordUninvited(c, identity);
      throw new ApiError("invite_required", 403);
    }
    if (me.disabled) {
      recordDisabled(c, me);
      throw new ApiError("このアカウントは無効化されています", 403);
    }
    assertTenantActive(c, me);
    await assertStaffAccess(c, me, identity);
    // 以降の 5xx をこの利用者の組織の出来事として記録する。
    markRequestActor(c, { id: me.id, tenantId: me.tenantId, role: me.role, email: me.email });
    const userId = me.id;
    const raw: unknown = await c.req.json().catch(() => null);
    if (typeof raw !== "object" || raw === null || Array.isArray(raw))
      throw new ApiError("更新する設定を入力してください", 400);
    const body = raw as Record<string, unknown>;
    const update: Partial<typeof profiles.$inferInsert> = {};
    if ("display_name" in body) {
      const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";
      if (!displayName) throw new ApiError("ユーザー名を入力してください", 400);
      if (displayName.length > MAX_DISPLAY_NAME_LENGTH)
        throw new ApiError(`ユーザー名は${MAX_DISPLAY_NAME_LENGTH}文字以内で入力してください`, 400);
      Object.assign(update, {
        displayName,
        initials: displayName.slice(0, 2).toUpperCase(),
        nameSource: "user",
      });
    }
    if ("os_preference" in body) {
      try {
        update.osPreference = parseOsPreference(body.os_preference);
      } catch (err) {
        throw new ApiError(err instanceof Error ? err.message : "OS の設定が不正です", 400);
      }
    }
    try {
      Object.assign(update, paceProfileUpdate(parsePaceSettings(body), userId));
    } catch (err) {
      throw new ApiError(err instanceof Error ? err.message : "学習設定が不正です", 400);
    }
    if (!Object.keys(update).length) throw new ApiError("更新する設定を入力してください", 400);

    await db.update(profiles).set(update).where(eq(profiles.id, userId));

    const rows = await db
      .select(PROFILE_COLS)
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);
    return c.json({ profile: rows[0] ?? null });
  } catch (err) {
    return errorResponse(c, err);
  }
});
