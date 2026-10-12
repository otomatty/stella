/**
 * GET /api/healthz — ランタイム疎通確認。
 */

import { Hono } from "hono";

import { accessConfig } from "../lib/access-auth.js";
import { isDevMode } from "../lib/skill-map-data.js";
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
    // ログインできないときの切り分けに使う (docs/cloudflare-access.md)。
    accessConfigured: accessConfig(c.env) !== null,
    /** Access が無いローカル開発で、開発用トークンを受け付けるか (本番は常に false)。 */
    devAuthConfigured: accessConfig(c.env) === null && Boolean(c.env.DEV_AUTH_JWT_SECRET),
    /** 開発者モード FAB を出していいか。本番には `DEV_MODE` を設定しない。 */
    devModeAvailable: isDevMode(c.env),
  });
});
