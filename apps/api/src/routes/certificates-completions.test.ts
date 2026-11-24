import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type {
  CertificateVerification,
  StageCompletion,
  GradebookEntry,
} from "@stella/shared/cms/types";
import { getDb } from "../db/client.js";
import {
  certificates,
  enrollments,
  lessons,
  lessonProgress,
  profiles,
  quizAttempts,
  quizzes,
  sections,
  stages,
  submissions,
  taskProblemResults,
  taskProblemSteps,
  taskProgress,
  tasks,
  tenants,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import {
  autoCompleteStagesIfMet,
  reclaimAutoCertificatesIfUnmet,
} from "../lib/stage-auto-complete.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { certificatesRoute } from "./certificates.js";
import { lessonProgressRoute } from "./lesson-progress.js";

const SECRET = "certificates-test-secret";
let database: ReturnType<typeof sqliteD1>;
let env: Env;
let db: ReturnType<typeof getDb>;
let app: ReturnType<typeof mountTestApp>["app"];
let token: string;

beforeEach(async () => {
  database = sqliteD1();
  env = { DB: database.binding, AUTH_JWT_SECRET: SECRET } as Env;
  db = getDb(env);
  app = mountTestApp(env, certificatesRoute, lessonProgressRoute).app;
  token = await signAccessToken(SECRET, "learner", "learner@example.test");
  await db.insert(tenants).values({ id: "ses", name: "SES" });
  await db.insert(profiles).values({ id: "learner", role: "student", displayName: "受講者" });
  for (const id of ["active", "completed", "expired", "other"]) {
    await db.insert(stages).values({ id, slug: id, title: id });
  }
});
afterEach(() => database.sqlite.close());
const get = (path: string) => request(app, env, path, { token });

describe("GET /api/certificates/completions", () => {
  it("本人の active な受講登録のステージだけを返す", async () => {
    await db.insert(profiles).values({ id: "other", displayName: "別の受講者" });
    for (const status of ["active", "completed", "expired"] as const) {
      await db.insert(enrollments).values({ userId: "learner", stageId: status, status });
    }
    await db.insert(enrollments).values({ userId: "other", stageId: "other", status: "active" });
    const res = await get("/api/certificates/completions?userId=other");
    expect(res.status).toBe(200);
    const body = await json<{ completions: StageCompletion[] }>(res);
    expect(body.completions).toHaveLength(1);
    expect(body.completions[0]).toMatchObject({ user_id: "learner", stage_id: "active" });
    const single = await json<{ completion: StageCompletion }>(
      await get("/api/certificates/completion/active"),
    );
    expect(single.completion).toEqual(body.completions[0]);
  });
  it("受講登録がなければ空配列", async () => {
    expect(await json(await get("/api/certificates/completions"))).toEqual({ completions: [] });
  });
  it("未認証なら 401", async () => {
    expect((await request(app, env, "/api/certificates/completions")).status).toBe(401);
  });
});

it.each(["passed", "ai-passed"] as const)(
  "問題一覧は課題の %s で完了し、合格の取り消しで未完了に戻る",
  async (status) => {
    const overviewId = "00000000-0000-4000-8000-000000000001";
    const userId = "learner";
    const stageId = "active";
    const input = {
      actor: { id: userId, name: "受講者", role: "student" },
      userId,
      stageIds: [stageId],
    };
    await db.update(stages).set({ format: 2, status: "published" }).where(eq(stages.id, stageId));
    await db.insert(enrollments).values({ userId, stageId });
    await db.insert(profiles).values({ id: "staff", displayName: "管理者", role: "admin" });
    const staffToken = await signAccessToken(SECRET, "staff", "staff@example.test");
    await db.insert(sections).values({ id: "unit", stageId, title: "単元" });
    await db.insert(lessons).values(
      [overviewId, "plain", "step"].map((id) => ({
        id,
        sectionId: "unit",
        title: id,
        type: "text" as const,
      })),
    );
    const task = {
      sectionId: "unit",
      title: "課題",
      kind: "practice",
      pattern: "test",
      estimatedMinutes: 10,
      order: 0,
      contentHash: "current",
      bundle: "{}",
    };
    const problems = [{ id: "q01" }];
    const definition = JSON.stringify({ problems });
    await db.insert(tasks).values([
      { ...task, id: "overview", lessonId: overviewId, definition },
      { ...task, id: "plain", lessonId: "plain", definition: "{}" },
      { ...task, id: "steps", definition: JSON.stringify({ problems, problemSteps: true }) },
      { ...task, id: "inactive", lessonId: "plain", definition, active: false },
      { ...task, id: "variant", lessonId: "plain", definition, variantOf: "overview" },
    ]);
    await db.insert(taskProblemSteps).values({
      taskId: "steps",
      problemId: "q01",
      stepLessonId: "step",
      afterLessonId: "plain",
      position: 0,
    });
    await db.insert(taskProgress).values(
      ["overview", "plain", "steps"].map((taskId): typeof taskProgress.$inferInsert => ({
        userId,
        taskId,
        status: taskId === "overview" ? "local-passed" : "passed",
        contentHash: "previous",
      })),
    );
    await db.insert(lessonProgress).values(
      [overviewId, "step"].map((lessonId) => ({
        userId,
        lessonId,
        completed: true,
        updatedAt: new Date(0),
      })),
    );
    const progress = async () => {
      const { rows } = await json<{ rows: { lesson_id: string; completed: boolean }[] }>(
        await get("/api/lesson-progress"),
      );
      return Object.fromEntries(rows.map((row) => [row.lesson_id, row.completed]));
    };
    const expectCompletion = async (done: number, met: boolean) => {
      const { completion } = await json<{ completion: StageCompletion }>(
        await get("/api/certificates/completion/active"),
      );
      expect(completion).toMatchObject({ total_lessons: 3, completed_lessons: done, met });
      const { gradebook } = await json<{ gradebook: { rows: GradebookEntry[] } }>(
        await request(app, env, "/api/certificates/gradebook/active", { token: staffToken }),
      );
      expect(gradebook.rows[0]?.completion).toEqual(completion);
    };
    expect(await progress()).toEqual({ [overviewId]: false, step: false });
    await expectCompletion(0, false);

    const sync = await request(app, env, "/api/lesson-progress", {
      method: "POST",
      token,
      body: JSON.stringify({
        rows: [{ lesson_id: overviewId, completed: true, updated_at: new Date().toISOString() }],
      }),
    });
    expect(await json(sync)).toMatchObject({ written: 1 });
    const [storedOverview] = await db
      .select()
      .from(lessonProgress)
      .where(eq(lessonProgress.lessonId, overviewId));
    expect(storedOverview?.completed).toBe(false);
    await db.delete(lessonProgress).where(eq(lessonProgress.lessonId, overviewId));

    await db.insert(lessonProgress).values({ userId, lessonId: "plain", completed: true });
    const now = new Date();
    await db.insert(taskProblemResults).values({
      userId,
      taskId: "steps",
      problemId: "q01",
      contentHash: "current",
      path: "src/q01.ts",
      code: "",
      sha256: "hash",
      firstPassedAt: now,
      updatedAt: now,
    });
    await expectCompletion(2, false);
    expect(await autoCompleteStagesIfMet(db, input)).toEqual([]);

    await db.update(taskProgress).set({ status }).where(eq(taskProgress.taskId, "overview"));
    expect(await progress()).toEqual({ [overviewId]: true, plain: true, step: true });
    await expectCompletion(3, true);
    expect(await autoCompleteStagesIfMet(db, input)).toHaveLength(1);
    expect(await db.select().from(enrollments)).toMatchObject([{ status: "completed" }]);
    expect(await db.select().from(certificates)).toMatchObject([{ stageId, revoked: false }]);

    await db.insert(lessonProgress).values({ userId, lessonId: overviewId, completed: true });
    await db
      .update(taskProgress)
      .set({ status: "resubmit" })
      .where(eq(taskProgress.taskId, "overview"));
    expect(await progress()).toEqual({ [overviewId]: false, plain: true, step: true });
    await expectCompletion(2, false);
    await reclaimAutoCertificatesIfUnmet(db, input);
    expect(await db.select().from(enrollments)).toMatchObject([{ status: "active" }]);
    expect(await db.select().from(certificates)).toEqual([]);
  },
);

describe("GET /api/certificates/verify/:code", () => {
  it.each([false, true])("有効なときだけ修了内容を公開する (revoked=%s)", async (revoked) => {
    await db.insert(certificates).values({
      userId: "learner",
      stageId: "active",
      certCode: "CODE",
      recipientName: "受講者",
      issuerName: "STELLA",
      stageTitle: "星",
      revoked,
      criteriaSnapshot: {
        criteria: { require_all_lessons: true },
        completed_lessons: 169,
        total_lessons: 169,
      },
    });
    const res = await request(app, env, "/api/certificates/verify/code");
    expect(res.status).toBe(200);
    const { verification } = await json<{ verification: CertificateVerification }>(res);
    if (revoked)
      expect(verification).toEqual({ valid: false, reason: "revoked", cert_code: "CODE" });
    else
      expect(verification).toMatchObject({
        valid: true,
        achievement: { lessons: { done: 169, total: 169 } },
      });
  });
  it("snapshot が古い形なら achievement は null", async () => {
    await db.insert(certificates).values({
      userId: "learner",
      stageId: "active",
      certCode: "OLD",
      recipientName: "受講者",
      issuerName: "STELLA",
      stageTitle: "星",
      criteriaSnapshot: {},
    });
    const body = await json<{ verification: CertificateVerification }>(
      await request(app, env, "/api/certificates/verify/OLD"),
    );
    expect(body.verification).toMatchObject({ valid: true, achievement: null });
  });
  it("見つからない場合の応答は変わらない", async () => {
    expect(await json(await request(app, env, "/api/certificates/verify/UNKNOWN"))).toEqual({
      verification: { valid: false, reason: "not_found" },
    });
  });
});

it("成績台帳は 100 人超 × 100 レッスン超でもバインド上限内で集計する", async () => {
  await db.insert(profiles).values({ id: "staff", displayName: "講師", role: "admin" });
  const staffToken = await signAccessToken(SECRET, "staff", "staff@example.test");
  await db.insert(sections).values({ id: "section", stageId: "active", title: "単元" });
  for (let i = 0; i < 124; i++) {
    await db
      .insert(lessons)
      .values({ id: `l-${i}`, sectionId: "section", title: "課題", type: "assignment" });
    await db.insert(quizzes).values({ id: `q-${i}`, lessonId: `l-${i}` });
    await db
      .insert(lessonProgress)
      .values({ userId: "learner", lessonId: `l-${i}`, completed: true });
    await db
      .insert(quizAttempts)
      .values({ userId: "learner", quizId: `q-${i}`, score: 1, maxScore: 1, passed: true });
    await db.insert(submissions).values({
      studentId: "learner",
      lessonId: `l-${i}`,
      stageTitle: "星",
      assignmentTitle: "課題",
      code: "",
      verdict: "pass",
    });
  }
  await db.insert(enrollments).values({ userId: "learner", stageId: "active" });
  await db.insert(certificates).values({
    userId: "learner",
    stageId: "active",
    certCode: "CODE",
    recipientName: "受講者",
    issuerName: "STELLA",
    stageTitle: "星",
  });
  for (let i = 0; i < 104; i++) {
    await db.insert(profiles).values({ id: `u-${i}`, displayName: `受講者 ${i}` });
    await db.insert(enrollments).values({ userId: `u-${i}`, stageId: "active" });
  }
  const res = await request(app, env, "/api/certificates/gradebook/active", { token: staffToken });
  expect(res.status).toBe(200);
  const { gradebook } = await json<{ gradebook: { rows: GradebookEntry[] } }>(res);
  expect(gradebook.rows).toHaveLength(105);
  const single = await json<{ completion: StageCompletion }>(
    await get("/api/certificates/completion/active"),
  );
  expect(gradebook.rows.find((row) => row.user_id === "learner")?.completion).toEqual(
    single.completion,
  );
  expect(single.completion).toMatchObject({
    total_lessons: 124,
    completed_lessons: 124,
    total_quizzes: 124,
    passed_quizzes: 124,
    total_assignments: 124,
    passed_assignments: 124,
    cert_code: "CODE",
  });
  expect(gradebook.rows.find((row) => row.user_id === "u-103")?.completion).toMatchObject({
    completed_lessons: 0,
    passed_quizzes: 0,
    passed_assignments: 0,
    has_certificate: false,
  });
});
