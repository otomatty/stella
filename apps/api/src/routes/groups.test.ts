import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "../db/client.js";
import {
  enrollments,
  integrationClients,
  lessonProgress,
  lessons,
  sections,
  stages,
  taskProgress,
  tasks,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { newIntegrationToken } from "../lib/integrations.js";
import { json, mountTestApp, request, type RouteApp } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { adminGroupsRoute } from "./admin-groups.js";
import { cmsRoute } from "./cms.js";
import { enrollmentsRoute } from "./enrollments.js";
import { groupsRoute } from "./groups.js";
import { integrationsRoute } from "./integrations.js";

const ADMIN = "/api/admin/groups";
const LEARNER = "/api/groups";
const INTEGRATION = "/api/integrations/v1/groups/term";
const SECRET = "groups-test-secret";

describe("グループ API (実 SQLite)", () => {
  let fixture: ReturnType<typeof sqliteD1>;
  let env: Env;
  let app: RouteApp;
  let admin: string;
  let learner: string;
  let disabled: string;
  let integration: string;

  beforeEach(async () => {
    fixture = sqliteD1();
    env = { DB: fixture.binding, AUTH_JWT_SECRET: SECRET } as Env;
    app = mountTestApp(env, groupsRoute).app;
    app.route("/", adminGroupsRoute);
    app.route("/", cmsRoute);
    app.route("/", enrollmentsRoute);
    app.route("/", integrationsRoute);
    const { token, ...stored } = await newIntegrationToken();
    integration = token;
    fixture.sqlite.exec(`
      insert into tenants (id, name, active_count, active, created_at, updated_at)
        values ('ses', 'fixture', 0, 1, 1, 1);
      insert into profiles (id, tenant_id, display_name, email, role, disabled, created_at) values
        ('profile-admin', 'ses', 'Admin', 'admin@example.test', 'admin', 0, 1),
        ('profile-me', 'ses', 'Zoe', 'me@example.test', 'student', 0, 1),
        ('profile-peer-a', 'ses', 'Secret display name', 'peer-a@example.test', 'student', 0, 1),
        ('profile-peer-b', 'ses', 'Amy', 'peer-b@example.test', 'student', 0, 1),
        ('profile-disabled', 'ses', 'A Disabled', 'disabled@example.test', 'student', 1, 1),
        ('profile-outside', 'ses', 'Outside', 'outside@example.test', 'student', 0, 1);
    `);
    await getDb(env)
      .insert(integrationClients)
      .values({
        ...stored,
        id: "client",
        name: "Partner",
        scopes: ["progress:read", "stages:write"],
        allowedStagePrefixes: ["extra-"],
      });
    fixture.sqlite.exec(`
      insert into groups (id, name, share_progress, client_id, external_key, created_at, updated_at) values
        ('shared', 'Zoo Group', 1, 'client', 'term', 1, 1),
        ('another', 'Art Group', 1, null, null, 1, 1),
        ('private', 'Private Group', 0, null, null, 1, 1),
        ('outside', 'Other Group', 1, null, null, 1, 1);
      insert into group_members (group_id, profile_id, peer_name, external_id, joined_at) values
        ('shared', 'profile-me', null, 'external-me', 1),
        ('shared', 'profile-peer-a', 'Amy', 'external-other', 1),
        ('shared', 'profile-peer-b', null, null, 1),
        ('shared', 'profile-admin', null, null, 1),
        ('shared', 'profile-disabled', null, null, 1),
        ('another', 'profile-me', null, null, 1),
        ('private', 'profile-me', null, null, 1),
        ('outside', 'profile-outside', null, null, 1);
    `);
    [admin, learner, disabled] = await Promise.all([
      signAccessToken(SECRET, "profile-admin", "admin@example.test"),
      signAccessToken(SECRET, "profile-me", "me@example.test"),
      signAccessToken(SECRET, "profile-disabled", "disabled@example.test"),
    ]);
  });

  afterEach(() => fixture.sqlite.close());

  const call = (token: string, path: string, method = "GET", body?: object) =>
    request(app, env, path, { token, method, body: body && JSON.stringify(body) });

  async function seedStages() {
    const db = getDb(env);
    await db.insert(stages).values([
      {
        id: "stage-a",
        slug: "extra-parent",
        title: "Intro",
        audience: "granted",
        status: "published",
      },
      {
        id: "stage-b",
        slug: "extra-child",
        title: "Intro",
        audience: "granted",
        status: "published",
        parent: "extra-parent",
        prerequisites: '["extra-parent"]',
      },
      { id: "stage-z", slug: "extra-draft", title: "Hidden draft", audience: "granted" },
      { id: "stage-basic", slug: "basic", title: "Basic", status: "published" },
      {
        id: "stage-free",
        slug: "no-prefix",
        title: "Other Extra",
        audience: "granted",
        status: "published",
      },
    ]);
    fixture.sqlite.exec(`
      insert into group_stages (group_id, stage_id) values
        ('shared', 'stage-b'), ('shared', 'stage-z'), ('shared', 'stage-a');
    `);
  }

  async function seedProgress() {
    await seedStages();
    const db = getDb(env);
    await db.insert(sections).values([
      { id: "unit-one", stageId: "stage-a", title: "First unit" },
      { id: "unit-two", stageId: "stage-a", title: "Second unit" },
    ]);
    await db.insert(lessons).values([
      { id: "lesson-slides", sectionId: "unit-one", title: "Slides", type: "slides", public: true },
      { id: "lesson-task", sectionId: "unit-two", title: "Task instructions", type: "text" },
    ]);
    await db.insert(lessonProgress).values([
      { userId: "profile-me", lessonId: "lesson-slides", completed: true },
      { userId: "profile-me", lessonId: "lesson-task", completed: false },
      { userId: "profile-me", lessonId: "lesson-removed", completed: true },
      { userId: "profile-peer-a", lessonId: "lesson-slides", completed: true },
      { userId: "profile-peer-a", lessonId: "lesson-task", completed: true },
    ]);
    await db.insert(tasks).values(
      ["task-one", "task-two", "task-inactive", "task-variant"].map((id) => ({
        id,
        sectionId: "unit-one",
        title: id,
        kind: "practice",
        pattern: "example",
        estimatedMinutes: 5,
        order: 1,
        contentHash: "current",
        definition: "{}",
        bundle: "{}",
        active: id !== "task-inactive",
        variantOf: id === "task-variant" ? "task-one" : null,
      })),
    );
    await db.insert(taskProgress).values([
      { userId: "profile-me", taskId: "task-one", status: "ai-passed", contentHash: "previous" },
      { userId: "profile-me", taskId: "task-two", status: "local-passed", contentHash: "current" },
      { userId: "profile-me", taskId: "task-inactive", status: "passed", contentHash: "current" },
      { userId: "profile-me", taskId: "task-variant", status: "passed", contentHash: "current" },
      { userId: "profile-peer-a", taskId: "task-one", status: "passed", contentHash: "current" },
      { userId: "profile-peer-a", taskId: "task-two", status: "passed", contentHash: "current" },
    ]);
    await db.insert(enrollments).values([
      { userId: "profile-me", stageId: "stage-a" },
      { userId: "profile-me", stageId: "stage-b", completedAt: new Date(1), status: "completed" },
    ]);
  }

  function addRoster() {
    fixture.sqlite.exec(`
      with recursive numbers(n) as (values (1) union all select n + 1 from numbers where n < 200)
      insert into profiles (id, tenant_id, display_name, created_at)
      select printf('roster-%03d', n), 'ses', printf('Roster %03d', n), 1 from numbers;
      insert into group_members (group_id, profile_id, joined_at)
      select 'shared', id, 1 from profiles where id like 'roster-%';
    `);
  }

  it("公開中の所属グループだけを名前順に返し、有効な受講者だけを数える", async () => {
    const res = await call(learner, `${LEARNER}/mine`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({
      groups: [
        { id: "another", name: "Art Group", memberCount: 1 },
        { id: "shared", name: "Zoo Group", memberCount: 3 },
      ],
    });
  });

  it("所属外・公開オフ・不存在は同じ 404。管理者と無効な受講者は使えない", async () => {
    for (const id of ["outside", "private", "unknown"]) {
      const res = await call(learner, `${LEARNER}/${id}/peers`);
      expect(res.status).toBe(404);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(await res.json()).toEqual({ error: "Not found" });
    }
    for (const path of [`${LEARNER}/mine`, `${LEARNER}/shared/peers`]) {
      expect((await call(admin, path)).status).toBe(403);
      expect((await call(disabled, path)).status).toBe(403);
    }
  });

  it("呼び名・進捗・修了だけを公開し、同名のときは内部 ID 順に並べる", async () => {
    await seedProgress();
    const res = await call(learner, `${LEARNER}/shared/peers`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const payload = await res.text();
    expect(payload).not.toMatch(/@example\.test|profile-|external-|Secret display name/);
    expect(JSON.parse(payload)).toEqual({
      group: { id: "shared", name: "Zoo Group" },
      stages: [
        { id: "stage-a", title: "Intro" },
        { id: "stage-b", title: "Intro" },
      ],
      members: [
        {
          name: "Amy",
          isMe: false,
          stages: [
            { id: "stage-a", percent: 100, cleared: false },
            { id: "stage-b", percent: 0, cleared: false },
          ],
        },
        {
          name: "Amy",
          isMe: false,
          stages: [
            { id: "stage-a", percent: 0, cleared: false },
            { id: "stage-b", percent: 0, cleared: false },
          ],
        },
        {
          name: "Zoe",
          isMe: true,
          stages: [
            { id: "stage-a", percent: 50, cleared: false },
            { id: "stage-b", percent: 100, cleared: true },
          ],
        },
      ],
    });
  });

  it("公開ステージがなくても名前順で先頭200人を返す", async () => {
    addRoster();
    const res = await call(learner, `${LEARNER}/shared/peers`);
    expect(res.status).toBe(200);
    const { members, stages } = await json<{ members: { name: string }[]; stages: [] }>(res);
    expect(stages).toEqual([]);
    expect(members).toHaveLength(200);
    expect(members.slice(0, 2).map((member) => member.name)).toEqual(["Amy", "Amy"]);
    expect(members[199]).toEqual({ name: "Roster 198", isMe: false, stages: [] });
  });

  it("本人のステージ詳細と受講一覧で使うレッスン・課題を数える", async () => {
    await seedProgress();
    const [detail, mine, peers] = await Promise.all([
      call(learner, "/api/cms/stages/stage-a"),
      call(learner, "/api/enrollments/mine"),
      call(learner, `${LEARNER}/shared/peers`),
    ]);
    expect([detail.status, mine.status, peers.status]).toEqual([200, 200, 200]);
    const { stage } = await json<{ stage: { sections: { lessons: { id: string }[] }[] } }>(detail);
    const lessonIds = stage.sections.flatMap((section) =>
      section.lessons.map((lesson) => lesson.id),
    );
    expect(lessonIds.sort()).toEqual(["lesson-slides", "lesson-task"]);
    const { rows } = await json<{
      rows: { stage_id: string; tasks_total: number; tasks_passed: number }[];
    }>(mine);
    const enrollment = rows.find((row) => row.stage_id === "stage-a");
    expect(enrollment).toMatchObject({ tasks_total: 2, tasks_passed: 1 });
    const { members } = await json<{
      members: { isMe: boolean; stages: { id: string; percent: number }[] }[];
    }>(peers);
    expect(members.find((member) => member.isMe)?.stages).toContainEqual({
      id: "stage-a",
      percent: 50,
      cleared: false,
    });
  });

  it("管理 API の全操作を管理者に限定する", async () => {
    for (const [method, suffix] of [
      ["GET", ""],
      ["POST", ""],
      ["GET", "/shared"],
      ["PATCH", "/shared"],
      ["DELETE", "/shared"],
      ["PATCH", "/shared/members"],
      ["PATCH", "/shared/members/profile-me"],
      ["PUT", "/shared/stages"],
      ["GET", "/shared/progress"],
    ])
      expect((await call(learner, ADMIN + suffix, method)).status).toBe(403);
  });

  it("連携グループでは公開と呼び名だけを変更できる", async () => {
    for (const [method, path, body] of [
      ["PATCH", "/shared", { name: "Do not replace", shareProgress: false }],
      ["PATCH", "/shared/members", { add: ["profile-outside"] }],
      ["PUT", "/shared/stages", { stages: [] }],
      ["DELETE", "/shared", {}],
    ] as const) {
      const res = await call(admin, ADMIN + path, method, body);
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "連携のグループは連携 API で編集します" });
    }
    expect((await call(learner, `${LEARNER}/shared/peers`)).status).toBe(200);
    expect((await call(admin, `${ADMIN}/shared`, "PATCH", { shareProgress: false })).status).toBe(
      200,
    );
    expect((await call(learner, `${LEARNER}/shared/peers`)).status).toBe(404);
    const path = `${ADMIN}/shared/members/profile-me`;
    expect((await call(admin, path, "PATCH", { peerName: " " })).status).toBe(400);
    expect((await call(admin, path, "PATCH", { peerName: "a".repeat(51) })).status).toBe(400);
    expect((await call(admin, path, "PATCH", { peerName: "\0" })).status).toBe(400);
    expect((await call(admin, path, "PATCH", { peerName: "  Chosen name  " })).status).toBe(200);
    const read = () =>
      fixture.sqlite
        .prepare(
          "select peer_name from group_members where group_id = 'shared' and profile_id = 'profile-me'",
        )
        .get()?.peer_name;
    expect(read()).toBe("Chosen name");
    expect((await call(admin, path, "PATCH", { peerName: null })).status).toBe(200);
    expect(read()).toBeNull();
    expect(
      (await call(admin, `${ADMIN}/shared/members/profile-outside`, "PATCH", { peerName: null }))
        .status,
    ).toBe(404);
    const audit = JSON.stringify(
      fixture.sqlite
        .prepare("select action, metadata from audit_logs where target_type = 'group'")
        .all(),
    );
    expect(audit).toContain("group_update");
    expect(audit).toContain("group_peer_name_update");
    expect(audit).not.toMatch(/Chosen name|@example\.test/);
  });

  it("管理者のグループを作成し、両種の概要と詳細を読み、名前変更と削除ができる", async () => {
    await seedStages();
    expect((await call(admin, ADMIN, "POST", { name: " " })).status).toBe(400);
    expect((await call(admin, ADMIN, "POST", { name: "a".repeat(201) })).status).toBe(400);
    const created = await call(admin, ADMIN, "POST", { name: "  New group  " });
    expect(created.status).toBe(201);
    const { group } = await json<{ group: { id: string; name: string } }>(created);
    expect(group.name).toBe("New group");
    expect(
      fixture.sqlite.prepare("select created_by from groups where id = ?").get(group.id)
        ?.created_by,
    ).toBe("profile-admin");
    const list = await call(admin, ADMIN);
    expect(list.status).toBe(200);
    const { groups } = await json<{ groups: (typeof group)[] }>(list);
    expect(groups).toContainEqual(group);
    const filtered = await call(admin, `${ADMIN}?clientId=client`);
    const expected = {
      id: "shared",
      name: "Zoo Group",
      kind: "integration",
      clientName: "Partner",
      key: "term",
      memberCount: 4,
      stageCount: 3,
      shareProgress: true,
      updatedAt: new Date(1).toISOString(),
    };
    expect(await filtered.json()).toEqual({ groups: [expected] });
    const detail = await call(admin, `${ADMIN}/shared`);
    const result = await json<{ group: unknown; members: unknown[]; stages: unknown[] }>(detail);
    expect(result.group).toEqual(expected);
    expect(result.members).toContainEqual({
      id: "profile-peer-a",
      displayName: "Secret display name",
      email: "peer-a@example.test",
      peerName: "Amy",
      externalId: "external-other",
      joinedAt: new Date(1).toISOString(),
    });
    expect(result.stages).toContainEqual({
      id: "stage-a",
      slug: "extra-parent",
      title: "Intro",
      dueAt: null,
      message: null,
      exempt: false,
    });
    expect(
      (
        await call(admin, `${ADMIN}/${group.id}`, "PATCH", {
          name: " Renamed ",
          shareProgress: true,
        })
      ).status,
    ).toBe(200);
    expect(await (await call(admin, `${ADMIN}/${group.id}`)).json()).toMatchObject({
      group: { name: "Renamed", shareProgress: true },
    });
    expect((await call(admin, `${ADMIN}/${group.id}`, "DELETE")).status).toBe(200);
    expect((await call(admin, `${ADMIN}/${group.id}`)).status).toBe(404);
  });

  it("無効な追加 ID を返し、正常な追加と削除もまとめて拒否する", async () => {
    const path = `${ADMIN}/another/members`;
    const res = await call(admin, path, "PATCH", {
      add: ["profile-outside", "profile-admin", "profile-disabled", "profile-unknown"],
      remove: ["profile-me"],
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      invalidIds: ["profile-admin", "profile-disabled", "profile-unknown"],
    });
    const read = () =>
      fixture.sqlite
        .prepare(
          "select profile_id, joined_at from group_members where group_id = 'another' order by profile_id",
        )
        .all();
    expect(read()).toEqual([{ profile_id: "profile-me", joined_at: 1 }]);
    expect((await call(admin, path, "PATCH", { add: Array(101).fill("profile-me") })).status).toBe(
      400,
    );
    expect(
      (
        await call(admin, path, "PATCH", {
          add: [...Array(98).fill("profile-me"), "profile-outside"],
          remove: ["profile-unknown"],
        })
      ).status,
    ).toBe(200);
    expect(read()).toEqual([
      { profile_id: "profile-me", joined_at: 1 },
      { profile_id: "profile-outside", joined_at: expect.any(Number) },
    ]);
    expect((await call(admin, path, "PATCH", { remove: ["profile-me"] })).status).toBe(200);
    expect(read()).toEqual([{ profile_id: "profile-outside", joined_at: expect.any(Number) }]);
  });

  it("D1 のバインド上限内で100人を一度に追加できる", async () => {
    addRoster();
    const add = Array.from({ length: 100 }, (_, i) => `roster-${String(i + 1).padStart(3, "0")}`);
    const res = await call(admin, `${ADMIN}/another/members`, "PATCH", { add });
    expect(res.status).toBe(200);
    expect(
      fixture.sqlite
        .prepare("select count(*) n from group_members where group_id = 'another'")
        .get()?.n,
    ).toBe(101);
  });

  it("ステージ設定は連携と同じエラーを返し、日本時間の日付を期限として保存する", async () => {
    await seedStages();
    const path = `${ADMIN}/another/stages`;
    const settings = [
      { slug: "extra-parent", due_at: "2026-11-25", message: "Evidence text", exempt: true },
      { slug: "extra-child" },
      { slug: "no-prefix" },
    ];
    const valid = await call(admin, path, "PUT", { stages: settings });
    expect(valid.status).toBe(200);
    expect(await valid.json()).toMatchObject({
      stages: [
        { slug: "extra-parent", due_at: "2026-11-25T14:59:59.000Z" },
        { slug: "extra-child" },
        { slug: "no-prefix" },
      ],
    });
    const onlyChild = { stages: [{ slug: "extra-child" }] };
    const invalid = await call(admin, path, "PUT", onlyChild);
    const integrationInvalid = await call(integration, `${INTEGRATION}/stages`, "PUT", onlyChild);
    expect(invalid.status).toBe(400);
    expect(integrationInvalid.status).toBe(400);
    const error = await invalid.json();
    expect(error).toEqual(await integrationInvalid.json());
    expect(error).toMatchObject({
      errors: [{ slug: "extra-parent", code: "parent_not_included" }],
    });
    const bad = await call(admin, path, "PUT", {
      stages: [{ slug: "basic" }, { slug: "extra-child", due_at: "2026-02-30" }],
    });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({
      errors: [
        { slug: "basic", code: "not_granted" },
        { slug: "extra-child", code: "invalid_stage" },
      ],
    });
    expect(
      fixture.sqlite.prepare("select count(*) n from group_stages where group_id = 'another'").get()
        ?.n,
    ).toBe(3);
    const audit = JSON.stringify(
      fixture.sqlite
        .prepare("select metadata from audit_logs where action = 'group_stages_replace'")
        .all(),
    );
    expect(audit).not.toContain("Evidence text");
  });

  it("管理者の進捗は公開オフでも連携 API と同じ形で、ステージとカーソルを共有する", async () => {
    await seedProgress();
    addRoster();
    expect((await call(admin, `${ADMIN}/shared`, "PATCH", { shareProgress: false })).status).toBe(
      200,
    );
    const query = "?stage=extra-parent";
    const staff = await call(admin, `${ADMIN}/shared/progress${query}&at=ignored`);
    const partner = await call(integration, `${INTEGRATION}/progress${query}`);
    expect(staff.status).toBe(200);
    expect(partner.status).toBe(200);
    const page = await json<{
      members: { stages: { slug: string }[] }[];
      next: string;
      hasMore: boolean;
    }>(partner);
    expect(await staff.json()).toEqual(page);
    expect(page.hasMore).toBe(true);
    expect(page.members).toHaveLength(200);
    expect(page.members[0]?.stages.map((stage) => stage.slug)).toEqual(["extra-parent"]);
    const cursor = `&cursor=${encodeURIComponent(page.next)}`;
    const staffNext = await call(admin, `${ADMIN}/shared/progress${query}${cursor}`);
    const partnerNext = await call(integration, `${INTEGRATION}/progress${query}${cursor}`);
    expect(staffNext.status).toBe(200);
    expect(await staffNext.json()).toEqual(await partnerNext.json());
  });
});
