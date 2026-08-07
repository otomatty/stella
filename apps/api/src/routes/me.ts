/**
 * 認証済みユーザー自身のプロフィール API (旧 auth.ts の profiles 直アクセスの置き換え)。
 *
 *   GET  /api/me  … caller のプロフィールを返す (未招待は invite_required)
 *   POST /api/me  … 自己更新のみ / 未招待は invite_required
 *
 * getCaller は「プロフィール必須」だが、 ここは JWT 検証のみで profile 有無を判定するため
 * verifyToken (JWT 検証のみ) を直接使う。
 */

import { Hono } from "hono";
import { eq } from "drizzle-orm";

import { getDb } from "../db/client.js";
import { profiles, tenants } from "../db/schema.js";
import { ApiError, errorResponse, verifyToken } from "../lib/authz.js";
import type { Env } from "../env.js";

export const meRoute = new Hono<{ Bindings: Env }>();

const PROFILE_COLS = {
  id: profiles.id,
  tenant_id: profiles.tenantId,
  role: profiles.role,
  display_name: profiles.displayName,
  initials: profiles.initials,
  email: profiles.email,
  disabled: profiles.disabled,
  created_at: profiles.createdAt,
} as const;

meRoute.get("/api/me", async (c) => {
  try {
    const payload = await verifyToken(c);
    const db = getDb(c.env);
    // テナント表示名は seed カタログではなく DB を真実とするため、 profile と一緒に返す。
    const rows = await db
      .select({
        ...PROFILE_COLS,
        tenant_name: tenants.name,
        tenant_subtitle: tenants.subtitle,
        tenant_icon: tenants.icon,
      })
      .from(profiles)
      .leftJoin(tenants, eq(profiles.tenantId, tenants.id))
      .where(eq(profiles.id, payload.sub as string))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new ApiError("invite_required", 403);
    }
    const { tenant_name, tenant_subtitle, tenant_icon, ...profile } = row;
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
    const payload = await verifyToken(c);
    const userId = payload.sub as string;
    const email = typeof payload.email === "string" ? payload.email : undefined;
    const db = getDb(c.env);
    const body = (await c.req.json()) as {
      display_name?: string;
      email?: string;
      initials?: string;
    };

    const existing = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);
    if (!existing[0]) {
      throw new ApiError("invite_required", 403);
    }

    const displayName = body.display_name?.trim() || email || "User";
    const initials = body.initials ?? displayName.slice(0, 2).toUpperCase();
    const rawEmail = body.email ?? email ?? null;
    const normalizedEmail =
      typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() || null : null;

    await db
      .update(profiles)
      .set({
        displayName,
        initials,
        email: normalizedEmail,
      })
      .where(eq(profiles.id, userId));

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
