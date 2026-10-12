import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { adminRoute } from "./admin.js";
import { meRoute } from "./me.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import type { Env } from "../env.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";

/**
 * 未招待のログインは auth_users だけが残る。
 * ユーザー一覧は、プロフィールの無い行をアクセス申請として管理者に返す。
 */

const SECRET = "admin-users-test-secret";
let db: ReturnType<typeof sqliteD1>;

beforeEach(() => {
  db = sqliteD1();
  db.sqlite.exec(`
    INSERT INTO tenants (id, name, active_count, active, test_mode, created_at, updated_at)
      VALUES ('ses', 'SES', 0, 1, 0, 1, 1);
    INSERT INTO auth_users (id, email, created_at) VALUES
      ('admin', 'admin@example.test', 1),
      ('member', 'member@example.test', 2),
      ('waiting', 'waiting@example.test', 3);
    INSERT INTO profiles (id, tenant_id, role, display_name, email, disabled, name_source, created_at) VALUES
      ('admin', 'ses', 'admin', '管理者', 'admin@example.test', 0, 'invite', 1),
      ('member', 'ses', 'student', '受講者', 'member@example.test', 0, 'invite', 2);
  `);
});
afterEach(() => db.sqlite.close());

function setup() {
  const env = { DB: db.binding, DEV_AUTH_JWT_SECRET: SECRET } as Env;
  const { app } = mountTestApp(env, adminRoute, meRoute);
  const authed = (userId: string, email: string, path: string) =>
    signAccessToken(SECRET, userId, email).then((token) => request(app, env, path, { token }));
  return { authed };
}

describe("GET /api/admin/users のアクセス申請", () => {
  it("プロフィールの無いログインだけを申請として返す", async () => {
    const { authed } = setup();
    const res = await authed("admin", "admin@example.test", "/api/admin/users");
    expect(res.status).toBe(200);
    const body = await json<{
      rows: { email: string }[];
      requests: { id: string; email: string }[];
    }>(res);
    expect(body.rows.map((row) => row.email).sort()).toEqual([
      "admin@example.test",
      "member@example.test",
    ]);
    expect(body.requests).toEqual([
      expect.objectContaining({ id: "waiting", email: "waiting@example.test" }),
    ]);
  });

  it("未招待の /api/me が申請を残す", async () => {
    const { authed } = setup();
    const me = await authed("nobody", "stranger@example.test", "/api/me");
    expect(me.status).toBe(403);
    expect((await json<{ error: string }>(me)).error).toBe("invite_required");

    const res = await authed("admin", "admin@example.test", "/api/admin/users");
    const body = await json<{ requests: { email: string }[] }>(res);
    expect(body.requests.map((row) => row.email).sort()).toEqual([
      "stranger@example.test",
      "waiting@example.test",
    ]);
  });

  it("管理者以外には申請を返さない", async () => {
    const { authed } = setup();
    const res = await authed("member", "member@example.test", "/api/admin/users");
    expect(res.status).toBe(403);
  });
});
