// Test-only API host: production API never exposes job dispatch from HTTP.
import { Hono } from "hono";
import { libraryRoute } from "../../../api/src/routes/library.js";
import type { Env } from "../../../api/src/env.js";
import { mediaSpike } from "./media.js";
import { cleanupDeletedBooks } from "../../src/cleanup.js";
const app = new Hono<{ Bindings: Env }>();
app.route("/", libraryRoute);
app.route("/p0/media", mediaSpike);
app.post("/p0/cleanup", async (c) => {
  if (!c.env.LIBRARY_BUCKET) return c.json({ error: "No bucket" }, 503);
  await cleanupDeletedBooks({ DB: c.env.DB, BUCKET: c.env.LIBRARY_BUCKET });
  return c.json({ ok: true });
});
app.post("/p0/dispatch", async (c) => {
  try {
    return c.json(await c.env.NARRATOR?.startJob(await c.req.json()));
  } catch {
    return c.json({ error: "Dispatch refused" }, 400);
  }
});
export default { fetch: app.fetch };
