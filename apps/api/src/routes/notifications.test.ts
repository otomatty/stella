import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "../db/client.js";
import {
  announcements,
  enrollments,
  notifications,
  profiles,
  stages,
  tenants,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { notificationsRoute } from "./notifications.js";

const SECRET = "announcements-test-secret";
let database: ReturnType<typeof sqliteD1>;
let env: Env;
let db: ReturnType<typeof getDb>;
let app: ReturnType<typeof mountTestApp>["app"];
let token: string;

beforeEach(async () => {
  database = sqliteD1();
  env = { DB: database.binding, AUTH_JWT_SECRET: SECRET } as Env;
  db = getDb(env);
  app = mountTestApp(env, notificationsRoute).app;
  token = await signAccessToken(SECRET, "learner", "learner@example.test");
  await db.insert(tenants).values([
    { id: "ses", name: "SES" },
    { id: "other", name: "Other" },
  ]);
  await db.insert(profiles).values({ id: "learner", role: "student", displayName: "受講者" });
  await db.insert(stages).values([
    { id: "enrolled", slug: "enrolled", title: "受講中" },
    { id: "closed", slug: "closed", title: "未受講" },
  ]);
});
afterEach(() => database.sqlite.close());

const get = (path: string) => request(app, env, path, { token });
type Page = { rows: { id: string; title: string }[]; nextOffset: number | null };

describe("お知らせの履歴", () => {
  it("通知がなくても、受講開始前のお知らせを現在の受講登録で読める", async () => {
    await db.insert(announcements).values([
      {
        id: "general",
        title: "入会前の連絡",
        publishedAt: new Date("2026-01-01T00:00:00Z"),
      },
      {
        id: "stage",
        stageId: "enrolled",
        title: "受講開始前の連絡",
        publishedAt: new Date("2026-01-02T00:00:00Z"),
      },
      { id: "hidden", stageId: "closed", title: "未受講" },
    ]);
    await db
      .insert(enrollments)
      .values({ userId: "learner", stageId: "enrolled", status: "active" });
    expect(await json(await get("/api/notifications"))).toEqual({ rows: [] });
    const result = await get("/api/announcements");
    expect(result.status).toBe(200);
    const page = await json<Page>(result);
    expect(page.rows.map((row) => row.id)).toEqual(["stage", "general"]);
    expect(page.nextOffset).toBeNull();
  });

  it("添削通知が30件あっても、過去のお知らせを一覧で読める", async () => {
    await db.insert(announcements).values({ id: "old", title: "以前の連絡" });
    for (let i = 0; i < 30; i++) {
      await db.insert(notifications).values({
        userId: "learner",
        type: "review_completed",
        title: `添削 ${i}`,
      });
    }
    const notices = await json<{ rows: unknown[] }>(await get("/api/notifications"));
    expect(notices.rows).toHaveLength(30);
    const page = await json<Page>(await get("/api/announcements"));
    expect(page.rows.map((row) => row.id)).toEqual(["old"]);
  });

  it("同時刻のお知らせも重複や欠落なく最後までたどれる", async () => {
    for (let i = 0; i < 45; i++) {
      await db.insert(announcements).values({
        id: `notice-${String(i).padStart(2, "0")}`,
        title: `連絡 ${i}`,
        publishedAt: new Date("2026-01-01T00:00:00Z"),
      });
    }
    const first = await json<Page>(await get("/api/announcements?limit=20&offset=0"));
    expect(first.rows).toHaveLength(20);
    expect(first.nextOffset).toBe(20);
    const second = await json<Page>(
      await get(`/api/announcements?limit=20&offset=${first.nextOffset}`),
    );
    expect(second.rows).toHaveLength(20);
    expect(second.nextOffset).toBe(40);
    const last = await json<Page>(
      await get(`/api/announcements?limit=20&offset=${second.nextOffset}`),
    );
    expect(last.rows).toHaveLength(5);
    expect(last.nextOffset).toBeNull();
    const ids = [...first.rows, ...second.rows, ...last.rows].map((row) => row.id);
    expect(new Set(ids).size).toBe(45);
    expect(ids[0]).toBe("notice-44");
    expect(ids.at(-1)).toBe("notice-00");
  });

  it.each([
    "offset=-1",
    "offset=1.5",
    "offset=abc",
    "offset=9007199254740992",
    "limit=-1",
    "limit=1.5",
  ])("不正なページ指定を拒否する: %s", async (query) => {
    expect((await get(`/api/announcements?${query}`)).status).toBe(400);
  });
});
