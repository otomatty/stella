/**
 * FALCON INFORMAL API — Cloudflare Workers + Hono エントリ。
 */

import { Hono } from "hono";
import { cors } from "hono/cors";

import type { Env } from "./env.js";
import { resolveCorsOrigin } from "./lib/cors.js";
import { chatRoute } from "./routes/chat.js";
import { healthzRoute } from "./routes/healthz.js";

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", async (c, next) => {
  const corsMiddleware = cors({
    origin: (origin) => resolveCorsOrigin(origin, c.env.ALLOWED_ORIGINS) ?? "",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  });
  return corsMiddleware(c, next);
});

app.route("/", healthzRoute);
app.route("/", chatRoute);

export default app;
