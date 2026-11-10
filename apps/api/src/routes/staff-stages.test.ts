import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  staffTaskSourcePath,
  type StaffTaskDetail,
  type StaffStageTask,
  type StaffStageTasksResponse,
} from "@stella/shared/tasks/staff-stage";
import { getDb } from "../db/client.js";
import {
  codingRules,
  taskHelpOpens,
  taskPrivate,
  taskRevisions,
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
      { id: "staff", displayName: "講師", role: "admin" },
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

  async function get(userId = "admin", stageId = "stage") {
    const { app } = mountTestApp(env, staffStagesRoute);
    const token = await signAccessToken("test-secret", userId, `${userId}@example.com`);
    return request(app, env, `http://localhost/api/staff/stages/${stageId}/tasks`, { token });
  }
  async function getTasks() {
    const response = await get();
    expect(response.status).toBe(200);
    return (await json<{ tasks: StaffStageTask[] }>(response)).tasks;
  }

  const detailId = "stage/unit/q01";
  const manifest = {
    schemaVersion: 1,
    id: detailId,
    title: "課題の詳細",
    kind: "basic",
    runner: "node-test",
    submit: { files: ["src/**"] },
  };
  const encode = (text: string) => Buffer.from(text).toString("base64");
  async function prepareDetail(id = detailId, variantOf: string | null = null) {
    await db.insert(tasks).values({
      id,
      title: "課題の詳細",
      sectionId: "first",
      order: 3,
      kind: "basic",
      pattern: "page",
      skills: { uses: ["use"], assesses: ["assess"] },
      estimatedMinutes: 20,
      lessonId: "detail-lesson",
      contentHash: "a".repeat(64),
      variantOf,
      definition: JSON.stringify({
        ...manifest,
        id,
        review: {
          rules: [
            { id: "known", required: true },
            { id: "missing", required: false },
          ],
        },
      }),
      bundle: JSON.stringify({
        manifest: { ...manifest, id },
        contentHash: "a".repeat(64),
        files: { "README.md": encode("# 日本語の課題文\n") },
      }),
    });
  }
  async function getDetail(userId = "admin", taskId: string | null = detailId) {
    const { app } = mountTestApp(env, staffStagesRoute);
    const token = await signAccessToken("test-secret", userId, `${userId}@example.com`);
    return request(
      app,
      env,
      `http://localhost/api/staff/tasks/detail${taskId === null ? "" : `?taskId=${encodeURIComponent(taskId)}`}`,
      { token },
    );
  }
  async function detail(taskId = detailId) {
    const response = await getDetail("staff", taskId);
    expect(response.status).toBe(200);
    return json<StaffTaskDetail>(response);
  }

  it("詳細は受講者403・taskIdなし400・存在しない課題404", async () => {
    expect((await getDetail("student1")).status).toBe(403);
    expect((await getDetail("staff", null)).status).toBe(400);
    expect((await getDetail("staff", "")).status).toBe(400);
    expect((await getDetail()).status).toBe(404);
  });

  it.each(["admin", "platform_admin"])(
    "%s は詳細で課題文・観点・規則だけを本文で読める",
    async (role) => {
      await prepareDetail();
      await db.insert(taskPrivate).values({
        taskId: detailId,
        files: JSON.stringify({
          "review.md": encode("日本語のレビューの観点"),
          "hints.md": encode("SECRET_HINT"),
          "solution/index.js": encode("SECRET_SOLUTION"),
          "explanation.md": encode("SECRET_EXPLANATION"),
          "variants/answer.js": encode("SECRET_VARIANT"),
        }),
      });
      await db.insert(codingRules).values({
        id: "known",
        scope: "common",
        position: 0,
        title: "規則名",
        statement: "規則の本文",
        appliesTo: "all",
        introducedIn: "first",
        contentHash: "hash",
      });
      const response = await getDetail(role);
      expect(response.status).toBe(200);
      const result = await json<StaffTaskDetail>(response);
      expect(result).toMatchObject({
        task: {
          id: detailId,
          title: "課題の詳細",
          kind: "basic",
          pattern: "page",
          skills: { uses: ["use"], assesses: ["assess"] },
          estimatedMinutes: 20,
          lessonId: "detail-lesson",
          contentHash: "a".repeat(64),
          parentTaskId: null,
          manifest: { ...manifest, checks: { lint: false, format: false }, protected: [] },
        },
        stage: { id: "stage", slug: "stage", title: "未公開のステージ" },
        section: { id: "first", title: "単元1" },
        sourcePath: "packages/content/stages/stage/modules/unit/tasks/q01",
        readme: "# 日本語の課題文\n",
        reviewNotes: "日本語のレビューの観点",
        codingRules: [
          { id: "known", title: "規則名", statement: "規則の本文", required: true },
          { id: "missing", title: "missing", statement: "", required: false },
        ],
        counts: emptyCounts,
        helpOpens: { hints: [], solution: 0, explanation: 0 },
        revisions: [],
        variants: [],
      });
      const serialized = JSON.stringify(result);
      for (const text of [
        "SECRET_HINT",
        "SECRET_SOLUTION",
        "SECRET_EXPLANATION",
        "SECRET_VARIANT",
      ]) {
        expect(serialized).not.toContain(text);
        expect(serialized).not.toContain(encode(text));
      }
    },
  );

  it.each([undefined, 1])(
    "元の定義のenvironmentがID文字列でも配布物のmanifestを返す (schemaVersion=%s)",
    async (schemaVersion) => {
      await prepareDetail();
      const rubric = [{ id: "heading", criterion: "見出しを確認する", required: true }];
      const bundledManifest = {
        ...manifest,
        title: "配布物の題",
        environment: { id: "node-test-01", node: { min: "22.12.0" } },
        protected: ["tests/**"],
        checks: { lint: true, format: true },
      };
      await database.binding
        .prepare("update tasks set definition = ?, bundle = ? where id = ?")
        .bind(
          JSON.stringify({
            ...manifest,
            schemaVersion,
            environment: "node-test-01",
            submit: { ...manifest.submit, explanation: true, debuggingRecord: true },
            review: { rubric, rules: [{ id: "missing", required: true }] },
            support: { hintLevels: 2, solutionUnlock: "after-hints" },
          }),
          JSON.stringify({ manifest: bundledManifest, contentHash: "a".repeat(64), files: {} }),
          detailId,
        )
        .run();
      const result = await detail();
      expect(result.task.manifest).toEqual(bundledManifest);
      expect(result.rubric).toEqual(rubric);
      expect(result.codingRules).toEqual([
        { id: "missing", title: "missing", statement: "", required: true },
      ]);
      expect(result.submission).toEqual({ explanation: true, debuggingRecord: true });
      expect(result.support).toEqual({ hintLevels: 2, solutionUnlock: "after-hints" });
    },
  );

  it.each([
    null,
    [],
    "元の定義",
    1,
    { review: null, submit: null, support: null },
    { review: { rules: {}, rubric: "unknown" }, submit: "unknown", support: [] },
    {
      review: {
        rules: [null, {}, { id: "rule", required: "yes" }],
        rubric: [null, {}, { id: "item", criterion: 1, required: true }],
      },
      submit: { explanation: "yes", debuggingRecord: {} },
      support: { hintLevels: "2", solutionUnlock: "passed" },
    },
  ])("定義の形が違っても読めない追加情報は空・nullにする (%j)", async (definition) => {
    await prepareDetail();
    await database.binding
      .prepare("update tasks set definition = ? where id = ?")
      .bind(JSON.stringify(definition), detailId)
      .run();
    const result = await detail();
    expect(result.task.manifest).toMatchObject(manifest);
    expect(result.rubric).toEqual([]);
    expect(result.codingRules).toEqual([]);
    expect(result.submission).toEqual({ explanation: false, debuggingRecord: false });
    expect(result.support).toBeNull();
  });

  it("定義がJSONとして壊れている場合は500を返す", async () => {
    await prepareDetail();
    await database.binding
      .prepare("update tasks set definition = ? where id = ?")
      .bind("{broken", detailId)
      .run();
    const response = await getDetail();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "課題の定義が不正です" });
  });

  it("詳細と一覧で受講者だけのcountsが一致し、素材の開封は版をまたいでも人数で数える", async () => {
    await prepareDetail();
    await db.insert(taskProgress).values([
      { userId: "student1", taskId: detailId, status: "passed", contentHash: "hash" },
      { userId: "student2", taskId: detailId, status: "instructor-pending", contentHash: "hash" },
      ...["admin", "platform_admin"].map((userId) => ({
        userId,
        taskId: detailId,
        status: "passed" as const,
        contentHash: "hash",
      })),
    ]);
    await db.insert(taskLocalRuns).values(
      ["student1", "staff"].map((userId) => ({
        userId,
        taskId: detailId,
        contentHash: "hash",
        lastOutcome: "failed" as const,
        firstRunAt: new Date(),
        lastRunAt: new Date(),
      })),
    );
    const helpRows = ["student1", "student2", "staff", "admin", "platform_admin"].flatMap(
      (userId) =>
        ["old", "new"].flatMap((contentHash) => [
          {
            userId,
            taskId: detailId,
            item: "hint" as const,
            level: 1,
            contentHash,
            privateHash: "private",
          },
          {
            userId,
            taskId: detailId,
            item: "solution" as const,
            level: 0,
            contentHash,
            privateHash: "private",
          },
          {
            userId,
            taskId: detailId,
            item: "explanation" as const,
            level: 0,
            contentHash,
            privateHash: "private",
          },
        ]),
    );
    for (const row of helpRows) await db.insert(taskHelpOpens).values(row);
    await db.insert(taskHelpOpens).values({
      userId: "student1",
      taskId: detailId,
      item: "hint",
      level: 2,
      contentHash: "new",
      privateHash: "private",
    });
    const result = await detail();
    expect(result.counts).toEqual({
      ...emptyCounts,
      started: 2,
      waiting: 1,
      passed: 1,
      submitted: 2,
    });
    expect(result.counts).toEqual((await getTasks()).find((task) => task.id === detailId)?.counts);
    expect(result.helpOpens).toEqual({
      hints: [
        { level: 1, learners: 2 },
        { level: 2, learners: 1 },
      ],
      solution: 2,
      explanation: 2,
    });
  });

  it("版は新しい順、類題は非アクティブも返し、前後は単元と課題の順で類題を除く", async () => {
    await prepareDetail();
    await prepareDetail("stage/unit/variant", detailId);
    await prepareDetail("stage/unit/inactive-variant", detailId);
    await database.binding
      .prepare("update tasks set active = 0 where id = ?")
      .bind("stage/unit/inactive-variant")
      .run();
    await db.insert(taskRevisions).values([
      {
        taskId: detailId,
        contentHash: "old",
        definition: "{}",
        bundle: "{}",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
      {
        taskId: detailId,
        contentHash: "new",
        definition: "{}",
        bundle: "{}",
        createdAt: new Date("2026-02-01T00:00:00Z"),
      },
      { taskId: "first", contentHash: "other", definition: "{}", bundle: "{}" },
    ]);
    const result = await detail();
    expect(result.revisions).toEqual([
      { contentHash: "new", createdAt: "2026-02-01T00:00:00.000Z" },
      { contentHash: "old", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    expect(result.variants).toEqual([
      { id: "stage/unit/inactive-variant", title: "課題の詳細", active: false },
      { id: "stage/unit/variant", title: "課題の詳細", active: true },
    ]);
    expect(result.neighbors).toEqual({
      previous: { id: "second", title: "second" },
      next: { id: "third", title: "third" },
    });
    const variant = await detail("stage/unit/inactive-variant");
    expect(variant.task.parentTaskId).toBe(detailId);
    expect(variant.neighbors).toEqual({ previous: null, next: null });
  });

  it("前後の課題は無効な課題を飛ばす", async () => {
    await prepareDetail();
    await database.binding
      .prepare("update tasks set active = 0 where id in ('second', 'third')")
      .run();
    expect((await detail()).neighbors).toEqual({
      previous: { id: "first", title: "first" },
      next: null,
    });
  });

  it("配布用manifestにないルーブリック・提出要件・支援方針だけを元の定義から返す", async () => {
    await prepareDetail();
    const rubric = [{ id: "heading", criterion: "見出しが指定した内容を表す", required: true }];
    await database.binding
      .prepare("update tasks set definition = ? where id = ?")
      .bind(
        JSON.stringify({
          ...manifest,
          submit: { ...manifest.submit, explanation: true, debuggingRecord: true },
          review: { rubric: rubric.map((item) => ({ ...item, private: "SECRET_RUBRIC" })) },
          support: { hintLevels: 2, solutionUnlock: "after-hints" },
        }),
        detailId,
      )
      .run();
    const result = await detail();
    expect(result.rubric).toEqual(rubric);
    expect(result.submission).toEqual({ explanation: true, debuggingRecord: true });
    expect(result.support).toEqual({ hintLevels: 2, solutionUnlock: "after-hints" });
    expect(result.task.manifest).not.toHaveProperty("review");
    expect(JSON.stringify(result)).not.toContain("SECRET_RUBRIC");
  });

  it("README・非公開素材・規則がなければnullと空配列、並びの両端はnull", async () => {
    await prepareDetail();
    await database.binding
      .prepare("update tasks set definition = ?, bundle = ? where id = ?")
      .bind(
        JSON.stringify(manifest),
        JSON.stringify({ manifest, contentHash: "a".repeat(64), files: {} }),
        detailId,
      )
      .run();
    await database.binding.prepare("update tasks set active = 0 where id = ?").bind(detailId).run();
    const result = await detail();
    expect(result.readme).toBeNull();
    expect(result.reviewNotes).toBeNull();
    expect(result.codingRules).toEqual([]);
    expect(result.rubric).toEqual([]);
    expect(result.submission).toEqual({ explanation: false, debuggingRecord: false });
    expect(result.support).toBeNull();
    await database.binding.prepare("delete from tasks where id <> ?").bind(detailId).run();
    expect((await detail()).neighbors).toEqual({ previous: null, next: null });
  });

  it("受講者は403、存在しないステージは404", async () => {
    expect((await get("student1")).status).toBe(403);
    const response = await get("staff", "missing");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "ステージが見つかりません" });
  });

  it.each(["admin", "platform_admin"])(
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
        { userId: "staff", taskId: "first", status: first, contentHash: "hash" },
        { userId: "student1", taskId: "second", status: "not-started", contentHash: "hash" },
      ]);
      await db.insert(taskLocalRuns).values(
        ["student1", "staff"].map((userId) => ({
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
      ["student1", "student2", "staff"].map((userId) => ({
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

describe("課題のリポジトリ内のパス", () => {
  it("3 要素の課題 ID を課題フォルダーにする", () => {
    expect(
      staffTaskSourcePath(
        "claude-developer-foundations/m5-tools-and-mcp/q01-tool-loop",
        "claude-developer-foundations",
      ),
    ).toBe(
      "packages/content/stages/claude-developer-foundations/modules/m5-tools-and-mcp/tasks/q01-tool-loop",
    );
  });
  it.each([
    "stage",
    "stage/unit",
    "stage/unit/task/variant",
    "other/unit/task",
    "stage/../task",
    "stage/unit/",
    "stage/unit/a\\b",
    "stage/unit/あ",
  ])("形が合わない %s はステージに戻す", (id) => {
    expect(staffTaskSourcePath(id, "stage")).toBe("packages/content/stages/stage");
  });
});
