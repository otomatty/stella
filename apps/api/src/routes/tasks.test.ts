import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  TASK_BUNDLE_LIMITS,
  type TaskBundle,
  type TaskBundleResponse,
  type TaskSummary,
} from "@stella/shared/tasks/catalog";
import type { TaskKind } from "@stella/shared/tasks/manifest";
import { submissionFixture } from "@stella/shared/testing/task-submission";
import { getDb } from "../db/client.js";
import {
  enrollments,
  profiles,
  sections,
  stages,
  submissions,
  taskFixedStarts,
  taskFixedStartUses,
  taskPrivate,
  taskProgress,
  taskRevisions,
  tasks,
  tenants,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { submissionsRoute } from "./submissions.js";
import { tasksRoute } from "./tasks.js";

const PRIVATE_MARKER = "PRIVATE_SOLUTION_MARKER_31";
/** 前の課題。後の課題 (fixture) の固定した開始点が、この課題の動く実装を含む。 */
const EARLIER_ID = "dev-env-basics/u01/earlier";
const DEFINITION = {
  submit: { explanation: false, debuggingRecord: false },
  skills: { assesses: ["html"] },
};
const encode = (text: string) => Buffer.from(text).toString("base64");

describe("課題の配布 API (実 SQLite)", () => {
  let database: ReturnType<typeof sqliteD1>;
  let env: Env;
  let db: ReturnType<typeof getDb>;
  let fixture: Awaited<ReturnType<typeof submissionFixture>>;
  let token: string;
  let otherToken: string;
  let fixedStartFiles: Record<string, string>;
  beforeEach(async () => {
    database = sqliteD1();
    env = {
      DB: database.binding,
      AUTH_JWT_SECRET: "test-secret",
      SUBMISSIONS_BUCKET: {
        put: vi.fn(async () => undefined),
        delete: vi.fn(async () => undefined),
      },
    } as unknown as Env;
    db = getDb(env);
    fixture = await submissionFixture();
    fixedStartFiles = {
      ...fixture.bundle.files,
      "index.html": encode("<!doctype html><html><body>前の課題まで動く状態</body></html>\n"),
      "lib/validate.js": encode("export const validate = () => true;\n"),
    };
    await db.batch([
      db.insert(tenants).values([
        { id: "ses", name: "テスト" },
        { id: "other", name: "他社" },
      ]),
      db.insert(profiles).values([
        { id: "learner", tenantId: "ses", displayName: "受講者", role: "student" },
        { id: "outsider", tenantId: "other", displayName: "他社の受講者", role: "student" },
      ]),
      db.insert(stages).values({
        id: "stage",
        tenantId: "ses",
        slug: "dev-env-basics",
        title: "開発環境",
        format: 2,
        status: "published",
      }),
      db.insert(sections).values({ id: "unit", stageId: "stage", title: "入口" }),
      db
        .insert(enrollments)
        .values({ tenantId: "ses", userId: "learner", stageId: "stage", status: "active" }),
      db.insert(tasks).values({
        id: fixture.input.taskId,
        sectionId: "unit",
        title: "課題",
        kind: "basic",
        pattern: "page",
        skills: { uses: [], assesses: ["html"] },
        estimatedMinutes: 10,
        order: 0,
        contentHash: fixture.bundle.contentHash,
        definition: JSON.stringify({
          submit: { explanation: false, debuggingRecord: false },
          skills: { assesses: ["html"] },
        }),
        bundle: JSON.stringify(fixture.bundle),
      }),
      db.insert(taskRevisions).values({
        taskId: fixture.input.taskId,
        contentHash: fixture.bundle.contentHash,
        definition: JSON.stringify({
          submit: { explanation: false, debuggingRecord: false },
          skills: { assesses: ["html"] },
        }),
        bundle: JSON.stringify(fixture.bundle),
      }),
      db.insert(taskPrivate).values({
        taskId: fixture.input.taskId,
        files: JSON.stringify({
          "solution/index.html": encode(PRIVATE_MARKER),
          "explanation.md": encode(PRIVATE_MARKER),
          "review.md": encode(PRIVATE_MARKER),
          "variants/a/index.html": encode(PRIVATE_MARKER),
        }),
      }),
    ]);
    token = await signAccessToken("test-secret", "learner", "learner@example.com");
    otherToken = await signAccessToken("test-secret", "outsider", "outsider@example.com");
  });
  afterEach(() => database.sqlite.close());

  const app = () => mountTestApp(env, tasksRoute, submissionsRoute).app;
  const bundleOf = (as = token) =>
    request(
      app(),
      env,
      `/api/tasks/bundle?${new URLSearchParams({ taskId: fixture.input.taskId })}`,
      {
        token: as,
      },
    );
  const fixedStart = (as = token, taskId = fixture.input.taskId) =>
    request(app(), env, "/api/tasks/fixed-start", {
      method: "POST",
      token: as,
      body: JSON.stringify({ taskId }),
    });
  const addFixedStart = (contentHash = fixture.bundle.contentHash) =>
    db.insert(taskFixedStarts).values({
      taskId: fixture.input.taskId,
      contentHash,
      files: JSON.stringify(fixedStartFiles),
    });
  /** 後の課題 (fixture) の開始点が、前の課題の実装を含むと教材に書いた版にする。 */
  const coverEarlierTask = () =>
    db
      .update(tasks)
      .set({ definition: JSON.stringify({ ...DEFINITION, fixedStart: { covers: [EARLIER_ID] } }) })
      .where(eq(tasks.id, fixture.input.taskId));
  const addEarlierTask = async (kind: TaskKind = "basic") => {
    const earlier = await submissionFixture({ id: EARLIER_ID, title: "前の課題", kind });
    const definition = JSON.stringify(DEFINITION);
    await db.batch([
      db.insert(tasks).values({
        id: EARLIER_ID,
        sectionId: "unit",
        title: "前の課題",
        kind,
        pattern: "page",
        skills: { uses: [], assesses: ["html"] },
        estimatedMinutes: 10,
        order: 0,
        contentHash: earlier.bundle.contentHash,
        definition,
        bundle: JSON.stringify(earlier.bundle),
      }),
      db.insert(taskRevisions).values({
        taskId: EARLIER_ID,
        contentHash: earlier.bundle.contentHash,
        definition,
        bundle: JSON.stringify(earlier.bundle),
      }),
    ]);
    return earlier;
  };
  const submit = (input: { taskId: string }) =>
    request(app(), env, "/api/submissions", {
      method: "POST",
      token,
      body: JSON.stringify({ ...input, support: [] }),
    });
  const submittedOf = (taskId: string) =>
    db
      .select()
      .from(submissions)
      .where(eq(submissions.taskId, taskId))
      .orderBy(submissions.attempt);
  const decoded = (bundle: TaskBundle) =>
    Object.values(bundle.files)
      .map((value) => Buffer.from(value, "base64").toString())
      .join("\n");

  it("配布は公開ファイルだけで、private/ の素材を返さない", async () => {
    const response = await bundleOf();
    expect(response.status, await response.clone().text()).toBe(200);
    const body = await json<TaskBundleResponse>(response);
    expect(Object.keys(body.bundle.files).sort()).toEqual(
      [".stella/task.json", "README.md", "index.html", "tests/config.json"].sort(),
    );
    expect(body.fixedStart).toBe(false);
    expect(JSON.stringify(body)).not.toContain(PRIVATE_MARKER);
    expect(JSON.stringify(body)).not.toContain(encode(PRIVATE_MARKER));
  });

  it("課題一覧は課題文のレッスンを返し、定義・配布物・private/ を返さない", async () => {
    await db
      .update(tasks)
      .set({ lessonId: "task-readme" })
      .where(eq(tasks.id, fixture.input.taskId));
    const response = await request(app(), env, "/api/tasks/for-stage/stage", { token });
    expect(response.status, await response.clone().text()).toBe(200);
    const body = await json<{ tasks: TaskSummary[] }>(response);
    expect(body.tasks).toMatchObject([{ id: fixture.input.taskId, lessonId: "task-readme" }]);
    expect(JSON.stringify(body)).not.toMatch(/bundle|definition|PRIVATE|files/);
  });

  it("bundle に private/ が紛れ込んでいても配らない", async () => {
    await db
      .update(tasks)
      .set({
        bundle: JSON.stringify({
          ...fixture.bundle,
          files: { ...fixture.bundle.files, "private/solution/index.html": encode(PRIVATE_MARKER) },
        }),
      })
      .where(eq(tasks.id, fixture.input.taskId));
    const response = await bundleOf();
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await response.text()).not.toContain(encode(PRIVATE_MARKER));
  });

  it("受講していない・他テナントの受講者には課題も開始点も 404", async () => {
    await addFixedStart();
    expect((await bundleOf(otherToken)).status).toBe(404);
    expect((await fixedStart(otherToken)).status).toBe(404);
    expect(await db.select().from(taskFixedStartUses)).toEqual([]);
  });

  it("固定した開始点は求めたときだけ渡し、使ったことを記録する", async () => {
    await addFixedStart();
    expect((await json<TaskBundleResponse>(await bundleOf())).fixedStart).toBe(true);
    const response = await fixedStart();
    expect(response.status, await response.clone().text()).toBe(200);
    const { bundle } = await json<{ bundle: TaskBundle }>(response);
    expect(bundle.manifest.id).toBe(fixture.input.taskId);
    expect(bundle.contentHash).toBe(fixture.bundle.contentHash);
    expect(Buffer.from(bundle.files["lib/validate.js"], "base64").toString()).toContain("validate");
    expect(decoded(bundle)).not.toContain(PRIVATE_MARKER);
    // 受け取り直しても記録は版ごとに 1 件。
    expect((await fixedStart()).status).toBe(200);
    const uses = await db.select().from(taskFixedStartUses);
    expect(uses).toMatchObject([
      {
        tenantId: "ses",
        userId: "learner",
        taskId: fixture.input.taskId,
        contentHash: fixture.bundle.contentHash,
      },
    ]);
  });

  it("開始点が無い・版が古い課題では渡さず、記録もしない", async () => {
    expect((await fixedStart()).status).toBe(404);
    await addFixedStart("b".repeat(64));
    expect((await json<TaskBundleResponse>(await bundleOf())).fixedStart).toBe(false);
    expect((await fixedStart()).status).toBe(404);
    expect(await db.select().from(taskFixedStartUses)).toEqual([]);
  });

  it("上限を超えた開始点は配らず、利用も記録しない", async () => {
    fixedStartFiles["vendor.js"] = Buffer.alloc(TASK_BUNDLE_LIMITS.fileBytes + 1, 1).toString(
      "base64",
    );
    await addFixedStart();
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await fixedStart()).status).toBe(500);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
    expect(await db.select().from(taskFixedStartUses)).toEqual([]);
  });

  it("受講を終えた受講者には開始点を渡さない (課題は読める)", async () => {
    await addFixedStart();
    await db
      .update(enrollments)
      .set({ status: "completed" })
      .where(eq(enrollments.userId, "learner"));
    expect((await bundleOf()).status).toBe(200);
    expect((await fixedStart()).status).toBe(404);
  });

  it("開始点を受け取った受講者の提出は、手元の記録が無くても支援付きになる", async () => {
    await addFixedStart();
    await coverEarlierTask();
    expect((await fixedStart()).status).toBe(200);
    const response = await submit(fixture.input);
    expect(response.status, await response.clone().text()).toBe(201);
    const [row] = await db.select().from(submissions);
    expect(row.supportLog).toEqual([
      expect.objectContaining({
        kind: "fixed-start",
        detail: "固定した開始点を受け取った記録 (LMS)",
      }),
    ]);
  });

  it("開始点を受け取るとき、開始点が実装を含む前の課題もその時点の教材から記録する", async () => {
    await addFixedStart();
    await coverEarlierTask();
    expect((await fixedStart()).status).toBe(200);
    expect(await db.select().from(taskFixedStartUses)).toMatchObject([
      { taskId: fixture.input.taskId, coveredTaskIds: [EARLIER_ID] },
    ]);
  });

  it("後の課題の開始点を受け取ったあとの前の課題の提出は支援付きになり、前の提出は変えない", async () => {
    const earlier = await addEarlierTask();
    await addFixedStart();
    await coverEarlierTask();
    expect((await submit(earlier.input)).status).toBe(201);
    expect((await fixedStart()).status).toBe(200);
    const response = await submit(earlier.input);
    expect(response.status, await response.clone().text()).toBe(201);
    const [before, after] = await submittedOf(EARLIER_ID);
    expect(before.supportLog).toEqual([]);
    expect(after.supportLog).toEqual([
      expect.objectContaining({
        kind: "fixed-start",
        detail: "後の課題「課題」の固定した開始点を受け取った記録 (LMS)",
      }),
    ]);
  });

  it("前の課題を含まない開始点 (含む課題を記録していない受け取り) では前の課題を変えない", async () => {
    const earlier = await addEarlierTask();
    await addFixedStart();
    expect((await fixedStart()).status).toBe(200);
    expect(await db.select().from(taskFixedStartUses)).toMatchObject([{ coveredTaskIds: null }]);
    expect((await submit(earlier.input)).status).toBe(201);
    const [row] = await submittedOf(EARLIER_ID);
    expect(row.supportLog).toEqual([]);
  });

  it("前の課題が確認A・Bなら、後の課題の開始点を受け取ったあとの提出は AI で確定せず人に回す", async () => {
    const earlier = await addEarlierTask("assessment-a");
    await addFixedStart();
    await coverEarlierTask();
    expect((await fixedStart()).status).toBe(200);
    const response = await submit(earlier.input);
    expect(response.status, await response.clone().text()).toBe(201);
    const [row] = await submittedOf(EARLIER_ID);
    expect(row.aiReviewStatus).toBe("escalated");
    const [progress] = await db
      .select({ status: taskProgress.status })
      .from(taskProgress)
      .where(eq(taskProgress.taskId, EARLIER_ID));
    expect(progress?.status).toBe("instructor-pending");
  });

  it("開始点を使っていない提出の支援記録は変えない", async () => {
    await addFixedStart();
    const response = await request(app(), env, "/api/submissions", {
      method: "POST",
      token,
      body: JSON.stringify({ ...fixture.input, support: [] }),
    });
    expect(response.status, await response.clone().text()).toBe(201);
    const [row] = await db.select().from(submissions);
    expect(row.supportLog).toEqual([]);
  });
});
