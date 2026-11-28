import { GROUP_REACTION_EMOJIS } from "@stella/shared/groups/reactions";
import type { GroupTimeline, GroupTimelineEvent } from "@stella/shared/groups/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db/client.js";
import {
  enrollments,
  integrationClients,
  lessonProgress,
  lessons,
  sections,
  stageGrants,
  stages,
  submissions,
  taskProblemResults,
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
        scopes: ["progress:read", "stages:write", "groups:write"],
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
        // 仲間の進捗はスキルツリーに載るステージだけを返す。カタログの親があると載る。
        parent: "basic",
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
    fixture.sqlite.exec("update groups set share_activity = 1 where id in ('private', 'outside')");
    const res = await call(learner, `${LEARNER}/mine`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({
      groups: [
        {
          id: "another",
          name: "Art Group",
          memberCount: 1,
          shareProgress: true,
          shareActivity: false,
        },
        {
          id: "private",
          name: "Private Group",
          memberCount: 1,
          shareProgress: false,
          shareActivity: true,
        },
        {
          id: "shared",
          name: "Zoo Group",
          memberCount: 3,
          shareProgress: true,
          shareActivity: false,
        },
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
      hasHiddenStages: false,
      stages: [
        { id: "stage-a", title: "Intro" },
        { id: "stage-b", title: "Intro" },
      ],
      members: [
        {
          name: "Amy",
          isMe: false,
          ahead: false,
          stages: [
            { id: "stage-a", percent: 100, cleared: false },
            { id: "stage-b", percent: 0, cleared: false },
          ],
        },
        {
          name: "Amy",
          isMe: false,
          ahead: false,
          stages: [
            { id: "stage-a", percent: 0, cleared: false },
            { id: "stage-b", percent: 0, cleared: false },
          ],
        },
        {
          name: "Zoe",
          isMe: true,
          ahead: false,
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
    const { members, stages, hasHiddenStages } = await json<{
      members: { name: string }[];
      stages: [];
      hasHiddenStages: boolean;
    }>(res);
    expect(stages).toEqual([]);
    expect(hasHiddenStages).toBe(false);
    expect(members).toHaveLength(200);
    expect(members.slice(0, 2).map((member) => member.name)).toEqual(["Amy", "Amy"]);
    expect(members[199]).toEqual({ name: "Roster 198", isMe: false, ahead: false, stages: [] });
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

  it("動画 1 本と提出済みの問題 1 問を 2/2 として数える", async () => {
    await seedStages();
    const db = getDb(env);
    await db.insert(sections).values({ id: "unit-mix", stageId: "stage-a", title: "Mix" });
    await db.insert(lessons).values([
      { id: "lesson-video", sectionId: "unit-mix", title: "動画", type: "video" },
      {
        id: "lesson-problem",
        sectionId: "unit-mix",
        title: "問1",
        type: "text",
        problemTaskId: "task-prob",
        problemId: "q01",
      },
    ]);
    await db.insert(lessonProgress).values({
      userId: "profile-me",
      lessonId: "lesson-video",
      completed: true,
    });
    await db.insert(tasks).values({
      id: "task-prob",
      sectionId: "unit-mix",
      title: "問題",
      kind: "practice",
      pattern: "example",
      estimatedMinutes: 5,
      order: 1,
      contentHash: "hash",
      definition: "{}",
      bundle: "{}",
      active: false,
    });
    await db.insert(taskProblemResults).values({
      userId: "profile-me",
      taskId: "task-prob",
      problemId: "q01",
      contentHash: "hash",
      path: "src/q01.ts",
      code: "code",
      sha256: "sha",
      firstPassedAt: new Date(1),
      updatedAt: new Date(1),
    });
    const res = await call(learner, `${LEARNER}/shared/peers`);
    expect(res.status).toBe(200);
    const { members } = await json<{
      members: { isMe: boolean; stages: { id: string; percent: number; cleared: boolean }[] }[];
    }>(res);
    expect(members.find((member) => member.isMe)?.stages).toContainEqual({
      id: "stage-a",
      percent: 100,
      cleared: false,
    });
  });

  it("見えないステージの題名と割合は返さず、先に進んだ人だけ ahead にする", async () => {
    await seedProgress();
    const db = getDb(env);
    await db.insert(stages).values({
      id: "stage-locked",
      slug: "extra-locked",
      title: "Locked Title XYZ",
      audience: "granted",
      status: "published",
      parent: "extra-parent",
      prerequisites: '["extra-parent"]',
    });
    fixture.sqlite.exec(`
      insert into group_stages (group_id, stage_id) values ('shared', 'stage-locked');
      insert into profiles (id, tenant_id, display_name, email, role, disabled, created_at) values
        ('profile-lesson', 'ses', 'Lesson Person', 'lesson@example.test', 'student', 0, 1),
        ('profile-task', 'ses', 'Task Person', 'task@example.test', 'student', 0, 1);
      insert into group_members (group_id, profile_id, peer_name, joined_at) values
        ('shared', 'profile-lesson', 'Lesson', 1),
        ('shared', 'profile-task', 'Task', 1);
    `);
    await db
      .insert(sections)
      .values({ id: "unit-locked", stageId: "stage-locked", title: "Locked unit" });
    await db.insert(lessons).values({
      id: "lesson-locked",
      sectionId: "unit-locked",
      title: "Locked lesson",
      type: "text",
    });
    await db.insert(lessonProgress).values({
      userId: "profile-lesson",
      lessonId: "lesson-locked",
      completed: true,
    });
    await db.insert(tasks).values({
      id: "task-locked",
      sectionId: "unit-locked",
      title: "task-locked",
      kind: "practice",
      pattern: "example",
      estimatedMinutes: 5,
      order: 1,
      contentHash: "current",
      definition: "{}",
      bundle: "{}",
      active: true,
    });
    await db.insert(taskProgress).values({
      userId: "profile-task",
      taskId: "task-locked",
      status: "passed",
      contentHash: "current",
    });
    await db.insert(enrollments).values({ userId: "profile-peer-a", stageId: "stage-locked" });

    const res = await call(learner, `${LEARNER}/shared/peers`);
    expect(res.status).toBe(200);
    const payload = await res.text();
    expect(payload).not.toContain("stage-locked");
    expect(payload).not.toContain("Locked Title XYZ");
    expect(payload).not.toContain("lesson@example.test");
    expect(payload).not.toContain("task@example.test");
    const body = JSON.parse(payload) as {
      hasHiddenStages: boolean;
      stages: { id: string }[];
      members: {
        name: string;
        isMe: boolean;
        ahead: boolean;
        stages: { id: string; percent: number }[];
      }[];
    };
    expect(body.hasHiddenStages).toBe(true);
    expect(body.stages.map((stage) => stage.id)).toEqual(["stage-a", "stage-b"]);
    for (const member of body.members) {
      expect(member.stages.map((stage) => stage.id)).toEqual(["stage-a", "stage-b"]);
    }
    const enrolled = body.members.find(
      (member) => member.name === "Amy" && member.stages.some((stage) => stage.percent === 100),
    );
    const idle = body.members.find(
      (member) => member.name === "Amy" && member.stages.every((stage) => stage.percent === 0),
    );
    expect(enrolled?.ahead).toBe(true);
    expect(idle?.ahead).toBe(false);
    expect(body.members.find((member) => member.name === "Lesson")?.ahead).toBe(true);
    expect(body.members.find((member) => member.name === "Task")?.ahead).toBe(true);
    expect(body.members.find((member) => member.isMe)?.ahead).toBe(false);
  });

  it("一度に 1 つずつ見せるコースでは、前の章を終えると次の章が見える", async () => {
    const db = getDb(env);
    await db.insert(stages).values([
      {
        id: "stage-lab-0",
        slug: "lab-00",
        title: "Later 00章",
        category: "開発ラボG",
        audience: "granted",
        status: "published",
        prerequisites: "[]",
      },
      {
        id: "stage-lab-1",
        slug: "lab-01",
        title: "Earlier 01章",
        category: "開発ラボG",
        audience: "granted",
        status: "published",
        parent: "lab-00",
        prerequisites: '["lab-00"]',
      },
      {
        id: "stage-lab-2",
        slug: "lab-02",
        title: "Concealed 02章",
        category: "開発ラボG",
        audience: "granted",
        status: "published",
        parent: "lab-01",
        prerequisites: '["lab-01"]',
      },
    ]);
    fixture.sqlite.exec(`
      insert into group_members (group_id, profile_id, peer_name, joined_at)
        values ('another', 'profile-peer-a', 'Mina', 1);
      insert into group_stages (group_id, stage_id) values
        ('another', 'stage-lab-0'), ('another', 'stage-lab-1'), ('another', 'stage-lab-2');
    `);
    await db.insert(enrollments).values({ userId: "profile-peer-a", stageId: "stage-lab-1" });

    const before = await call(learner, `${LEARNER}/another/peers`);
    expect(before.status).toBe(200);
    const beforeText = await before.text();
    expect(beforeText).not.toContain("stage-lab-1");
    expect(beforeText).not.toContain("Earlier 01章");
    expect(beforeText).not.toContain("stage-lab-2");
    expect(beforeText).not.toContain("Concealed 02章");
    const hidden = JSON.parse(beforeText) as {
      hasHiddenStages: boolean;
      stages: { id: string }[];
      members: { name: string; isMe: boolean; ahead: boolean }[];
    };
    expect(hidden.hasHiddenStages).toBe(true);
    expect(hidden.stages.map((stage) => stage.id)).toEqual(["stage-lab-0"]);
    expect(hidden.members.find((member) => member.name === "Mina")?.ahead).toBe(true);
    expect(hidden.members.find((member) => member.isMe)?.ahead).toBe(false);

    await db.insert(enrollments).values({
      userId: "profile-me",
      stageId: "stage-lab-0",
      status: "completed",
      completedAt: new Date(1),
    });
    const after = await call(learner, `${LEARNER}/another/peers`);
    expect(after.status).toBe(200);
    const afterText = await after.text();
    expect(afterText).not.toContain("stage-lab-2");
    expect(afterText).not.toContain("Concealed 02章");
    const opened = JSON.parse(afterText) as {
      hasHiddenStages: boolean;
      stages: { id: string; title: string }[];
      members: { name: string; ahead: boolean; stages: { id: string }[] }[];
    };
    expect(opened.stages.map((stage) => stage.id)).toEqual(["stage-lab-0", "stage-lab-1"]);
    expect(opened.stages.map((stage) => stage.title)).toEqual(["Later 00章", "Earlier 01章"]);
    expect(opened.hasHiddenStages).toBe(true);
    expect(opened.members.find((member) => member.name === "Mina")?.ahead).toBe(false);
    for (const member of opened.members) {
      expect(member.stages.map((stage) => stage.id)).toEqual(["stage-lab-0", "stage-lab-1"]);
    }
  });

  describe("タイムラインとスタンプ", () => {
    const path = `${LEARNER}/shared/timeline`;
    const reactionPath = `${path}/reactions`;
    const readTimeline = async (query = "") => {
      const res = await call(learner, path + query);
      expect(res.status).toBe(200);
      return json<GroupTimeline>(res);
    };
    const stamp = (key: string, emoji: string, token = learner) =>
      call(token, reactionPath, "POST", { key, emoji });

    function shareTimeline() {
      fixture.sqlite.exec("update groups set share_activity = 1 where id = 'shared'");
    }

    it("公開オフ・所属外・不存在は同じ 404。有効な受講者だけが使える", async () => {
      fixture.sqlite.exec("update groups set share_activity = 1 where id = 'outside'");
      for (const id of ["shared", "outside", "unknown"]) {
        for (const [suffix, method] of [
          ["", "GET"],
          ["/reactions", "POST"],
          ["/reactions", "DELETE"],
        ]) {
          const res = await call(
            learner,
            `${LEARNER}/${id}/timeline${suffix}`,
            method,
            method === "GET" ? undefined : { key: "invalid", emoji: "👏" },
          );
          expect(res.status).toBe(404);
          expect(res.headers.get("cache-control")).toBe("no-store");
          expect(await res.json()).toEqual({ error: "Not found" });
        }
      }
      shareTimeline();
      expect((await call(admin, path)).status).toBe(403);
      expect((await call(disabled, path)).status).toBe(403);
    });

    it("参加後の通常の節目だけを出し、見えないステージは日本時間の日付ごとにまとめる", async () => {
      shareTimeline();
      await seedProgress();
      const boundary = Date.parse("2026-11-27T15:00:00Z");
      const db = getDb(env);
      fixture.sqlite.exec(`
        update stages set title = 'Confidential stage' where id = 'stage-b';
        update profiles set hide_group_activity = 1 where id = 'profile-peer-b';
        update group_members set joined_at = ${boundary - 10}
          where group_id = 'shared' and profile_id = 'profile-peer-a';
        update enrollments set status = 'expired', completed_at = null, enrolled_at = ${boundary}
          where user_id = 'profile-me';
        update task_progress set passed_at = ${boundary};
        update task_progress set status = 'passed'
          where user_id = 'profile-me' and task_id = 'task-two';
      `);
      await db.insert(submissions).values({
        studentId: "profile-me",
        taskId: "task-two",
        stageTitle: "Intro",
        assignmentTitle: "task-two",
        code: "",
        status: "passed",
        verdict: "pass",
        reviewSource: "manual",
      });
      await db.insert(enrollments).values([
        {
          userId: "profile-peer-a",
          stageId: "stage-a",
          enrolledAt: new Date(boundary - 11),
          completedAt: new Date(boundary),
        },
        {
          userId: "profile-peer-a",
          stageId: "stage-b",
          enrolledAt: new Date(boundary - 1),
          completedAt: new Date(boundary + 1),
        },
        { userId: "profile-peer-a", stageId: "stage-z", enrolledAt: new Date(boundary) },
        { userId: "profile-peer-a", stageId: "stage-basic", enrolledAt: new Date(boundary) },
        { userId: "profile-peer-b", stageId: "stage-a", enrolledAt: new Date(boundary) },
        { userId: "profile-disabled", stageId: "stage-a", enrolledAt: new Date(boundary) },
        { userId: "profile-admin", stageId: "stage-a", enrolledAt: new Date(boundary) },
      ]);
      await db
        .insert(sections)
        .values({ id: "hidden-unit", stageId: "stage-b", title: "Hidden unit" });
      await db.insert(tasks).values({
        id: "hidden-task",
        sectionId: "hidden-unit",
        title: "Confidential task",
        kind: "practice",
        pattern: "example",
        estimatedMinutes: 5,
        order: 1,
        contentHash: "current",
        definition: "{}",
        bundle: "{}",
      });
      await db.insert(taskProgress).values({
        userId: "profile-peer-a",
        taskId: "hidden-task",
        status: "passed",
        contentHash: "current",
        passedAt: new Date(boundary),
      });

      const { events, nextCursor } = await readTimeline();
      expect(nextCursor).toBeNull();
      expect(
        events.map(({ kind, task, member, date }) => [kind, task?.id, member.name, date]),
      ).toEqual([
        ["ahead", undefined, "Amy", "2026-11-28"],
        ["stage_clear", undefined, "Amy", "2026-11-28"],
        ["stage_start", undefined, "Zoe", "2026-11-28"],
        ["task_pass", "task-one", "Zoe", "2026-11-28"],
        ["task_pass", "task-one", "Amy", "2026-11-28"],
        ["task_pass", "task-two", "Amy", "2026-11-28"],
        ["ahead", undefined, "Amy", "2026-11-27"],
      ]);
      expect(events.filter((event) => event.kind === "ahead")).toEqual(
        ["2026-11-28", "2026-11-27"].map((date) => ({
          key: expect.stringMatching(new RegExp(`^ahead:[a-f0-9]{24}:${date}$`)),
          kind: "ahead",
          date,
          member: { name: "Amy", isMe: false },
          stage: null,
          task: null,
          reactions: [],
        })),
      );
      expect(JSON.stringify(events)).not.toMatch(
        /profile-|@example\.test|stage-b|hidden-task|Confidential|Hidden draft|task-inactive|task-variant|Secret display name/,
      );
    });

    it("同時刻が複数ページをまたいでも、古い節目まで重複や欠落なく返す", async () => {
      shareTimeline();
      await seedStages();
      const at = Date.parse("2026-11-28T00:00:00Z");
      const older = Date.parse("2001-01-01T00:00:00Z");
      addRoster();
      fixture.sqlite.exec(`
        insert into enrollments (id, tenant_id, user_id, stage_id, enrolled_at)
        select id, 'ses', id, 'stage-a', case when id = 'roster-061' then ${older} else ${at} end
        from profiles where id between 'roster-001' and 'roster-061';
      `);
      const first = await readTimeline();
      expect(first.events).toHaveLength(30);
      expect(first.nextCursor).toMatch(/^[A-Za-z0-9_-]+$/);
      const second = await readTimeline(`?cursor=${first.nextCursor}`);
      expect(second.events).toHaveLength(30);
      const third = await readTimeline(`?cursor=${second.nextCursor}`);
      expect(third.events).toHaveLength(1);
      expect(third.events[0]?.date).toBe("2001-01-01");
      expect(third.nextCursor).toBeNull();
      const events = [...first.events, ...second.events, ...third.events];
      expect(new Set(events.map((event) => event.key)).size).toBe(61);
      expect(events.map((event) => event.member.name)).toEqual(
        Array.from({ length: 61 }, (_, i) => `Roster ${String(i + 1).padStart(3, "0")}`),
      );
      for (const cursor of ["", "%%%INVALID", btoa('{"at":1,"count":0}'), btoa("null")]) {
        expect((await call(learner, `${path}?cursor=${encodeURIComponent(cursor)}`)).status).toBe(
          400,
        );
      }
    });

    it("一覧にある他の受講者の節目だけに押せる", async () => {
      shareTimeline();
      await seedStages();
      await getDb(env)
        .insert(enrollments)
        .values([
          { userId: "profile-me", stageId: "stage-a" },
          { userId: "profile-peer-a", stageId: "stage-b" },
        ]);
      const { events } = await readTimeline();
      const own = events.find((event) => event.member.isMe);
      const ahead = events.find((event) => event.kind === "ahead");
      if (!own || !ahead) throw new Error("Expected own start and peer ahead");
      const handle = ahead.key.split(":")[1];
      expect((await stamp(ahead.key, "👎")).status).toBe(400);
      expect((await stamp(own.key, "👏")).status).toBe(400);
      for (const key of [
        `stage_start:${handle}:stage-b`,
        `task_pass:${handle}:missing`,
        "invalid",
      ]) {
        expect((await stamp(key, "👏")).status).toBe(404);
      }
      expect((await stamp(ahead.key, "👏")).status).toBe(200);
      fixture.sqlite.exec(
        "update profiles set hide_group_activity = 1 where id = 'profile-peer-a'",
      );
      expect((await stamp(ahead.key, "👏")).status).toBe(404);
    });

    it("スタンプの上限・冪等性・集計・取り消しを扱う", async () => {
      shareTimeline();
      await seedStages();
      fixture.sqlite.exec(
        "update group_members set peer_name = 'Mina' where group_id = 'shared' and profile_id = 'profile-peer-b'",
      );
      await getDb(env).insert(enrollments).values({ userId: "profile-peer-a", stageId: "stage-a" });
      const event = (await readTimeline()).events[0];
      if (!event) throw new Error("Expected peer start");
      const readReactions = async (res: Response) => {
        expect(res.status).toBe(200);
        return (await json<Pick<GroupTimelineEvent, "reactions">>(res)).reactions;
      };
      expect(await readReactions(await stamp(event.key, "👏"))).toEqual([
        { emoji: "👏", count: 1, names: ["Zoe"], mine: true },
      ]);
      expect(await readReactions(await stamp(event.key, "👏"))).toHaveLength(1);
      const peerToken = await signAccessToken(SECRET, "profile-peer-b", "peer-b@example.test");
      expect((await stamp(event.key, "👏", peerToken)).status).toBe(200);
      for (const emoji of GROUP_REACTION_EMOJIS.slice(1, 10)) {
        expect((await stamp(event.key, emoji)).status).toBe(200);
      }
      expect((await stamp(event.key, "👏")).status).toBe(200);
      expect((await stamp(event.key, GROUP_REACTION_EMOJIS[10])).status).toBe(409);
      const reactions = (await readTimeline()).events[0]?.reactions;
      expect(reactions?.map((reaction) => reaction.emoji)).toEqual(
        GROUP_REACTION_EMOJIS.slice(0, 10),
      );
      expect(reactions?.[0]).toEqual({ emoji: "👏", count: 2, names: ["Zoe", "Mina"], mine: true });

      const removed = await readReactions(
        await call(learner, reactionPath, "DELETE", { key: event.key, emoji: "👏" }),
      );
      expect(removed[0]).toEqual({ emoji: "👏", count: 1, names: ["Mina"], mine: false });
      const query = new URLSearchParams({ key: event.key, emoji: "👏" });
      expect((await call(peerToken, `${reactionPath}?${query}`, "DELETE")).status).toBe(200);
      expect((await readTimeline()).events[0]?.reactions).toHaveLength(9);
      const concurrent = await Promise.all(
        GROUP_REACTION_EMOJIS.slice(10, 12).map((emoji) => stamp(event.key, emoji)),
      );
      expect(concurrent.map((res) => res.status).sort()).toEqual([200, 409]);
      expect((await stamp(event.key, "👏", peerToken)).status).toBe(200);
      fixture.sqlite.exec(
        "delete from group_members where group_id = 'shared' and profile_id = 'profile-peer-b'",
      );
      expect(
        (await readTimeline()).events[0]?.reactions.some((reaction) => reaction.emoji === "👏"),
      ).toBe(false);
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
    expect((await call(admin, `${ADMIN}/shared`, "PATCH", { shareActivity: "true" })).status).toBe(
      400,
    );
    expect((await call(admin, `${ADMIN}/shared`, "PATCH", { shareActivity: true })).status).toBe(
      200,
    );
    expect(await (await call(admin, `${ADMIN}/shared`)).json()).toMatchObject({
      group: { shareProgress: false, shareActivity: true },
    });
    expect((await call(learner, `${LEARNER}/shared/timeline`)).status).toBe(200);
    expect((await call(learner, `${LEARNER}/shared/peers`)).status).toBe(404);
    expect(
      (
        await call(integration, INTEGRATION, "PUT", {
          name: "Renamed by partner",
          shareActivity: false,
          shareProgress: true,
        })
      ).status,
    ).toBe(200);
    expect(await (await call(admin, `${ADMIN}/shared`)).json()).toMatchObject({
      group: { name: "Renamed by partner", shareProgress: false, shareActivity: true },
    });
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
    const updates = fixture.sqlite
      .prepare("select metadata from audit_logs where action = 'group_update'")
      .all()
      .map((row) => JSON.parse(String(row.metadata)));
    expect(updates).toContainEqual({ renamed: false, shareActivity: true });
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
      shareActivity: false,
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

  it("無効化中も開始済みの割り当てをメンバーから外すときに引き継ぐ", async () => {
    await seedStages();
    fixture.sqlite.exec(`
      insert into group_members (group_id, profile_id, joined_at) values
        ('another', 'profile-disabled', 1), ('another', 'profile-admin', 1);
      insert into group_stages (group_id, stage_id) values
        ('another', 'stage-a'), ('another', 'stage-b'), ('another', 'stage-z');
    `);
    const db = getDb(env);
    await db.insert(enrollments).values([
      { userId: "profile-disabled", stageId: "stage-a", status: "active" },
      { userId: "profile-disabled", stageId: "stage-b", status: "completed" },
      { userId: "profile-disabled", stageId: "stage-z", status: "expired" },
      { userId: "profile-admin", stageId: "stage-a", status: "active" },
    ]);

    const response = await call(admin, `${ADMIN}/another/members`, "PATCH", {
      remove: ["profile-disabled", "profile-admin"],
    });
    expect(response.status).toBe(200);
    expect(
      await db
        .select({ profileId: stageGrants.profileId, stageId: stageGrants.stageId })
        .from(stageGrants)
        .orderBy(stageGrants.stageId),
    ).toEqual([
      { profileId: "profile-disabled", stageId: "stage-a" },
      { profileId: "profile-disabled", stageId: "stage-b" },
    ]);
  });

  it.each([
    ["members", "PATCH", { add: ["profile-me"] }],
    ["stages", "PUT", { stages: [] }],
  ] as const)("存在するグループの %s に変更がなくても成功する", async (path, method, body) => {
    expect((await call(admin, `${ADMIN}/another/${path}`, method, body)).status).toBe(200);
  });

  it.each([
    ["members", "PATCH", { add: ["profile-outside"], remove: ["profile-me"] }],
    ["stages", "PUT", { stages: [] }],
    ["stages", "PUT", { stages: [{ slug: "extra-parent" }] }],
  ] as const)(
    "書き込みの直前にグループが削除された %s は 404 で監査を残さない",
    async (path, method, body) => {
      await seedStages();
      const originalBatch = fixture.binding.batch.bind(fixture.binding);
      const batch = vi
        .spyOn(fixture.binding, "batch")
        .mockImplementationOnce(async (statements) => {
          fixture.sqlite.exec("delete from groups where id = 'another'");
          return originalBatch(statements);
        });
      try {
        expect((await call(admin, `${ADMIN}/another/${path}`, method, body)).status).toBe(404);
        expect(batch).toHaveBeenCalledOnce();
        expect(fixture.sqlite.prepare("select action from audit_logs").all()).toEqual([]);
      } finally {
        batch.mockRestore();
      }
    },
  );

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
