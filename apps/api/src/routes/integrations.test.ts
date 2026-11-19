import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import type { IntegrationClient, IntegrationScope } from "@stella/shared/integrations/types";
import type { Env } from "../env.js";
import { errorResponse } from "../lib/authz.js";
import { eq } from "drizzle-orm";
import {
  profiles,
  stages,
  enrollments,
  stageGrants,
  stageUnlocks,
  integrationGroupMembers,
} from "../db/schema.js";
import * as authUsers from "../lib/auth-users.js";
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
import { loadSkillMapSource } from "../lib/skill-map-data.js";
import { integrationsRoute } from "./integrations.js";
import { adminIntegrationsRoute } from "./admin-integrations.js";
import { adminRoute } from "./admin.js";
import { certificatesRoute } from "./certificates.js";
import { stageGrantsRoute } from "./stage-grants.js";
import { stageStartRoute } from "./stage-start.js";
import { skillMapRoute } from "./skill-map.js";

const ROOT = "/api/admin/integrations";
const API = "/api/integrations/v1";
const SECRET = "integration-test-secret";
describe("外部連携の境界 (実 SQLite)", () => {
  let db: ReturnType<typeof sqliteD1>;
  let env: Env;
  let app: ReturnType<typeof mountTestApp>["app"];
  let adminToken: string;
  let studentToken: string;
  beforeEach(async () => {
    db = sqliteD1();
    db.sqlite.exec(`
      INSERT INTO tenants (id, name, active_count, active, created_at, updated_at) VALUES ('ses', 'fixture', 0, 1, 1, 1);
      INSERT INTO profiles (id, tenant_id, role, display_name, email, created_at) VALUES
      ('admin', 'ses', 'admin', '管理の例', 'admin@example.test', 1),
      ('other-admin', 'ses', 'admin', '別の管理者の例', 'other-admin@example.test', 1),
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
      stageStartRoute,
      skillMapRoute,
    ).app;
    app.route("/", integrationsRoute);
    adminToken = await signAccessToken(SECRET, "admin", "admin@example.test");
    studentToken = await signAccessToken(SECRET, "inside", "inside@example.test");
  });
  afterEach(() => db.sqlite.close());
  const create = async (scopes: IntegrationScope[] = ["groups:write"]) => {
    const res = await request(app, env, ROOT, {
      method: "POST",
      token: adminToken,
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
      token: adminToken,
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
    const list = await request(app, env, ROOT, { token: adminToken });
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
    for (const token of [undefined, "wrong", `stella_int_${"f".repeat(64)}`, a.token, adminToken]) {
      const res = await request(app, env, `${API}/me`, {
        token,
        headers: { Cookie: "better-auth.session_token=example" },
      });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });
    }
    await patch(a.client.id, { enabled: true });
    const rotate = await request(app, env, `${ROOT}/${a.client.id}/rotate`, {
      token: adminToken,
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
  it("管理者は一覧・作成・停止・再発行・scope変更・グループ閲覧を使え、受講者は403", async () => {
    const a = await create();
    for (const [path, method, body, adminStatus] of [
      [ROOT, "GET", undefined, 200],
      [ROOT, "POST", { name: "別の連携", scopes: [] }, 201],
      [`${ROOT}/${a.client.id}`, "PATCH", { enabled: false }, 200],
      [`${ROOT}/${a.client.id}/rotate`, "POST", undefined, 200],
      [`${ROOT}/${a.client.id}`, "PATCH", { scopes: [] }, 200],
      [`${ROOT}/${a.client.id}/groups`, "GET", undefined, 200],
    ] as const) {
      const options = { method, body: body ? JSON.stringify(body) : undefined };
      expect((await request(app, env, path, { ...options, token: studentToken })).status).toBe(403);
      expect((await request(app, env, path, { ...options, token: adminToken })).status).toBe(
        adminStatus,
      );
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
  const write = (
    token: string,
    suffix: string,
    body?: object,
    method = "PUT",
    key = "sample:term-1",
  ) =>
    request(app, env, `${API}/groups/${key}/${suffix}`, {
      token,
      method,
      body: body ? JSON.stringify(body) : undefined,
    });
  const setupWrite = async () => {
    const a = await create(["groups:write", "members:write", "stages:write"]);
    await patch(a.client.id, { allowedStagePrefixes: ["sample-"] });
    await put(a.token);
    await getDb(env)
      .insert(stages)
      .values([
        {
          id: "extra",
          slug: "sample-extra",
          title: "架空の課題",
          prerequisites: '["sample-basic"]',
          audience: "granted",
          status: "published",
        },
        {
          id: "extra2",
          slug: "sample-other",
          title: "別の課題",
          audience: "granted",
          status: "published",
        },
        {
          id: "basic",
          slug: "sample-basic",
          title: "基礎",
          audience: "catalog",
          status: "published",
        },
        {
          id: "denied",
          slug: "other-extra",
          title: "対象外",
          audience: "granted",
          status: "published",
        },
      ]);
    return a;
  };
  const setting = {
    slug: "sample-extra",
    due_at: "2026-12-10",
    message: "架空の案内",
    exempt: true,
  };
  it.each(["先に参加", "後から参加"])("連携で作る日時をミリ秒で保存する (%s)", async (order) => {
    const a = await setupWrite();
    const before = Date.now();
    const addMember = () =>
      write(a.token, "members", { members: [{ email: "inside@example.test" }] });
    if (order === "先に参加") expect((await addMember()).status).toBe(200);
    expect((await write(a.token, "stages", { stages: [setting] })).status).toBe(200);
    if (order === "後から参加") expect((await addMember()).status).toBe(200);
    const after = Date.now();
    const orm = getDb(env);
    const [member] = await orm.select().from(integrationGroupMembers);
    const [grant] = await orm.select().from(stageGrants);
    const [unlock] = await orm.select().from(stageUnlocks);
    for (const date of [member?.joinedAt, grant?.grantedAt, unlock?.unlockedAt]) {
      expect(date).toBeInstanceOf(Date);
      expect.soft(date?.getUTCFullYear()).toBe(new Date(before).getUTCFullYear());
      expect.soft(date?.getTime()).toBeGreaterThanOrEqual(before);
      expect.soft(date?.getTime()).toBeLessThanOrEqual(after);
    }
  });
  it("granted の親が要求に無ければ全体を拒否し、既存の設定と割り当てを保つ", async () => {
    const a = await setupWrite();
    await getDb(env)
      .update(stages)
      .set({ prerequisites: '["sample-extra"]' })
      .where(eq(stages.id, "extra2"));
    await write(a.token, "members", { members: [{ email: "inside@example.test" }] });
    await write(a.token, "stages", { stages: [setting] });
    const res = await write(a.token, "stages", {
      stages: [{ slug: "sample-other", exempt: true }],
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Invalid stages",
      errors: [{ slug: "sample-extra", code: "parent_not_included" }],
    });
    expect(db.sqlite.prepare("select stage_id from integration_group_stages").all()).toEqual([
      { stage_id: "extra" },
    ]);
    expect(db.sqlite.prepare("select stage_id from stage_grants").all()).toEqual([
      { stage_id: "extra" },
    ]);
    expect(db.sqlite.prepare("select stage_id from stage_unlocks").all()).toEqual([
      { stage_id: "extra" },
    ]);
  });
  it("明示した親から祖先をたどり、catalog を挟んだ granted の祖先も要求する", async () => {
    const a = await setupWrite();
    await getDb(env)
      .update(stages)
      .set({ parent: "sample-basic", prerequisites: '["sample-other","sample-basic"]' })
      .where(eq(stages.id, "extra"));
    await getDb(env)
      .update(stages)
      .set({ prerequisites: '["sample-other"]' })
      .where(eq(stages.id, "basic"));
    const res = await write(a.token, "stages", { stages: [setting] });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Invalid stages",
      errors: [{ slug: "sample-other", code: "parent_not_included" }],
    });
  });
  it("直接の親を指定しても、その先の granted の祖先が無ければ拒否する", async () => {
    const a = await setupWrite();
    await getDb(env)
      .update(stages)
      .set({ prerequisites: '["other-extra"]' })
      .where(eq(stages.id, "extra"));
    await getDb(env)
      .update(stages)
      .set({ prerequisites: '["sample-extra"]' })
      .where(eq(stages.id, "extra2"));
    const res = await write(a.token, "stages", { stages: [{ slug: "sample-other" }, setting] });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Invalid stages",
      errors: [{ slug: "other-extra", code: "parent_not_included" }],
    });
    expect(db.sqlite.prepare("select count(*) n from stage_grants").get()?.n).toBe(0);
  });
  it("granted の親子を順序にかかわらず設定でき、両方がツリーに出て免除した子を始められる", async () => {
    const a = await setupWrite();
    await getDb(env)
      .update(stages)
      .set({ parent: "sample-extra", prerequisites: '["sample-basic","sample-extra"]' })
      .where(eq(stages.id, "extra2"));
    await write(a.token, "members", { members: [{ email: "inside@example.test" }] });
    expect(
      (
        await write(a.token, "stages", {
          stages: [{ slug: "sample-other", exempt: true }, setting],
        })
      ).status,
    ).toBe(200);
    const map = await request(app, env, "/api/skill-map/mine?tiers=7", { token: studentToken });
    expect(map.status).toBe(200);
    expect(await map.json()).toMatchObject({
      skill_map: {
        stages: expect.arrayContaining([
          expect.objectContaining({ id: "extra" }),
          expect.objectContaining({ id: "extra2" }),
        ]),
      },
    });
    const start = await request(app, env, "/api/stages/extra2/start", {
      token: studentToken,
      method: "POST",
    });
    expect(start.status).toBe(200);
    expect(await start.json()).toMatchObject({
      created: true,
      enrollment: { stage_id: "extra2", user_id: "inside" },
    });
  });
  it("配置用の親がある研修は単独で割り当て、免除なしで始められる", async () => {
    const a = await setupWrite();
    const orm = getDb(env);
    await orm
      .update(stages)
      .set({ category: "開発ラボG", parent: "sample-other", prerequisites: "[]" })
      .where(eq(stages.id, "extra"));
    await orm.update(stages).set({ category: "開発ラボG" }).where(eq(stages.id, "extra2"));

    const configure = await write(a.token, "stages", { stages: [{ slug: "sample-extra" }] });
    expect(configure.status).toBe(200);
    expect(
      db.sqlite.prepare("select stage_id, exempt from integration_group_stages").all(),
    ).toEqual([{ stage_id: "extra", exempt: 0 }]);

    const readMap = async () => {
      const response = await request(app, env, "/api/skill-map/mine?tiers=7", {
        token: studentToken,
      });
      expect(response.status).toBe(200);
      const json = (await response.json()) as { skill_map: { stages: { id: string }[] } };
      return json.skill_map.stages;
    };
    expect(await readMap()).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "extra" })]),
    );
    await orm.insert(stageGrants).values({ stageId: "extra", profileId: "inside" });
    const stagesForLearner = await readMap();
    expect(stagesForLearner).toContainEqual(
      expect.objectContaining({ id: "extra", state: "unlocked", visibility: "full" }),
    );
    expect(stagesForLearner.some(({ id }) => id === "extra2")).toBe(false);
    const start = await request(app, env, "/api/stages/extra/start", {
      token: studentToken,
      method: "POST",
    });
    expect(start.status).toBe(200);
  });
  it("catalog の親は一緒に指定しなくても通る", async () => {
    const a = await setupWrite();
    expect((await write(a.token, "stages", { stages: [setting] })).status).toBe(200);
  });
  it("連携の exempt: true でSTELLAの使い方のクリア前でも00章を始められる", async () => {
    const a = await setupWrite();
    const orm = getDb(env);
    await orm.update(stages).set({ slug: "dev-env-basics" }).where(eq(stages.id, "basic"));
    await orm
      .update(stages)
      .set({
        slug: "devlab-ts-ch00",
        category: "開発ラボG",
        prerequisites: '["dev-env-basics"]',
      })
      .where(eq(stages.id, "extra"));
    expect((await patch(a.client.id, { allowedStagePrefixes: ["devlab-ts-"] })).status).toBe(200);
    expect(
      (await write(a.token, "members", { members: [{ email: "inside@example.test" }] })).status,
    ).toBe(200);
    expect(
      (await write(a.token, "stages", { stages: [{ slug: "devlab-ts-ch00", exempt: true }] }))
        .status,
    ).toBe(200);
    const started = await request(app, env, "/api/stages/extra/start", {
      token: studentToken,
      method: "POST",
    });
    expect(started.status).toBe(200);
    expect(await started.json()).toMatchObject({ created: true, state: "unlocked" });
  });
  it("招待・既存・再送・行ごとの失敗。既存の名前と手動割り当てを保護する", async () => {
    const a = await setupWrite();
    await getDb(env)
      .insert(stageGrants)
      .values({ profileId: "inside", stageId: "extra", message: "手動の案内" });
    expect((await write(a.token, "stages", { stages: [setting] })).status).toBe(200);
    const members = [
      { email: " NEW@EXAMPLE.TEST ", displayName: "招待の例", externalId: "app-1" },
      { email: "inside@example.test", displayName: "外からの名前", externalId: "app-2" },
      { email: "bad" },
      { email: "admin@example.test" },
      { email: "outside@example.test", externalId: "app-1" },
    ];
    const first = await write(a.token, "members", { members });
    expect(first.status).toBe(200);
    const body = await json<{ results: { status: string; id: string; code?: string }[] }>(first);
    expect(body.results.map((r) => r.status)).toEqual([
      "invited",
      "existing",
      "failed",
      "failed",
      "failed",
    ]);
    expect(body.results.slice(2).map((r) => r.code)).toEqual([
      "invalid_email",
      "not_invitable",
      "external_id_conflict",
    ]);
    expect(body.results[1]?.id).toBe("inside");
    const again = await write(a.token, "members", { members: members.slice(0, 2) });
    expect(await again.json()).toMatchObject({
      results: [
        { status: "already_member", id: body.results[0]?.id },
        { status: "already_member", id: "inside" },
      ],
    });
    expect(db.sqlite.prepare("select count(*) n from integration_group_members").get()?.n).toBe(2);
    expect(
      db.sqlite.prepare("select count(*) n from profiles where email='new@example.test'").get()?.n,
    ).toBe(1);
    expect(db.sqlite.prepare("select count(*) n from stage_grants").get()?.n).toBe(2);
    expect(
      db.sqlite.prepare("select display_name from profiles where id='inside'").get()?.display_name,
    ).toBe("受講者の例A");
    expect(
      db.sqlite
        .prepare("select source_group_id, message from stage_grants where profile_id='inside'")
        .get(),
    ).toMatchObject({ source_group_id: null, message: "手動の案内" });
    expect(
      db.sqlite.prepare("select count(*) n from stage_unlocks where user_id='inside'").get()?.n,
    ).toBe(0);
    expect(
      db.sqlite.prepare("select count(*) n from auth_users where email='new@example.test'").get()
        ?.n,
    ).toBe(1);
    const audit = JSON.stringify(db.sqlite.prepare("select metadata from audit_logs").all());
    for (const email of ["new@example.test", "inside@example.test", "admin@example.test"])
      expect(audit).not.toContain(email);
    expect(audit).toContain("succeeded");
  });
  it("ステージの設定・更新・後からの参加・読み取り・前提免除", async () => {
    const a = await setupWrite();
    await write(a.token, "members", { members: [{ email: "inside@example.test" }] });
    expect((await write(a.token, "stages", { stages: [setting] })).status).toBe(200);
    expect((await write(a.token, "stages", { stages: [setting] })).status).toBe(200);
    const read = await write(a.token, "stages", undefined, "GET");
    expect(await read.json()).toEqual({
      stages: [{ ...setting, due_at: "2026-12-10T14:59:59.000Z" }],
    });
    await write(a.token, "members", { members: [{ email: "outside@example.test" }] });
    expect(db.sqlite.prepare("select count(*) n from stage_grants").get()?.n).toBe(2);
    expect(
      db.sqlite.prepare("select count(*) n from stage_unlocks where via='staff'").get()?.n,
    ).toBe(2);
    expect(db.sqlite.prepare("select count(*) n from enrollments").get()?.n).toBe(0);
    const source = await loadSkillMapSource(getDb(env), {
      id: "inside",
      role: "student",
      name: "受講者の例A",
      email: "inside@example.test",
    });
    expect(source.stages.map((stage) => stage.id)).toContain("extra");
    expect(source.unlockedStageIds?.has("extra")).toBe(true);
    const mine = await request(app, env, "/api/stage-grants/mine", { token: studentToken });
    expect(mine.status).toBe(200);
    expect(await mine.text()).toContain("架空の案内");
    const roster = await request(app, env, "/api/stage-grants/extra/learners", {
      token: adminToken,
    });
    expect(await roster.json()).toMatchObject({
      learners: expect.arrayContaining([
        expect.objectContaining({ id: "inside", source_group: "テストグループ" }),
      ]),
    });
    await write(a.token, "stages", { stages: [{ ...setting, message: "変更", exempt: false }] });
    expect(db.sqlite.prepare("select count(*) n from stage_unlocks").get()?.n).toBe(0);
    expect(
      db.sqlite.prepare("select message from stage_grants where profile_id='inside'").get()
        ?.message,
    ).toBe("変更");
  });
  it.each([
    ["2026-12-04", "2026-12-04T14:59:59.000Z"],
    ["2026-12-04T09:30:00+09:00", "2026-12-04T00:30:00.000Z"],
    ["2026-12-04T18:15:30Z", "2026-12-04T18:15:30.000Z"],
  ])("期限 %s を %s で保存し、本人への案内に返す", async (input, expected) => {
    const a = await setupWrite();
    await write(a.token, "members", { members: [{ email: "inside@example.test" }] });
    const res = await write(a.token, "stages", {
      stages: [{ ...setting, due_at: input }],
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ stages: [{ due_at: expected }] });
    expect(db.sqlite.prepare("select due_at from integration_group_stages").all()).toEqual([
      { due_at: expected },
    ]);
    expect(db.sqlite.prepare("select due_at from stage_grants").all()).toEqual([
      { due_at: expected },
    ]);
    const mine = await request(app, env, "/api/stage-grants/mine", { token: studentToken });
    expect(mine.status).toBe(200);
    expect(await mine.json()).toMatchObject({
      stages: [{ stage_id: "extra", due_at: expected }],
    });
  });
  it("置換から外したら未着手だけ削除。開始済みの案内を消し、手動の免除は残す", async () => {
    const a = await setupWrite();
    await write(a.token, "members", {
      members: [{ email: "inside@example.test" }, { email: "outside@example.test" }],
    });
    await write(a.token, "stages", { stages: [setting] });
    await getDb(env).insert(enrollments).values({ userId: "inside", stageId: "extra" });
    expect((await write(a.token, "stages", { stages: [] })).status).toBe(200);
    expect(
      db.sqlite.prepare("select profile_id, due_at, message, source_name from stage_grants").all(),
    ).toEqual([{ profile_id: "inside", due_at: null, message: null, source_name: null }]);
    expect(db.sqlite.prepare("select user_id from stage_unlocks").all()).toEqual([
      { user_id: "inside" },
    ]);
    expect(db.sqlite.prepare("select count(*) n from enrollments").get()?.n).toBe(1);
    await write(a.token, "stages", { stages: [setting] });
    expect(db.sqlite.prepare("select count(*) n from stage_grants").get()?.n).toBe(2);
  });
  it("外部IDで外す。未着手だけ削除し、開始済みとグループ外の存在を守る", async () => {
    const a = await setupWrite();
    await write(a.token, "members", {
      members: [
        { email: "inside@example.test", externalId: "app-1" },
        { email: "outside@example.test", externalId: "app-2" },
      ],
    });
    await write(a.token, "stages", { stages: [setting] });
    await getDb(env).insert(enrollments).values({ userId: "inside", stageId: "extra" });
    expect((await write(a.token, "members/app-2?by=external", undefined, "DELETE")).status).toBe(
      200,
    );
    expect(db.sqlite.prepare("select profile_id from stage_grants").all()).toEqual([
      { profile_id: "inside" },
    ]);
    expect((await write(a.token, "members/inside", undefined, "DELETE")).status).toBe(200);
    expect(db.sqlite.prepare("select count(*) n from stage_grants").get()?.n).toBe(1);
    expect(db.sqlite.prepare("select count(*) n from enrollments").get()?.n).toBe(1);
    expect(db.sqlite.prepare("select count(*) n from profiles").get()?.n).toBe(4);
    expect((await write(a.token, "members/inside", undefined, "DELETE")).status).toBe(404);
    expect((await write(a.token, "members/admin", undefined, "DELETE")).status).toBe(404);
  });
  it("手動と別グループの割り当て・免除を変更しない", async () => {
    const a = await setupWrite();
    await getDb(env)
      .insert(stageGrants)
      .values({ profileId: "inside", stageId: "extra", message: "手動" });
    db.sqlite.exec(
      "insert into stage_unlocks(id,tenant_id,user_id,stage_id,via,unlocked_at) values ('manual','ses','outside','extra','staff',1)",
    );
    await write(a.token, "members", {
      members: [{ email: "inside@example.test" }, { email: "outside@example.test" }],
    });
    await write(a.token, "stages", { stages: [setting] });
    await put(a.token, "sample:term-2");
    await write(
      a.token,
      "members",
      { members: [{ email: "outside@example.test" }] },
      "PUT",
      "sample:term-2",
    );
    await write(
      a.token,
      "stages",
      { stages: [{ ...setting, message: "別グループ" }] },
      "PUT",
      "sample:term-2",
    );
    expect(
      db.sqlite.prepare("select message from stage_grants where profile_id='outside'").get()
        ?.message,
    ).toBe(setting.message);
    await write(a.token, "stages", { stages: [] }, "PUT", "sample:term-2");
    expect(db.sqlite.prepare("select count(*) n from stage_grants").get()?.n).toBe(2);
    await write(a.token, "stages", { stages: [] });
    expect(db.sqlite.prepare("select message from stage_grants").all()).toEqual([
      { message: "手動" },
    ]);
    expect(db.sqlite.prepare("select id from stage_unlocks").all()).toEqual([{ id: "manual" }]);
  });
  it("scope・所有者・接頭辞・granted・日時・文字数を検査し全体を拒否する", async () => {
    const a = await setupWrite();
    const b = await create(["members:write", "stages:write"]);
    for (const [suffix, method, body] of [
      ["members", "PUT", { members: [] }],
      ["members/inside", "DELETE", undefined],
      ["stages", "PUT", { stages: [] }],
      ["stages", "GET", undefined],
    ] as const) {
      expect((await write(b.token, suffix, body, method)).status).toBe(404);
    }
    await write(a.token, "stages", { stages: [setting] });
    for (const invalid of [
      { slug: "sample-basic" },
      { slug: "other-extra" },
      { slug: "sample-absent" },
      { ...setting, due_at: "2026-02-30" },
      { ...setting, due_at: "2026-12-10T00:00:00" },
      { ...setting, message: "x".repeat(501) },
      { ...setting, exempt: "true" },
    ]) {
      const res = await write(a.token, "stages", { stages: [{ slug: "sample-other" }, invalid] });
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({
        errors: [expect.objectContaining({ slug: invalid.slug })],
      });
      expect(db.sqlite.prepare("select stage_id from integration_group_stages").all()).toEqual([
        { stage_id: "extra" },
      ]);
    }
    expect((await patch(a.client.id, { allowedStagePrefixes: [""] })).status).toBe(400);
    await patch(a.client.id, { allowedStagePrefixes: [] });
    expect((await write(a.token, "stages", { stages: [setting] })).status).toBe(400);
    await patch(a.client.id, { scopes: [] });
    for (const [suffix, method] of [
      ["members", "PUT"],
      ["members/inside", "DELETE"],
      ["stages", "PUT"],
      ["stages", "GET"],
    ])
      expect((await write(a.token, suffix, undefined, method)).status).toBe(403);
  });
  it("100人をまとめて設定してもD1のバインド上限を超えず、101人は拒否する", async () => {
    const a = await setupWrite();
    const members = Array.from({ length: 100 }, (_, i) => ({
      email: `fixture-${i}@example.test`,
      externalId: `ext-${i}`,
    }));
    expect((await write(a.token, "members", { members })).status).toBe(200);
    expect(
      (await write(a.token, "stages", { stages: [setting, { slug: "sample-other" }] })).status,
    ).toBe(200);
    expect(db.sqlite.prepare("select count(*) n from stage_grants").get()?.n).toBe(200);
    expect(
      (await write(a.token, "members", { members: [...members, { email: "over@example.test" }] }))
        .status,
    ).toBe(400);
    expect(db.sqlite.prepare("pragma foreign_key_check").all()).toEqual([]);
  });
  it("割り当て書き込みで失敗したら設定と割り当ての変更をまとめて戻す", async () => {
    const a = await setupWrite();
    await write(a.token, "members", { members: [{ email: "inside@example.test" }] });
    await write(a.token, "stages", { stages: [{ slug: "sample-other" }] });
    db.sqlite.exec(
      "CREATE TRIGGER fail_unlock BEFORE INSERT ON stage_unlocks BEGIN SELECT RAISE(ABORT, 'fixture failure'); END",
    );
    const res = await write(a.token, "stages", { stages: [setting] });
    expect(res.status).toBe(500);
    expect(db.sqlite.prepare("select stage_id from integration_group_stages").all()).toEqual([
      { stage_id: "extra2" },
    ]);
    expect(db.sqlite.prepare("select stage_id from stage_grants").all()).toEqual([
      { stage_id: "extra2" },
    ]);
  });
  it("同じメールの招待が競合しても、先に作られたプロフィールで existing として続ける", async () => {
    const a = await setupWrite();
    await write(a.token, "stages", { stages: [setting] });
    const original = authUsers.inviteUser;
    let recoveredId = "";
    const invite = vi
      .spyOn(authUsers, "inviteUser")
      .mockImplementationOnce(async (database, input) => {
        recoveredId = await original(database, { ...input, displayName: "先に招待された名前" });
        throw new Error("UNIQUE constraint failed: profiles.email");
      });
    try {
      const response = await write(a.token, "members", {
        members: [
          {
            email: " RACE@EXAMPLE.TEST ",
            displayName: "後からの名前",
            externalId: "race-external",
          },
        ],
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        results: [{ index: 0, status: "existing", id: recoveredId }],
      });
      expect(invite).toHaveBeenCalledTimes(1);
      expect(
        db.sqlite.prepare("select count(*) n from profiles where email='race@example.test'").get()
          ?.n,
      ).toBe(1);
      expect(
        db.sqlite.prepare("select count(*) n from auth_users where email='race@example.test'").get()
          ?.n,
      ).toBe(1);
      expect(
        db.sqlite.prepare("select display_name from profiles where email='race@example.test'").get()
          ?.display_name,
      ).toBe("先に招待された名前");
      expect(
        db.sqlite
          .prepare("select external_id from integration_group_members where profile_id=?")
          .get(recoveredId)?.external_id,
      ).toBe("race-external");
      expect(
        db.sqlite.prepare("select count(*) n from stage_grants where profile_id=?").get(recoveredId)
          ?.n,
      ).toBe(1);
    } finally {
      invite.mockRestore();
    }
  });
  it.each(["admin", "disabled", "external-conflict"] as const)(
    "競合後のプロフィールも再検証する (%s)",
    async (kind) => {
      const a = await setupWrite();
      const invite = vi
        .spyOn(authUsers, "inviteUser")
        .mockImplementationOnce(async (database, input) => {
          await database.insert(profiles).values({
            id: "race-profile",
            email: input.email,
            displayName: "架空の同時招待",
            role: kind === "admin" ? "admin" : "student",
            disabled: kind === "disabled",
          });
          if (kind === "external-conflict") {
            // この要求がメンバー一覧を読み終えた後、別の要求が外部IDを取得した状況。
            const ownGroup = db.sqlite
              .prepare("select id from integration_groups where external_key='sample:term-1'")
              .get();
            db.sqlite
              .prepare(
                "insert into integration_group_members(group_id,profile_id,external_id,joined_at) values (?, 'inside', 'race-external', ?)",
              )
              .run(String(ownGroup?.id), Date.now());
          }
          throw new Error("UNIQUE constraint failed: profiles.email");
        });
      try {
        const response = await write(a.token, "members", {
          members: [{ email: "race@example.test", externalId: "race-external" }],
        });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
          results: [
            {
              index: 0,
              status: "failed",
              id: null,
              code: kind === "external-conflict" ? "external_id_conflict" : "not_invitable",
            },
          ],
        });
        expect(
          db.sqlite
            .prepare(
              "select count(*) n from integration_group_members where profile_id='race-profile'",
            )
            .get()?.n,
        ).toBe(0);
      } finally {
        invite.mockRestore();
      }
    },
  );
  it("ログインが招待より先の場合のID再利用と、招待失敗後の次の人の処理", async () => {
    const a = await setupWrite();
    db.sqlite.exec(
      "insert into auth_users(id,email,created_at,updated_at) values ('login-first','login-first@example.test',1,1)",
    );
    db.sqlite.exec(
      "CREATE TRIGGER fail_invite BEFORE INSERT ON profiles WHEN NEW.email = 'fail@example.test' BEGIN SELECT RAISE(ABORT, 'fixture failure'); END",
    );
    const res = await write(a.token, "members", {
      members: [
        { email: "fail@example.test" },
        { email: "login-first@example.test", externalId: "first" },
        { email: "outside@example.test" },
      ],
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      results: [
        { index: 0, status: "failed", code: "invite_failed", id: null },
        { index: 1, status: "invited", id: "login-first" },
        { index: 2, status: "existing", id: "outside" },
      ],
    });
    expect(
      db.sqlite
        .prepare("select count(*) n from auth_users where email='login-first@example.test'")
        .get()?.n,
    ).toBe(1);
    expect(
      (
        await write(a.token, "members", {
          members: [{ email: "login-first@example.test", externalId: "changed" }],
        })
      ).status,
    ).toBe(200);
    expect((await write(a.token, "members/first?by=external", undefined, "DELETE")).status).toBe(
      404,
    );
    expect((await write(a.token, "members/changed?by=external", undefined, "DELETE")).status).toBe(
      200,
    );
    expect(db.sqlite.prepare("pragma foreign_key_check").all()).toEqual([]);
  });
  it("メンバーと割り当ての反映は、全員を同じbatchで書き、失敗時にまとめて戻す", async () => {
    const a = await setupWrite();
    await write(a.token, "stages", { stages: [setting] });
    db.sqlite.exec(
      "CREATE TRIGGER fail_unlock BEFORE INSERT ON stage_unlocks BEGIN SELECT RAISE(ABORT, 'fixture failure'); END",
    );
    expect(
      (
        await write(a.token, "members", {
          members: [{ email: "inside@example.test" }, { email: "outside@example.test" }],
        })
      ).status,
    ).toBe(500);
    expect(db.sqlite.prepare("select count(*) n from integration_group_members").get()?.n).toBe(0);
    expect(db.sqlite.prepare("select count(*) n from stage_grants").get()?.n).toBe(0);
    db.sqlite.exec("DROP TRIGGER fail_unlock");
    const retry = await write(a.token, "members", {
      members: [
        { email: "inside@example.test" },
        { email: "inside@example.test" },
        { email: "outside@example.test" },
      ],
    });
    expect(retry.status).toBe(200);
    expect(await retry.json()).toMatchObject({
      results: [{ status: "existing" }, { status: "already_member" }, { status: "existing" }],
    });
    expect(db.sqlite.prepare("select count(*) n from stage_grants").get()?.n).toBe(2);
  });
});
