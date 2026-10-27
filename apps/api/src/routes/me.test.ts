import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { meRoute } from "./me.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import type { Env } from "../env.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";

const SECRET = "me-test-secret";
let db: ReturnType<typeof sqliteD1>;
let env: Env;
let app: ReturnType<typeof mountTestApp>["app"];

beforeEach(() => {
  db = sqliteD1();
  db.sqlite.exec(`
    INSERT INTO tenants (id, name, active_count, active, test_mode, created_at, updated_at) VALUES ('ses', 'SES', 0, 1, 0, 1, 1);
    INSERT INTO profiles (id, tenant_id, role, display_name, disabled, name_source, created_at) VALUES
      ('learner', 'ses', 'student', '受講者', 0, 'google', 1);
  `);
  env = { DB: db.binding, AUTH_JWT_SECRET: SECRET } as Env;
  app = mountTestApp(env, meRoute).app;
});
afterEach(() => db.sqlite.close());

const token = () => signAccessToken(SECRET, "learner", "learner@example.test");
const get = async () =>
  json<{ profile: Record<string, unknown> }>(
    await request(app, env, "/api/me", { token: await token() }),
  );
const write = async (body: unknown) =>
  request(app, env, "/api/me", {
    token: await token(),
    method: "POST",
    body: JSON.stringify(body),
  });

describe("教材の OS 設定 (os_preference)", () => {
  it("既定は null (端末から推定する)", async () => {
    expect((await get()).profile.os_preference).toBeNull();
  });

  it("windows・macos を保存し、null で推定に戻す。ほかの設定は変えない", async () => {
    const saved = await write({ os_preference: "macos" });
    expect(saved.status).toBe(200);
    expect((await json<{ profile: Record<string, unknown> }>(saved)).profile).toMatchObject({
      os_preference: "macos",
      display_name: "受講者",
      weekly_hours: 35,
    });
    expect((await get()).profile.os_preference).toBe("macos");
    expect((await write({ os_preference: "windows" })).status).toBe(200);
    expect((await get()).profile.os_preference).toBe("windows");
    expect((await write({ os_preference: null })).status).toBe(200);
    expect((await get()).profile.os_preference).toBeNull();
  });

  it("名前だけ・週の時間だけの更新では OS 設定を消さない", async () => {
    await write({ os_preference: "macos" });
    expect((await write({ display_name: "新しい名前" })).status).toBe(200);
    expect((await write({ weekly_hours: 40 })).status).toBe(200);
    expect((await get()).profile).toMatchObject({ os_preference: "macos", weekly_hours: 40 });
  });

  it.each(["linux", "Windows", "", 1, { os: "windows" }])(
    "不正な値 (%j) は 400 で、何も保存しない",
    async (value) => {
      const res = await write({ os_preference: value, display_name: "上書きされない" });
      expect(res.status).toBe(400);
      expect((await get()).profile).toMatchObject({
        os_preference: null,
        display_name: "受講者",
      });
    },
  );

  it("DB の CHECK も windows・macos 以外を拒む", () => {
    expect(() =>
      db.sqlite.exec("UPDATE profiles SET os_preference = 'linux' WHERE id = 'learner'"),
    ).toThrow();
  });
});
