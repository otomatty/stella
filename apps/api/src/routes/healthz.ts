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
  });
});
