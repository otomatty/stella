/**
 * 認証 API — Google OAuth + JWT (Cloudflare Workers 自前)。
 *
 *   GET /api/auth/google           … Google 認可画面へリダイレクト
 *   GET /api/auth/google/callback  … コールバック → JWT をフロントへ返す
 */

import { Hono } from "hono";

import { getDb } from "../db/client.js";
import { findOrCreateUserByEmail } from "../lib/auth-users.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { errorResponse, ApiError } from "../lib/authz.js";
import {
  buildGoogleAuthUrl,
  createOAuthState,
  exchangeGoogleCode,
  googleRedirectUri,
  parseOAuthState,
  redirectWithAuthResult,
  resolveOAuthReturnTo,
  verifyGoogleIdToken,
} from "../lib/google-oauth.js";
import type { Env } from "../env.js";

export const authRoute = new Hono<{ Bindings: Env }>();

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
