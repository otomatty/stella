import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { signAccessToken } from "../lib/auth-jwt.js";
import type { Env } from "../env.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { adminRoute } from "./admin.js";

const SECRET = "admin-test-secret";
let db: ReturnType<typeof sqliteD1>;
let env: Env;
let app: ReturnType<typeof mountTestApp>["app"];

beforeEach(() => {
  db = sqliteD1();
  db.sqlite.exec(`
    INSERT INTO tenants (id, name, active_count, active, created_at, updated_at) VALUES
      ('ses', 'SES', 0, 1, 1, 1);
    INSERT INTO profiles (id, tenant_id, role, display_name, email, disabled, name_source, created_at) VALUES
      ('admin', 'ses', 'admin', '管理者', 'admin@example.test', 0, 'invite', 1),
      ('taken', 'ses', 'student', '別', 'taken@example.test', 0, 'invite', 2);
  `);
  env = { DB: db.binding, AUTH_JWT_SECRET: SECRET } as Env;
  app = mountTestApp(env, adminRoute).app;
});
afterEach(() => db.sqlite.close());

const token = () => signAccessToken(SECRET, "admin", "admin@example.test");

describe("ユーザー管理", () => {
  it("招待するとロールが保存され、受講登録は作られない", async () => {
    const res = await request(app, env, "/api/admin/users/invite", {
      method: "POST",
      token: await token(),
      body: JSON.stringify({
        invites: [{ email: "new@example.test", displayName: "新規", role: "student" }],
      }),
    });
    expect(res.status).toBe(200);
    const body = await json<{ results: { email: string; ok: boolean; userId?: string }[] }>(res);
    expect(body.results).toEqual([
      { email: "new@example.test", ok: true, userId: body.results[0]?.userId },
    ]);
    const row = db.sqlite
      .prepare("select role from profiles where email = ?")
      .get("new@example.test") as { role: string };
    expect(row).toEqual({ role: "student" });
    expect(
      db.sqlite.prepare("select count(*) as n from enrollments").get() as { n: number },
    ).toEqual({ n: 0 });
  });

  it("登録済みのメールは同じ文言で拒む", async () => {
    const res = await request(app, env, "/api/admin/users/invite", {
      method: "POST",
      token: await token(),
      body: JSON.stringify({
        invites: [{ email: "taken@example.test", displayName: "別", role: "student" }],
      }),
    });
    const body = await json<{ results: { email: string; ok: boolean; error?: string }[] }>(res);
    expect(body.results).toEqual([
      {
        email: "taken@example.test",
        ok: false,
        error: "このメールアドレスは既に登録されています",
      },
    ]);
    expect(JSON.stringify(body)).not.toContain("別のテナント");
  });

  it("存在しないユーザーは 404", async () => {
    const res = await request(app, env, "/api/admin/users/disable", {
      method: "POST",
      token: await token(),
      body: JSON.stringify({ userId: "missing", disabled: true }),
    });
    expect(res.status).toBe(404);
  });
});
