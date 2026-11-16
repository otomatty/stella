import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import type { IntegrationClient, IntegrationScope } from "@stella/shared/integrations/types";
import type { Env } from "../env.js";
import { errorResponse } from "../lib/authz.js";
import { stages, enrollments, stageGrants } from "../db/schema.js";
import { getDb } from "../db/client.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import {
  requireOwnGroup,
  requireOwnGroupMember,
  authenticateIntegration,
  type IntegrationAuth,
} from "../lib/integrations.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { integrationsRoute } from "./integrations.js";
import { adminIntegrationsRoute } from "./admin-integrations.js";
import { adminRoute } from "./admin.js";
import { certificatesRoute } from "./certificates.js";
import { stageGrantsRoute } from "./stage-grants.js";

const ROOT = "/api/admin/integrations";
const API = "/api/integrations/v1";
const SECRET = "integration-test-secret";
describe("外部連携の境界 (実 SQLite)", () => {
  let db: ReturnType<typeof sqliteD1>;
  let env: Env;
  let app: ReturnType<typeof mountTestApp>["app"];
  let platformToken: string;
  let adminToken: string;
  let studentToken: string;
  beforeEach(async () => {
    db = sqliteD1();
    db.sqlite.exec(`
      INSERT INTO tenants (id, name, active_count, active, created_at, updated_at) VALUES ('ses', 'fixture', 0, 1, 1, 1);
      INSERT INTO profiles (id, tenant_id, role, display_name, email, created_at) VALUES
      ('platform', 'ses', 'platform_admin', 'システム管理の例', 'platform@example.test', 1),
      ('admin', 'ses', 'admin', '管理の例', 'admin@example.test', 1),
      ('inside', 'ses', 'student', '受講者の例A', 'inside@example.test', 1),
      ('outside', 'ses', 'student', '受講者の例B', 'outside@example.test', 1);
    `);
    env = { DB: db.binding, AUTH_JWT_SECRET: SECRET } as Env;
    app = mountTestApp(
      env,
      adminIntegrationsRoute,
      adminRoute,
      certificatesRoute,
      stageGrantsRoute,
    ).app;
    app.route("/", integrationsRoute);
    platformToken = await signAccessToken(SECRET, "platform", "platform@example.test");
    adminToken = await signAccessToken(SECRET, "admin", "admin@example.test");
    studentToken = await signAccessToken(SECRET, "inside", "inside@example.test");
  });
  afterEach(() => db.sqlite.close());
  const create = async (scopes: IntegrationScope[] = ["groups:write"]) => {
    const res = await request(app, env, ROOT, {
      method: "POST",
      token: platformToken,
      body: JSON.stringify({ name: "テスト連携", scopes }),
    });
    expect(res.status).toBe(201);
    return json<{ client: IntegrationClient; token: string }>(res);
  };
  const put = (token: string, key = "sample:term-1", name = "テストグループ") =>
    request(app, env, `${API}/groups/${key}`, {
      token,
      method: "PUT",
      body: JSON.stringify({ name }),
    });
  const patch = (id: string, body: object) =>
    request(app, env, `${ROOT}/${id}`, {
      method: "PATCH",
      token: platformToken,
      body: JSON.stringify(body),
    });
  it("発行・疎通・冪等な作成と名前変更。DB・一覧・監査に平文を持たない", async () => {
    const a = await create();
    expect(a.token).toMatch(/^stella_int_[a-f0-9]{64}$/);
    expect((await put(a.token)).status).toBe(200);
    expect((await put(a.token, "sample:term-1", "変更したグループ")).status).toBe(200);
    const res = await request(app, env, `${API}/me`, { token: a.token });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      client: { name: "テスト連携", scopes: ["groups:write"] },
      groups: [{ key: "sample:term-1", name: "変更したグループ", memberCount: 0 }],
    });
    const stored = JSON.stringify(db.sqlite.prepare("select * from integration_clients").all());
    expect(stored).not.toContain(a.token);
    const list = await request(app, env, ROOT, { token: platformToken });
    const listed = await list.text();
    expect(listed).not.toContain(a.token);
    expect(listed).not.toContain("tokenHash");
    expect(listed).not.toContain("token_hash");
    expect(listed).toContain(a.client.tokenPrefix);
    const audit = JSON.stringify(db.sqlite.prepare("select * from audit_logs").all());
    expect(audit).not.toContain(a.token);
    expect(audit).toContain("integration_client_create");
    expect(audit).toContain("integration_request");
    expect(audit).not.toContain("変更したグループ");
    expect(
      db.sqlite.prepare("select last_used_at from integration_clients").get()?.last_used_at,
    ).toBeTypeOf("number");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
  it("無し・不正・停止・古いトークンは同じ401。Cookie・管理者セッションも使えない", async () => {
    const a = await create();
    await patch(a.client.id, { enabled: false });
    for (const token of [
      undefined,
      "wrong",
      `stella_int_${"f".repeat(64)}`,
      a.token,
      platformToken,
    ]) {
      const res = await request(app, env, `${API}/me`, {
        token,
        headers: { Cookie: "better-auth.session_token=example" },
      });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });
    }
    await patch(a.client.id, { enabled: true });
    const rotate = await request(app, env, `${ROOT}/${a.client.id}/rotate`, {
      token: platformToken,
      method: "POST",
    });
    const fresh = await json<{ token: string }>(rotate);
    expect((await request(app, env, `${API}/me`, { token: a.token })).status).toBe(401);
    expect((await request(app, env, `${API}/me`, { token: fresh.token })).status).toBe(200);
    expect(JSON.stringify(db.sqlite.prepare("select * from audit_logs").all())).toContain(
      "integration_token_rotate",
    );
  });
  it("scope無しでも/meは読めるが書けない。変更後は即時反映する", async () => {
    const a = await create([]);
    expect((await request(app, env, `${API}/me`, { token: a.token })).status).toBe(200);
    expect((await put(a.token)).status).toBe(403);
    await patch(a.client.id, { scopes: ["groups:write"] });
    expect((await put(a.token)).status).toBe(200);
  });
  it("クライアント単位の制限はscopeより先に429を返す", async () => {
    const a = await create([]);
    const limit = vi.fn().mockResolvedValue({ success: false });
    env.INTEGRATION_RATE_LIMITER = { limit } as RateLimit;
    expect((await put(a.token)).status).toBe(429);
    expect(limit).toHaveBeenCalledWith({ key: a.client.id });
    expect((await request(app, env, `${API}/me`, { token: a.token })).status).toBe(429);
    const audit = JSON.stringify(
      db.sqlite.prepare("select metadata from audit_logs where action='integration_request'").all(),
    );
    expect(audit).toContain("429");
  });
  it("所有グループとメンバーの範囲外は404。/meは人数だけを返す", async () => {
    const a = await create();
    const b = await create();
    await put(a.token);
    const own = await requireOwnGroup(getDb(env), a.client.id, "sample:term-1");
    db.sqlite
      .prepare(
        "insert into integration_group_members (group_id,profile_id,joined_at) values (?, 'inside', 1)",
      )
      .run(own.id);
    await expect(requireOwnGroup(getDb(env), b.client.id, own.key)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      requireOwnGroupMember(getDb(env), b.client.id, own.key, "inside"),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      requireOwnGroupMember(getDb(env), a.client.id, own.key, "outside"),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      requireOwnGroupMember(getDb(env), a.client.id, own.key, "absent"),
    ).rejects.toMatchObject({ status: 404 });
    expect(await requireOwnGroupMember(getDb(env), a.client.id, own.key, "inside")).toEqual({
      id: "inside",
    });
    const aMe = await request(app, env, `${API}/me`, { token: a.token });
    const text = await aMe.text();
    expect(text).toContain('"memberCount":1');
    expect(text).not.toContain("outside");
    expect(text).not.toContain("inside");
    const bMe = await request(app, env, `${API}/me`, { token: b.token });
    expect(await bMe.json()).toMatchObject({ groups: [] });
    // 同じ外部キーを別のクライアントが自分用に作れる。
    expect((await put(b.token)).status).toBe(200);
    expect(db.sqlite.prepare("select count(*) n from integration_groups").get()?.n).toBe(2);
  });
  it("将来のルートにもmiddlewareと所有権チェックを組み合わせられる", async () => {
    const a = await create();
    const b = await create();
    await put(a.token);
    const probe = new Hono<IntegrationAuth>();
    probe.onError((err, c) => errorResponse(c, err));
    probe.use(`${API}/*`, authenticateIntegration);
    probe.get(`${API}/groups/:key`, async (c) =>
      c.json(
        await requireOwnGroup(
          c.get("integrationDb"),
          c.get("integrationClient").id,
          c.req.param("key"),
        ),
      ),
    );
    const res = await probe.request(
      `${API}/groups/sample:term-1`,
      { headers: { Authorization: `Bearer ${b.token}` } },
      env,
    );
    expect(res.status).toBe(404);
  });
  it("platform_adminだけが一覧・作成・停止・再発行・scope変更・グループ閲覧を使える", async () => {
    const a = await create();
    for (const token of [adminToken, studentToken]) {
      for (const [path, method, body] of [
        [ROOT, "GET", undefined],
        [ROOT, "POST", { name: "拒否", scopes: [] }],
        [`${ROOT}/${a.client.id}`, "PATCH", { enabled: false }],
        [`${ROOT}/${a.client.id}/rotate`, "POST", undefined],
        [`${ROOT}/${a.client.id}`, "PATCH", { scopes: [] }],
        [`${ROOT}/${a.client.id}/groups`, "GET", undefined],
      ] as const) {
        const res = await request(app, env, path, {
          method,
          token,
          body: body ? JSON.stringify(body) : undefined,
        });
        expect(res.status).toBe(403);
      }
    }
    expect(
      (await request(app, env, "/api/admin/integration-groups", { token: adminToken })).status,
    ).toBe(200);
    expect(
      (await request(app, env, "/api/admin/integration-groups", { token: studentToken })).status,
    ).toBe(403);
  });
  it("ユーザー一覧はSQLでグループに絞られ、受講者は使えない。削除でメンバーも消える", async () => {
    const a = await create();
    await put(a.token);
    const group = await requireOwnGroup(getDb(env), a.client.id, "sample:term-1");
    db.sqlite
      .prepare(
        "insert into integration_group_members (group_id,profile_id,joined_at) values (?, 'inside', 1)",
      )
      .run(group.id);
    const path = `/api/admin/users?groupId=${group.id}`;
    const res = await request(app, env, path, { token: adminToken });
    expect((await json<{ rows: { id: string }[] }>(res)).rows.map((r) => r.id)).toEqual(["inside"]);
    expect((await request(app, env, path, { token: studentToken })).status).toBe(403);
    const deleted = await request(app, env, "/api/admin/users/delete", {
      token: adminToken,
      method: "POST",
      body: JSON.stringify({ userId: "inside", confirmEmail: "inside@example.test" }),
    });
    expect(deleted.status).toBe(200);
    expect(db.sqlite.prepare("select count(*) n from integration_group_members").get()?.n).toBe(0);
  });
  it("成績台帳・割り当てもグループで絞り、staffを受講者の成績に数えない", async () => {
    const a = await create();
    await put(a.token);
    const group = await requireOwnGroup(getDb(env), a.client.id, "sample:term-1");
    const orm = getDb(env);
    await orm.insert(stages).values({
      id: "extra",
      slug: "sample-extra",
      title: "架空の専用ステージ",
      audience: "granted",
      status: "published",
    });
    for (const userId of ["inside", "outside", "admin"]) {
      await orm.insert(enrollments).values({ userId, stageId: "extra" });
      await orm.insert(stageGrants).values({ profileId: userId, stageId: "extra" });
    }
    for (const id of ["inside", "admin"])
      db.sqlite
        .prepare(
          "insert into integration_group_members (group_id,profile_id,joined_at) values (?, ?, 1)",
        )
        .run(group.id, id);
    const gradePath = `/api/certificates/gradebook/extra?groupId=${group.id}`;
    const grade = await request(app, env, gradePath, { token: adminToken });
    expect(grade.status).toBe(200);
    expect(
      (await json<{ gradebook: { rows: { user_id: string }[] } }>(grade)).gradebook.rows.map(
        (r) => r.user_id,
      ),
    ).toEqual(["inside"]);
    const rosterPath = `/api/stage-grants/extra/learners?groupId=${group.id}`;
    const roster = await request(app, env, rosterPath, { token: adminToken });
    expect(roster.status).toBe(200);
    const body = await json<{ learners: { id: string }[]; counts: { assigned: number } }>(roster);
    expect(body.learners.map((r) => r.id).sort()).toEqual(["admin", "inside"]);
    expect(body.counts.assigned).toBe(2);
    // 割り当ては従来どおり全ロールを対象にし、成績はstudentだけ。
    for (const path of [gradePath, rosterPath])
      expect((await request(app, env, path, { token: studentToken })).status).toBe(403);
    for (const path of [
      "/api/admin/users?groupId=missing",
      "/api/stage-grants/extra/learners?groupId=missing",
    ]) {
      const res = await request(app, env, path, { token: adminToken });
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject(
        path.includes("learners") ? { learners: [] } : { rows: [] },
      );
    }
  });
  it("メンバーはグループ内で一意だが、同じ人が複数グループに入れる", async () => {
    const a = await create();
    await put(a.token);
    await put(a.token, "sample:term-2");
    const one = await requireOwnGroup(getDb(env), a.client.id, "sample:term-1");
    const two = await requireOwnGroup(getDb(env), a.client.id, "sample:term-2");
    const insert = db.sqlite.prepare(
      "insert into integration_group_members (group_id,profile_id,joined_at) values (?, 'inside', 1)",
    );
    insert.run(one.id);
    insert.run(two.id);
    expect(() => insert.run(one.id)).toThrow();
    db.sqlite.prepare("delete from profiles where id='inside'").run();
    expect(db.sqlite.prepare("select count(*) n from integration_group_members").get()?.n).toBe(0);
    expect(db.sqlite.prepare("pragma foreign_key_check").all()).toEqual([]);
  });
  it("キー・名前・scopeを検査する", async () => {
    const a = await create();
    for (const key of ["invalid.key", "あ", "x".repeat(101)])
      expect((await put(a.token, key)).status).toBe(400);
    expect((await put(a.token, "valid", " ")).status).toBe(400);
    expect((await patch(a.client.id, { scopes: ["unknown"] })).status).toBe(400);
    expect((await patch(a.client.id, { enabled: "false" })).status).toBe(400);
  });
});
