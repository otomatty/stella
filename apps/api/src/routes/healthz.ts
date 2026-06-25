/**
 * GET /api/healthz — ランタイム疎通確認。
 */

import { Hono } from "hono";

import type { Env } from "../env.js";

export const healthzRoute = new Hono<{ Bindings: Env }>();

healthzRoute.get("/api/healthz", (c) => {
  const parsed = Number(c.env.ISOLATE_MEMORY_LIMIT);
  const memoryLimitMb = Number.isFinite(parsed) && parsed > 0 ? parsed : 32;
  return c.json({
    ok: true,
    runner: "anthropic-proxy",
    memoryLimitMb,
    // 認証まわりの構成チェック (秘密値は出さず、 設定済みか否かの真偽のみ)。
    // Google ログイン不具合の切り分けに使う (docs/google-login-troubleshooting.md)。
    googleOAuthConfigured: Boolean(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET),
    jwtConfigured: Boolean(c.env.AUTH_JWT_SECRET),
  });
});
