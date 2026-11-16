import { Hono } from "hono";
import type { Env } from "../env.js";
import { errorResponse, getCaller, requireAdmin } from "../lib/authz.js";
import { clientIp } from "../lib/audit.js";
import {
  parseManualCompletion,
  readManualCompletion,
  writeManualCompletion,
} from "../lib/task-manual-completion.js";

export const taskManualCompletionRoute = new Hono<{ Bindings: Env }>();
taskManualCompletionRoute.get("/api/task-manual-completion", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireAdmin(caller);
    return c.json(
      await readManualCompletion(db, c.req.query("userId") ?? "", c.req.query("stageId") ?? ""),
    );
  } catch (e) {
    return errorResponse(c, e);
  }
});
taskManualCompletionRoute.post("/api/task-manual-completion", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireAdmin(caller);
    const input = parseManualCompletion(await c.req.json().catch(() => null));
    const { inserted, skipped, passedTaskIds } = await writeManualCompletion(
      db,
      caller,
      input,
      false,
      clientIp(c),
    );
    return c.json({ inserted, skipped, passedTaskIds });
  } catch (e) {
    return errorResponse(c, e);
  }
});
taskManualCompletionRoute.post("/api/task-manual-completion/revoke", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireAdmin(caller);
    const input = parseManualCompletion(await c.req.json().catch(() => null), true);
    const { deleted, blocked } = await writeManualCompletion(db, caller, input, true, clientIp(c));
    return c.json({ deleted, blocked }, blocked.length ? 409 : 200);
  } catch (e) {
    return errorResponse(c, e);
  }
});
