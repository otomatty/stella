import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { StaffStageTask, StaffStageTasksResponse } from "@stella/shared/tasks/staff-stage";
import { getDb } from "../db/client.js";
import {
  profiles,
  sections,
  stages,
  taskLocalRuns,
  taskProgress,
  tasks,
  tenants,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { staffStagesRoute } from "./staff-stages.js";

const emptyCounts: StaffStageTask["counts"] = {
  started: 0,
  localPassed: 0,
  reviewing: 0,
  waiting: 0,
  resubmit: 0,
  passed: 0,
  submitted: 0,
};

describe("講師・管理者のステージ課題 API (実 SQLite)", () => {
  let database: ReturnType<typeof sqliteD1>;
  let env: Env;
  let db: ReturnType<typeof getDb>;
  beforeEach(async () => {
    database = sqliteD1();
    env = { DB: database.binding, AUTH_JWT_SECRET: "test-secret" } as Env;
    db = getDb(env);
    await db.insert(tenants).values({ id: "ses", name: "テスト" });
    await db.insert(profiles).values([
      { id: "student1", displayName: "受講者1", role: "student" },
      { id: "student2", displayName: "受講者2", role: "student" },
      { id: "instructor", displayName: "講師", role: "instructor" },
      { id: "admin", displayName: "管理者", role: "admin" },
      { id: "platform_admin", displayName: "運営", role: "platform_admin" },
    ]);
    await db.insert(stages).values([
      { id: "stage", slug: "stage", title: "未公開のステージ", status: "draft" },
      { id: "other", slug: "other", title: "別のステージ" },
    ]);
    await db.insert(sections).values([
      { id: "second", stageId: "stage", title: "単元2", order: 2 },
      { id: "first", stageId: "stage", title: "単元1", order: 1 },
      { id: "other", stageId: "other", title: "別の単元" },
    ]);
    await db.insert(tasks).values(
      [
        { id: "third", sectionId: "second", order: 0 },
        { id: "second", sectionId: "first", order: 2 },
        { id: "first", sectionId: "first", order: 1, lessonId: "task-lesson" },
        { id: "variant", sectionId: "first", order: 0, variantOf: "first" },
        { id: "inactive-variant", sectionId: "first", order: 0, variantOf: "first", active: false },
        { id: "inactive", sectionId: "first", order: 0, active: false },
        { id: "other", sectionId: "other", order: 0 },
      ].map((task) => ({
        title: task.id,
        kind: "basic",
        pattern: "page",
        estimatedMinutes: 15,
        contentHash: "hash",
        definition: JSON.stringify({
          support: { hintLevels: 2, solutionUnlock: "after-hints", attempts: 5 },
        }),
        bundle: "PRIVATE_BUNDLE",
        ...task,
      })),
    );
  });
  afterEach(() => database.sqlite.close());

  async function get(userId = "instructor", stageId = "stage") {
    const { app } = mountTestApp(env, staffStagesRoute);
    const token = await signAccessToken("test-secret", userId, `${userId}@example.com`);
    return request(app, env, `http://localhost/api/staff/stages/${stageId}/tasks`, { token });
  }
  async function getTasks() {
    const response = await get();
    expect(response.status).toBe(200);
    return (await json<{ tasks: StaffStageTask[] }>(response)).tasks;
  }

  it("受講者は403、存在しないステージは404", async () => {
    expect((await get("student1")).status).toBe(403);
    const response = await get("instructor", "missing");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "ステージが見つかりません" });
  });

  it.each(["instructor", "admin", "platform_admin"])(
    "%s は受講登録なしで未公開のステージを読める",
    async (role) => {
      expect((await get(role)).status).toBe(200);
    },
  );

  it("単元・課題順に返し、非アクティブ・類題・別ステージを除き、supportと類題数を返す", async () => {
    const result = await getTasks();
    expect(result.map((task) => task.id)).toEqual(["first", "second", "third"]);
    expect(result[0]).toEqual({
      id: "first",
      sectionId: "first",
      title: "first",
      kind: "basic",
      estimatedMinutes: 15,
      lessonId: "task-lesson",
      support: { hintLevels: 2, solutionUnlock: "after-hints" },
      variantCount: 1,
      counts: emptyCounts,
    });
    expect(result.slice(1).map((task) => [task.variantCount, task.lessonId])).toEqual([
      [0, null],
      [0, null],
    ]);
    for (const task of result) {
      expect(task).not.toHaveProperty("definition");
      expect(task).not.toHaveProperty("bundle");
    }
  });

  it.each([
    "{",
    "null",
    "{}",
    '{"support":null}',
    '{"support":{"hintLevels":"2","solutionUnlock":"passed"}}',
    '{"support":{"hintLevels":2}}',
  ])("supportを読めない定義 %s はnull", async (definition) => {
    await database.binding
      .prepare("update tasks set definition = ? where id = 'first'")
      .bind(definition)
      .run();
    expect((await getTasks())[0]?.support).toBeNull();
  });

  it.each([
    ["passed", "ai-passed", { started: 2, passed: 2, submitted: 2 }],
    ["submitted", "instructor-pending", { started: 2, reviewing: 1, waiting: 1, submitted: 2 }],
    ["local-passed", "resubmit", { started: 2, localPassed: 1, resubmit: 1, submitted: 1 }],
  ] as const)(
    "%s / %s: 受講者だけで状態を集計し、二重に開始を数えない",
    async (first, second, expected) => {
      await db.insert(taskProgress).values([
        { userId: "student1", taskId: "first", status: first, contentHash: "hash" },
        { userId: "student2", taskId: "first", status: second, contentHash: "hash" },
        { userId: "instructor", taskId: "first", status: first, contentHash: "hash" },
        { userId: "student1", taskId: "second", status: "not-started", contentHash: "hash" },
      ]);
      await db.insert(taskLocalRuns).values(
        ["student1", "instructor"].map((userId) => ({
          userId,
          taskId: "first",
          contentHash: "hash",
          lastOutcome: "failed" as const,
          firstRunAt: new Date(),
          lastRunAt: new Date(),
        })),
      );
      const result = await getTasks();
      expect(result[0]?.counts).toEqual({ ...emptyCounts, ...expected });
      expect(result[1]?.counts).toEqual(emptyCounts);
    },
  );

  it("手元の確認だけの受講者も開始に数え、講師の確認は数えない", async () => {
    await db.insert(taskLocalRuns).values(
      ["student1", "student2", "instructor"].map((userId) => ({
        userId,
        taskId: "first",
        contentHash: "hash",
        lastOutcome: "failed" as const,
        firstRunAt: new Date(),
        lastRunAt: new Date(),
      })),
    );
    await db
      .insert(taskProgress)
      .values({ userId: "student2", taskId: "first", status: "not-started", contentHash: "hash" });
    expect((await getTasks())[0]?.counts).toEqual({ ...emptyCounts, started: 2 });
  });

  it("前提の slug を同じテナントのステージに照合し、定義順を保ち、不明な slug は落とす", async () => {
    await db.insert(tenants).values({ id: "another-tenant", name: "別テナント" });
    await db.insert(stages).values([
      { id: "first-prereq", slug: "first-prereq", title: "最初の前提" },
      {
        id: "other-tenant-stage",
        tenantId: "another-tenant",
        slug: "foreign",
        title: "別テナントの前提",
      },
      { id: "duplicate-slug", tenantId: "another-tenant", slug: "other", title: "混ざらない前提" },
    ]);
    await database.binding
      .prepare("update stages set prerequisites = ? where id = 'stage'")
      .bind(JSON.stringify(["other", "first-prereq", "missing", "foreign"]))
      .run();
    const response = await get();
    expect(await json<StaffStageTasksResponse>(response)).toMatchObject({
      prerequisites: [
        { id: "other", title: "別のステージ" },
        { id: "first-prereq", title: "最初の前提" },
      ],
    });
  });

  it("課題がなくても前提を返す", async () => {
    await db.delete(tasks);
    await database.binding
      .prepare("update stages set prerequisites = ? where id = 'stage'")
      .bind(JSON.stringify(["other"]))
      .run();
    expect(await json<StaffStageTasksResponse>(await get())).toEqual({
      tasks: [],
      prerequisites: [{ id: "other", title: "別のステージ" }],
    });
  });

  it.each([null, "[]"])("前提が %s なら空配列", async (prerequisites) => {
    await database.binding
      .prepare("update stages set prerequisites = ? where id = 'stage'")
      .bind(prerequisites)
      .run();
    expect((await json<StaffStageTasksResponse>(await get())).prerequisites).toEqual([]);
  });

  it("課題のないステージは空配列", async () => {
    await db.delete(tasks);
    expect(await getTasks()).toEqual([]);
  });
});
