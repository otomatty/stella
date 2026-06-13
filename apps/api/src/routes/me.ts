/**
 * 認証済みユーザー自身のプロフィール API (旧 auth.ts の profiles 直アクセスの置き換え)。
 *
 *   GET  /api/me  … caller のプロフィールを返す (無ければ null)
 *   POST /api/me  … プロフィールを ensure (無ければ作成 / 有れば表示名等のみ更新)
 *
 * getCaller は「プロフィール必須」だが、 ここは初回サインインで未作成の状態も扱うため
 * verifyToken (JWT 検証のみ) を直接使う。
 */

import { Hono } from "hono";
import { eq } from "drizzle-orm";

import { getDb } from "../db/client.js";
import { profiles } from "../db/schema.js";
import { errorResponse, verifyToken } from "../lib/authz.js";
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
    const rows = await db
      .select(PROFILE_COLS)
      .from(profiles)
      .where(eq(profiles.id, payload.sub as string))
      .limit(1);
    return c.json({ profile: rows[0] ?? null });
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
      tenant_id: string;
      display_name: string;
      email?: string;
      initials?: string;
    };

    const displayName = body.display_name?.trim() || email || "User";
    const initials = body.initials ?? displayName.slice(0, 2).toUpperCase();

    // 既存があれば role / tenant_id は据え置き (旧 RLS profiles_update_self の意味論)。
    await db
      .insert(profiles)
      .values({
        id: userId,
        tenantId: body.tenant_id,
        role: "student",
        displayName,
        initials,
        email: body.email ?? email ?? null,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          displayName,
          initials,
          email: body.email ?? email ?? null,
        },
      });

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
