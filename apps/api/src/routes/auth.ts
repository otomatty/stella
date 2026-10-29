/**
 * 認証 API (Issue #117)。
 *
 *   /api/auth/*                           … Better Auth (Google ログイン・セッション・ログアウト)
 *   POST /api/auth/vscode-link            … ログイン済みユーザー向けワンタイム接続コード
 *   POST /api/auth/vscode-link/exchange   … 接続コードを VS Code 用のセッションに交換 (認証不要)
 *   GET  /api/auth/google*                … 410 (旧 Google OAuth + JWT。Better Auth に置き換えた)
 */

import { Hono } from "hono";
import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "../db/client.js";
import type { Db } from "../db/client.js";
import { authUsers, authVscodeLinks, profiles, tenants } from "../db/schema.js";
import { clientIp } from "../lib/audit.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { errorResponse, ApiError, getCaller } from "../lib/authz.js";
import { getAuth, recordLogin } from "../lib/better-auth.js";
import { enforceAuthLinkRateLimit } from "../lib/rate-limit.js";
import {
  createVscodeLinkCode,
  hashVscodeLinkCode,
  redeemVscodeLink,
  VSCODE_LINK_TTL_MS,
} from "../lib/vscode-link.js";
import type { Env } from "../env.js";

export const authRoute = new Hono<{ Bindings: Env }>();

/**
 * The email to give a VS Code token for: only an enabled profile in an active organization.
 * A Better Auth session (`needsLogin`) belongs to an auth_users row, which every web login has;
 * without one the code is just invalid.
 */
async function resolveVscodeLinkEmail(
  db: Db,
  userId: string,
  needsLogin: boolean,
): Promise<string | null> {
  const row = (
    await db
      .select({
        email: profiles.email,
        disabled: profiles.disabled,
        tenantActive: tenants.active,
        loginEmail: authUsers.email,
      })
      .from(profiles)
      .leftJoin(tenants, eq(profiles.tenantId, tenants.id))
      .leftJoin(authUsers, eq(authUsers.id, profiles.id))
      .where(eq(profiles.id, userId))
      .limit(1)
  )[0];
  if (!row || row.disabled || row.tenantActive === false) return null;
  if (needsLogin && !row.loginEmail) return null;
  // Older profiles have no email; the login's email is in auth_users.
  return row.email ?? row.loginEmail ?? null;
}

// The old login. A page still open from before the switch gets a clear answer instead of a
// Better Auth 404.
authRoute.get("/api/auth/google/*", (c) =>
  c.json({ error: "ログインの方式が変わりました。画面を読み込み直してください" }, 410),
);
authRoute.get("/api/auth/google", (c) =>
  c.json({ error: "ログインの方式が変わりました。画面を読み込み直してください" }, 410),
);

authRoute.post("/api/auth/vscode-link", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const code = createVscodeLinkCode();
    const expiresAt = new Date(Date.now() + VSCODE_LINK_TTL_MS);
    await db.insert(authVscodeLinks).values({
      userId: caller.id,
      codeHash: await hashVscodeLinkCode(code),
      expiresAt,
    });
    return c.json({ code, expires_at: expiresAt.toISOString() });
  } catch (err) {
    return errorResponse(c, err);
  }
});

authRoute.post("/api/auth/vscode-link/exchange", async (c) => {
  try {
    // コードを引く前に止める (超過したリクエストで有効なコードを消費・確認させない)。
    const limited = await enforceAuthLinkRateLimit(c);
    if (limited) return limited;

    const auth = getAuth(c.env);
    const devSecret = c.env.AUTH_JWT_SECRET;
    if (!auth && !devSecret) throw new ApiError("認証が未設定です", 503);

    const body = (await c.req.json().catch(() => null)) as { code?: unknown } | null;
    const code = typeof body?.code === "string" ? body.code : "";
    const db = getDb(c.env);
    const now = new Date();
    const row = (
      await db
        .select()
        .from(authVscodeLinks)
        .where(eq(authVscodeLinks.codeHash, await hashVscodeLinkCode(code)))
        .limit(1)
    )[0];

    const exchanged = await redeemVscodeLink({
      row,
      now,
      resolveEmail: (userId) => resolveVscodeLinkEmail(db, userId, Boolean(auth)),
      consume: async (id) => {
        const consumed = (
          await db
            .update(authVscodeLinks)
            .set({ usedAt: now })
            .where(and(eq(authVscodeLinks.id, id), isNull(authVscodeLinks.usedAt)))
            .returning({ id: authVscodeLinks.id })
        )[0];
        return Boolean(consumed);
      },
      // A Better Auth session, so the web's sign-out list and disabling the user revoke it.
      // Without Better Auth (local dev, tests) a dev token, which only localhost accepts.
      signToken: async (userId, email) =>
        auth
          ? (await (await auth.$context).internalAdapter.createSession(userId)).token
          : signAccessToken(devSecret as string, userId, email),
    });
    await recordLogin(db, exchanged.userId, clientIp(c), "vscode");
    return c.json({ access_token: exchanged.access_token });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// Everything else under /api/auth is Better Auth (registered last, so the routes above win).
authRoute.on(["GET", "POST"], "/api/auth/*", async (c): Promise<Response> => {
  const auth = getAuth(c.env);
  if (!auth)
    return new Response(JSON.stringify({ error: "ログインが未設定です" }), { status: 503 });
  return auth.handler(c.req.raw);
});
