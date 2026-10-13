/**
 * GET /api/healthz — ランタイム疎通確認。
 */

import { Hono } from "hono";

import { accessConfig } from "../lib/access-auth.js";
import { clerkConfig } from "../lib/clerk-auth.js";
import { libraryRuntimeStatus } from "../lib/library-capabilities.js";
import { isDevMode } from "../lib/skill-map-data.js";
import type { Env } from "../env.js";

export const healthzRoute = new Hono<{ Bindings: Env }>();

healthzRoute.get("/api/healthz", async (c) => {
  const parsed = Number(c.env.ISOLATE_MEMORY_LIMIT);
  const memoryLimitMb = Number.isFinite(parsed) && parsed > 0 ? parsed : 32;
  const clerkConfigured = clerkConfig(c.env) !== null;
  c.header("Cache-Control", "no-store");
  return c.json({
    ok: true,
    runner: "anthropic-proxy",
    memoryLimitMb,
    // 認証まわりの構成チェック (秘密値は出さず、 設定済みか否かの真偽のみ)。
    // ログインできないときの切り分けに使う (docs/clerk-auth.md)。
    clerkConfigured,
    /** 講師・管理者の操作に Cloudflare Access (講師・管理者用の入口) を求めるか。 */
    accessConfigured: accessConfig(c.env) !== null,
    /** Clerk が無いローカル開発で、開発用トークンを受け付けるか (本番は常に false)。 */
    devAuthConfigured: !clerkConfigured && Boolean(c.env.DEV_AUTH_JWT_SECRET),
    /** 開発者モード FAB を出していいか。本番には `DEV_MODE` を設定しない。 */
    devModeAvailable: isDevMode(c.env),
    /** AI 一次レビューに必要な鍵と、Gateway 使用時のアカウント設定があるか。 */
    aiReviewConfigured:
      Boolean(c.env.ANTHROPIC_API_KEY?.trim()) &&
      (!c.env.AI_GATEWAY_ID || Boolean(c.env.CLOUDFLARE_ACCOUNT_ID?.trim())),
    ...(await libraryRuntimeStatus(c.env)),
  });
});
