/**
 * 認証 API — Google OAuth + JWT (Cloudflare Workers 自前)。
 *
 *   GET  /api/auth/google                 … Google 認可画面へリダイレクト
 *   GET  /api/auth/google/callback        … コールバック → JWT をフロントへ返す
 *   POST /api/auth/vscode-link            … ログイン済みユーザー向けワンタイム接続コード
 *   POST /api/auth/vscode-link/exchange   … 接続コードを JWT に交換 (Authorization 不要)
 */

import { Hono } from "hono";
import { and, eq, isNull, ne } from "drizzle-orm";

import { getDb } from "../db/client.js";
import type { Db } from "../db/client.js";
import { authUsers, authVscodeLinks, profiles } from "../db/schema.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import { findOrCreateUserByEmail } from "../lib/auth-users.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { errorResponse, ApiError, getCaller } from "../lib/authz.js";
import {
  createVscodeLinkCode,
  hashVscodeLinkCode,
  redeemVscodeLink,
  VSCODE_LINK_TTL_MS,
} from "../lib/vscode-link.js";
import {
  buildGoogleAuthUrl,
  createOAuthState,
  exchangeGoogleCode,
  googleRedirectUri,
  parseOAuthState,
  redirectWithAuthResult,
  resolveOAuthReturnTo,
  verifyGoogleIdToken,
  type GoogleUserClaims,
} from "../lib/google-oauth.js";
import type { Env } from "../env.js";

export const authRoute = new Hono<{ Bindings: Env }>();

/**
 * ログイン成功を監査ログに記録する (Issue #64)。
 *
 * プロフィール未作成 (招待前のログイン) は記録しない — 所属テナントが未確定で
 * `audit_logs.tenant_id` を決められず、 そもそもアプリへは入れないため。
 */
async function recordLogin(
  c: Parameters<typeof clientIp>[0],
  db: Db,
  userId: string,
): Promise<void> {
  const profile = (
    await db
      .select({
        id: profiles.id,
        tenantId: profiles.tenantId,
        role: profiles.role,
        displayName: profiles.displayName,
      })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1)
  )[0];
  if (!profile) return;
  await recordAudit(
    db,
    {
      id: profile.id,
      tenantId: profile.tenantId,
      role: profile.role,
      name: profile.displayName,
    },
    {
      action: "login",
      targetType: "user",
      targetId: profile.id,
      ip: clientIp(c),
      metadata: { provider: "google" },
    },
  );
}

/**
 * Google の登録名とプロフィール画像をプロフィールへ反映する (ユーザー情報の自動取得)。
 *
 * 招待時の display_name はメールのローカル部なので、 本人が初めてログインした時点で
 * Google 側の氏名に置き換える。 設定画面で本人が変更した (name_source='user') 以降は
 * 上書きしない。 アバターは編集手段が無いので毎回最新化する (URL は失効し得るため)。
 * 同期に失敗してもログイン自体は成立させる。
 */
async function syncGoogleProfile(
  db: Db,
  userId: string,
  claims: GoogleUserClaims,
): Promise<void> {
  const displayName = claims.name?.trim();
  const avatarUrl = claims.picture?.trim();
  try {
    if (avatarUrl) {
      await db.update(profiles).set({ avatarUrl }).where(eq(profiles.id, userId));
    }
    if (displayName) {
      await db
        .update(profiles)
        .set({
          displayName,
          initials: displayName.slice(0, 2).toUpperCase(),
          nameSource: "google",
        })
        .where(and(eq(profiles.id, userId), ne(profiles.nameSource, "user")));
    }
  } catch (err) {
    console.error("[auth] google profile sync failed", err);
  }
}

async function resolveVscodeLinkEmail(db: Db, userId: string): Promise<string | null> {
  const profile = (
    await db
      .select({ email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1)
  )[0];
  if (profile?.email) return profile.email;
  const user = (
    await db
      .select({ email: authUsers.email })
      .from(authUsers)
      .where(eq(authUsers.id, userId))
      .limit(1)
  )[0];
  return user?.email ?? null;
}

function assertGoogleOAuthConfigured(env: Env): void {
  if (!env.AUTH_JWT_SECRET) {
    throw new ApiError("認証が未設定です (AUTH_JWT_SECRET)", 503);
  }
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new ApiError("Google OAuth が未設定です (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)", 503);
  }
}

authRoute.get("/api/auth/google", async (c) => {
  try {
    assertGoogleOAuthConfigured(c.env);
    const returnTo = resolveOAuthReturnTo(c.env, c.req.query("return_to"));
    const state = await createOAuthState(c.env.AUTH_JWT_SECRET!, returnTo);
    const redirectUri = googleRedirectUri(c.req.url);
    const url = buildGoogleAuthUrl(c.env.GOOGLE_CLIENT_ID!, redirectUri, state);
    return c.redirect(url, 302);
  } catch (err) {
    return errorResponse(c, err);
  }
});

authRoute.get("/api/auth/google/callback", async (c) => {
  const returnToFallback = resolveOAuthReturnTo(c.env, undefined);

  try {
    assertGoogleOAuthConfigured(c.env);

    const oauthError = c.req.query("error");
    if (oauthError) {
      return redirectWithAuthResult(returnToFallback, {
        error: oauthError,
        error_description: c.req.query("error_description") ?? "Google ログインがキャンセルされました",
      });
    }

    const code = c.req.query("code");
    const state = c.req.query("state");
    if (!code || !state) {
      return redirectWithAuthResult(returnToFallback, {
        error: "invalid_request",
        error_description: "認可コードまたは state が不足しています",
      });
    }

    const parsedState = await parseOAuthState(c.env.AUTH_JWT_SECRET!, state);
    if (!parsedState) {
      return redirectWithAuthResult(returnToFallback, {
        error: "invalid_state",
        error_description: "ログインセッションの有効期限が切れました。もう一度お試しください",
      });
    }

    const redirectUri = googleRedirectUri(c.req.url);
    const idToken = await exchangeGoogleCode(
      c.env.GOOGLE_CLIENT_ID!,
      c.env.GOOGLE_CLIENT_SECRET!,
      code,
      redirectUri,
    );
    const claims = await verifyGoogleIdToken(idToken, c.env.GOOGLE_CLIENT_ID!);

    const db = getDb(c.env);
    const user = await findOrCreateUserByEmail(db, claims.email);
    const accessToken = await signAccessToken(c.env.AUTH_JWT_SECRET!, user.id, user.email);
    await syncGoogleProfile(db, user.id, claims);
    await recordLogin(c, db, user.id);

    return redirectWithAuthResult(parsedState.returnTo, { access_token: accessToken });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google ログインに失敗しました";
    console.error("[auth] google callback failed", err);
    return redirectWithAuthResult(returnToFallback, {
      error: "auth_failed",
      error_description: message,
    });
  }
});

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
    if (!c.env.AUTH_JWT_SECRET) {
      throw new ApiError("認証が未設定です (AUTH_JWT_SECRET)", 503);
    }

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
      resolveEmail: (userId) => resolveVscodeLinkEmail(db, userId),
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
      signToken: (userId, email) => signAccessToken(c.env.AUTH_JWT_SECRET!, userId, email),
    });
    await recordLogin(c, db, exchanged.userId);
    return c.json({ access_token: exchanged.access_token });
  } catch (err) {
    return errorResponse(c, err);
  }
});

