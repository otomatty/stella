import { Hono } from "hono";
import { records } from "./records";
import type { WorkRecord } from "./types";

export function createApp(initialRecords: readonly WorkRecord[] = records) {
  const app = new Hono();
  const workRecords = initialRecords.map((record) => ({ ...record }));

  app.get("/weeks/:week/records", (c) => {
    const week = c.req.param("week");
    // TODO: 対象週を検証し、一覧を絞り込んで合計を出す。
    return c.json({ week, records: workRecords, total: 0 }, 200);
  });

  app.post("/records/:id/confirm", (c) => {
    // TODO: ID で探し、該当する記録を確定する。
    return c.json({ error: "未実装" }, 501);
  });

  return app;
}

export const app = createApp();
