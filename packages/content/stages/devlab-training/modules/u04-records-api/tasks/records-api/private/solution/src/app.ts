import { Hono } from "hono";
import { records } from "./records";
import { sumWeek } from "./sum-week";
import type { WorkRecord } from "./types";

export function createApp(initialRecords: readonly WorkRecord[] = records) {
  const app = new Hono();
  const workRecords = initialRecords.map((record) => ({ ...record }));

  app.get("/weeks/:week/records", (c) => {
    const week = c.req.param("week");
    if (!/^[0-9]{4}-W[0-9]{2}$/.test(week)) {
      return c.json({ error: "対象週は YYYY-Www の形で指定してください" }, 400);
    }

    const weekRecords = workRecords.filter((record) => record.week === week);
    return c.json(
      { week, records: weekRecords, total: sumWeek(workRecords, week) },
      200,
    );
  });

  app.post("/records/:id/confirm", (c) => {
    const id = c.req.param("id");
    const record = workRecords.find((item) => item.id === id);
    if (!record) {
      return c.json({ error: "作業記録が見つかりません" }, 404);
    }

    record.status = "confirmed";
    return c.json(record, 200);
  });

  return app;
}

export const app = createApp();
