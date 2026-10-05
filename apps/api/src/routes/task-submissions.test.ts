import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { submissionFixture } from "@stella/shared/testing/task-submission";
import { getDb } from "../db/client.js";
import {
  auditLogs,
  certificates,
  enrollments,
  lessonProgress,
  lessons,
  notifications,
  profiles,
  sections,
  skillEvidence,
  skills,
  stages,
  submissionReviews,
  submissionFiles,
  submissions,
  taskProgress,
  taskRevisions,
  tasks,
  tenants,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { reviewTaskSubmission } from "../lib/task-submission.js";
import { taskCompletionCounts } from "../lib/task-completion.js";
import { reviewedProgressRows } from "../lib/reviewed-progress.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { lessonProgressRoute } from "./lesson-progress.js";
import { submissionsRoute } from "./submissions.js";

describe("課題の提出から人の合格まで (実 SQLite / R2)", () => {
  let database: ReturnType<typeof sqliteD1>;
  let env: Env;
  let db: ReturnType<typeof getDb>;
  let fixture: Awaited<ReturnType<typeof submissionFixture>>;
  let token: string;
  let instructorToken: string;
  let objects: Map<string, Uint8Array>;
  const caller = {
    id: "teacher",
    tenantId: "ses",
    role: "instructor" as const,
    name: "講師",
    email: null,
  };
  beforeEach(async () => {
    database = sqliteD1();
    objects = new Map();
    env = {
      DB: database.binding,
      AUTH_JWT_SECRET: "test-secret",
      SUBMISSIONS_BUCKET: {
        put: vi.fn(async (key: string, data: Uint8Array) => {
          objects.set(key, data);
        }),
        get: vi.fn(async (key: string) => {
          const data = objects.get(key);
          return data ? { arrayBuffer: async () => data.buffer } : null;
        }),
        delete: vi.fn(async (keys: string | string[]) => {
          for (const key of typeof keys === "string" ? [keys] : keys) objects.delete(key);
        }),
      },
    } as unknown as Env;
    db = getDb(env);
    fixture = await submissionFixture();
    await db.batch([
      db.insert(tenants).values({ id: "ses", name: "テスト" }),
      db.insert(profiles).values([
        { id: "learner", tenantId: "ses", displayName: "受講者", role: "student" },
        { id: "teacher", tenantId: "ses", displayName: "講師", role: "instructor" },
        { id: "other", tenantId: "ses", displayName: "他の受講者", role: "student" },
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
      db.insert(lessons).values({ id: "reading", sectionId: "unit", title: "読む", type: "text" }),
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
          submit: { explanation: true, debuggingRecord: false },
          skills: { assesses: ["html"] },
        }),
        bundle: JSON.stringify(fixture.bundle),
      }),
      db.insert(taskRevisions).values({
        taskId: fixture.input.taskId,
        contentHash: fixture.bundle.contentHash,
        definition: JSON.stringify({
          submit: { explanation: true, debuggingRecord: false },
          skills: { assesses: ["html"] },
        }),
        bundle: JSON.stringify(fixture.bundle),
      }),
      db.insert(skills).values({ id: "html", title: "HTML" }),
      db
        .insert(lessonProgress)
        .values({ tenantId: "ses", userId: "learner", lessonId: "reading", completed: true }),
    ]);
    token = await signAccessToken("test-secret", "learner", "test@example.com");
    instructorToken = await signAccessToken("test-secret", "teacher", "teacher@example.com");
  });
  afterEach(() => database.sqlite.close());
  async function post() {
    const { app } = mountTestApp(env, submissionsRoute);
    return request(app, env, "/api/submissions", {
      method: "POST",
      token,
      body: JSON.stringify(fixture.input),
    });
  }
  async function submit() {
    const response = await post();
    expect(response.status, await response.clone().text()).toBe(201);
    return (await json<{ row: { id: string; attempt: number } }>(response)).row;
  }
  it("全ファイルを R2 に保存し、再提出を新しい試行として残す", async () => {
    const first = await submit();
    const second = await submit();
    expect(first.id).not.toBe(second.id);
    expect([first.attempt, second.attempt]).toEqual([1, 2]);
    expect(objects.size).toBe(2);
    expect((await db.select().from(submissions)).map((s) => s.code)).toEqual(["", ""]);
    expect((await db.select().from(taskProgress))[0].status).toBe("submitted");
    expect((await taskCompletionCounts(db, "stage", ["learner"])).passed.size).toBe(0);
  });
  it("上限の50ファイルをD1の100バインド制限内で保存し、51件目は保存しない", async () => {
    fixture = await submissionFixture({ submit: { files: ["*.html"] } });
    const first = fixture.input.files[0];
    const hash = fixture.input.localResult.files[0];
    fixture.input.files = Array.from({ length: 50 }, (_, i) => ({
      ...first,
      path: `page-${i}.html`,
    }));
    fixture.input.localResult.files = fixture.input.files.map((f) => ({ ...hash, path: f.path }));
    await db
      .update(taskRevisions)
      .set({ bundle: JSON.stringify(fixture.bundle) })
      .where(eq(taskRevisions.taskId, fixture.input.taskId));
    const row = await submit();
    expect(objects.size).toBe(50);
    expect((await db.select().from(submissionFiles)).length).toBe(50);
    const { app } = mountTestApp(env, submissionsRoute);
    const detail = await json<{ row: { files: { path: string; content: string }[] } }>(
      await request(app, env, `/api/submissions/${row.id}`, { token: instructorToken }),
    );
    expect(detail.row.files.length).toBe(50);
    expect(detail.row.files.every((f) => f.content === first.content)).toBe(true);
    fixture.input.files.push({ ...first, path: "extra.html" });
    expect((await post()).status).toBe(400);
    expect(objects.size).toBe(50);
    expect((await db.select().from(submissions)).length).toBe(1);
  });
  it("テスト改変を講師の確認待ちにし、AI からの合格を拒否する", async () => {
    fixture.input.protected[0].sha256 = "b".repeat(64);
    const row = await submit();
    expect((await db.select().from(taskProgress))[0].status).toBe("instructor-pending");
    await expect(reviewTaskSubmission(db, caller, row.id, "pass", "", "ai")).rejects.toMatchObject({
      status: 409,
    });
  });
  it("人の合格はスキル証拠を保存しステージをクリアする", async () => {
    const row = await submit();
    const { app } = mountTestApp(env, submissionsRoute);
    const response = await request(app, env, `/api/submissions/${row.id}`, {
      method: "PATCH",
      token: instructorToken,
      body: JSON.stringify({ verdict: "pass", reviewNotes: "よい実装です" }),
    });
    expect(response.status, await response.clone().text()).toBe(200);
    expect((await db.select().from(taskProgress))[0].status).toBe("passed");
    expect((await db.select().from(skillEvidence))[0]).toMatchObject({
      userId: "learner",
      skillId: "html",
      submissionId: row.id,
      level: "independent",
      assisted: false,
    });
    expect((await db.select().from(submissionReviews))[0].taskContentHash).toBe(
      fixture.bundle.contentHash,
    );
    expect((await db.select().from(certificates)).length).toBe(1);
  });
  it.each(["resubmit", "fail"] as const)(
    "合格から%sへの訂正を通知し、判定が同じ保存や総評だけの編集では通知しない",
    async (corrected) => {
      const row = await submit();
      const { app } = mountTestApp(env, submissionsRoute);
      const patch = async (body: object) => {
        const response = await request(app, env, `/api/submissions/${row.id}`, {
          method: "PATCH",
          token: instructorToken,
          body: JSON.stringify(body),
        });
        expect(response.status, await response.clone().text()).toBe(200);
      };
      const notices = () =>
        db.select().from(notifications).where(eq(notifications.type, "review_completed"));
      await patch({ verdict: "pass" });
      expect((await notices()).length).toBe(1);
      await patch({ verdict: corrected, reviewNotes: "判定を訂正しました" });
      expect((await notices()).length).toBe(2);
      const correction = (await notices()).find((n) => n.payload.verdict === corrected);
      expect(correction?.title).toContain("添削結果が変更されました");
      expect(correction?.payload.submission_id).toBe(row.id);
      expect((await db.select().from(certificates)).length).toBe(0);
      expect((await db.select().from(taskProgress))[0].status).toBe("resubmit");
      await patch({ verdict: corrected, reviewNotes: "同じ判定を保存" });
      await patch({ reviewNotes: "総評だけを編集" });
      expect((await notices()).length).toBe(2);
      await patch({ verdict: "pass" });
      expect((await notices()).length).toBe(3);
    },
  );
  it("支援付きの合格と AI の合格を区別する", async () => {
    fixture.input.support = [{ kind: "hint", at: "2026-10-05T00:00:00Z" }];
    const row = await submit();
    await reviewTaskSubmission(db, caller, row.id, "pass", "", "ai");
    expect((await db.select().from(skillEvidence))[0].level).toBe("supported");
    expect((await db.select().from(taskProgress))[0].status).toBe("ai-passed");
    expect((await taskCompletionCounts(db, "stage", ["learner"])).passed.get("learner")?.size).toBe(
      1,
    );
  });
  it("課題更新後も旧版への提出と過去の合格を保持する", async () => {
    const first = await submit();
    await reviewTaskSubmission(db, caller, first.id, "pass", "旧版で合格");
    await db
      .update(tasks)
      .set({
        contentHash: "b".repeat(64),
        bundle: JSON.stringify({ ...fixture.bundle, contentHash: "b".repeat(64) }),
      })
      .where(eq(tasks.id, fixture.input.taskId));
    const second = await submit();
    await reviewTaskSubmission(db, caller, second.id, "resubmit", "もう一度");
    expect((await db.select().from(taskProgress))[0].status).toBe("passed");
    const { app } = mountTestApp(env, submissionsRoute);
    const detail = await json<{
      row: { task_snapshot: { contentHash: string }; files: { path: string; content: string }[] };
    }>(await request(app, env, `/api/submissions/${first.id}`, { token: instructorToken }));
    expect(detail.row.task_snapshot.contentHash).toBe("a".repeat(64));
    expect(Buffer.from(detail.row.files[0].content, "base64").toString()).toBe(fixture.source);
  });
  it("他人と未受講者は提出コードを取得・提出できない", async () => {
    const row = await submit();
    const { app } = mountTestApp(env, submissionsRoute);
    const other = await signAccessToken("test-secret", "other", "other@example.com");
    expect((await request(app, env, `/api/submissions/${row.id}`, { token: other })).status).toBe(
      403,
    );
    token = other;
    expect((await post()).status).toBe(404);
    expect(
      (
        await request(app, env, `/api/submissions/${row.id}`, {
          token,
          method: "PATCH",
          body: JSON.stringify({ verdict: "pass" }),
        })
      ).status,
    ).toBe(403);
  });
  it("保存失敗・未宣言ファイル・説明不足では提出を作らない", async () => {
    fixture.input.files.push({ path: ".env", content: "" });
    expect((await post()).status).toBe(400);
    fixture.input.files.pop();
    fixture.input.explanation = "";
    expect((await post()).status).toBe(400);
    fixture.input.explanation = "説明";
    vi.mocked(env.SUBMISSIONS_BUCKET?.put)?.mockRejectedValueOnce(new Error("R2 failure"));
    expect((await post()).status).toBe(503);
    expect((await db.select().from(submissions)).length).toBe(0);
    expect(objects.size).toBe(0);
  });
  it("旧コードレッスンは自己申告で完了せず、講師の合格で完了する", async () => {
    await db.insert(lessons).values({
      id: "code",
      sectionId: "unit",
      type: "code",
      title: "演習",
      assignmentId: "exercise",
    });
    const rows = [
      {
        lessonId: "code",
        completed: true,
        lastPage: null,
        viewedPages: [],
        watchedSec: null,
        updatedAtMs: Date.now(),
        countsTowardActivity: true,
        activityDate: "2026-10-05",
      },
    ];
    expect((await reviewedProgressRows(db, "ses", "learner", rows)).rows[0].completed).toBe(false);
    const { app } = mountTestApp(env, submissionsRoute);
    const body = {
      lessonId: "code",
      assignmentId: "exercise",
      stageTitle: "開発環境",
      assignmentTitle: "演習",
      code: "x",
      priority: "normal",
      explanation: "実装と確認の説明",
    };
    const submitted = await request(app, env, "/api/submissions", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
    expect(submitted.status, await submitted.clone().text()).toBe(200);
    const { row } = await json<{ row: { id: string; explanation: string } }>(submitted);
    expect(row.explanation).toBe(body.explanation);
    const retry = await request(app, env, "/api/submissions", {
      method: "POST",
      token,
      body: JSON.stringify({ ...body, explanation: "再確認の説明" }),
    });
    expect((await json<{ row: { explanation: string } }>(retry)).row.explanation).toBe(
      "再確認の説明",
    );
    expect(
      (
        await request(app, env, `/api/submissions/${row.id}`, {
          method: "PATCH",
          token: instructorToken,
          body: JSON.stringify({ verdict: "pass" }),
        })
      ).status,
    ).toBe(200);
    expect(
      (await db.select().from(lessonProgress).where(eq(lessonProgress.lessonId, "code")))[0]
        .completed,
    ).toBe(true);
    expect((await reviewedProgressRows(db, "ses", "learner", rows)).rows[0].completed).toBe(true);
  });

  const progressOf = async (lessonId: string) =>
    (await db.select().from(lessonProgress).where(eq(lessonProgress.lessonId, lessonId)))[0]
      ?.completed;

  /** 旧形式の提出 (受講者が lesson_id / assignment_id を送る) を作り、講師が判定する。 */
  async function legacyReview(
    lessonId: string,
    assignmentId: string,
    verdict: "pass" | "resubmit",
  ) {
    const { app } = mountTestApp(env, submissionsRoute);
    const submitted = await request(app, env, "/api/submissions", {
      method: "POST",
      token,
      body: JSON.stringify({
        lessonId,
        assignmentId,
        stageTitle: "開発環境",
        assignmentTitle: "演習",
        code: "x",
        priority: "normal",
      }),
    });
    expect(submitted.status, await submitted.clone().text()).toBe(200);
    const { row } = await json<{ row: { id: string } }>(submitted);
    const reviewed = await request(app, env, `/api/submissions/${row.id}`, {
      method: "PATCH",
      token: instructorToken,
      body: JSON.stringify({ verdict }),
    });
    expect(reviewed.status, await reviewed.clone().text()).toBe(200);
  }

  it("コードレッスンとその課題の組を指さない旧形式の提出は、判定しても進捗に触らない", async () => {
    await db.batch([
      db.insert(lessons).values({ id: "intro", sectionId: "unit", type: "text", title: "読む2" }),
      db.insert(lessons).values({
        id: "code",
        sectionId: "unit",
        type: "code",
        title: "演習",
        assignmentId: "exercise",
      }),
    ]);
    // 文章レッスンを名乗る提出の合格で完了を作らない。
    await legacyReview("intro", "exercise", "pass");
    expect(await progressOf("intro")).toBeUndefined();
    // 自分で完了した文章レッスンを、名乗っただけの提出の再提出判定で未完了に戻さない。
    await legacyReview("reading", "reading-exercise", "resubmit");
    expect(await progressOf("reading")).toBe(true);
    // 別の課題を名乗る提出の合格では、コードレッスンを完了にしない (同期でも同じ)。
    await legacyReview("code", "other-exercise", "pass");
    expect(await progressOf("code")).toBeUndefined();
    const sync = {
      lessonId: "code",
      completed: true,
      lastPage: null,
      viewedPages: [],
      watchedSec: null,
      updatedAtMs: Date.now(),
      countsTowardActivity: true,
      activityDate: "2026-10-05",
    };
    expect((await reviewedProgressRows(db, "ses", "learner", [sync])).rows[0].completed).toBe(
      false,
    );
    // そのレッスンの課題への提出の合格なら完了する。
    await legacyReview("code", "exercise", "pass");
    expect(await progressOf("code")).toBe(true);
    expect((await reviewedProgressRows(db, "ses", "learner", [sync])).rows[0].completed).toBe(true);
  });

  describe("レビュー必須の前に自己申告で完了したコードレッスン", () => {
    /** 旧講座: コードレッスン 1 つだけ。自己申告の完了で修了証が自動発行済み。 */
    async function selfCompletedStage(issuedBy: string | null = null) {
      await db.batch([
        db.insert(stages).values({
          id: "legacy",
          tenantId: "ses",
          slug: "legacy-ts",
          title: "旧講座",
          status: "published",
        }),
        db.insert(sections).values({ id: "legacy-unit", stageId: "legacy", title: "演習" }),
        db.insert(lessons).values({
          id: "legacy-code",
          sectionId: "legacy-unit",
          type: "code",
          title: "演習",
          assignmentId: "exercise",
        }),
        db.insert(enrollments).values({
          tenantId: "ses",
          userId: "learner",
          stageId: "legacy",
          status: "completed",
          completedAt: new Date("2026-01-01T00:00:00Z"),
        }),
        db.insert(lessonProgress).values({
          tenantId: "ses",
          userId: "learner",
          lessonId: "legacy-code",
          completed: true,
          updatedAt: new Date("2026-01-01T00:00:00Z"),
        }),
        db.insert(certificates).values({
          tenantId: "ses",
          userId: "learner",
          stageId: "legacy",
          certCode: "FLC-2026-0000-0001",
          issuedBy,
          recipientName: "受講者",
          stageTitle: "旧講座",
          tenantName: "テスト",
        }),
      ]);
    }
    async function syncCompleted(updatedAt: string) {
      const { app } = mountTestApp(env, lessonProgressRoute);
      const response = await request(app, env, "/api/lesson-progress", {
        method: "POST",
        token,
        body: JSON.stringify({
          rows: [
            {
              lesson_id: "legacy-code",
              completed: true,
              last_page: null,
              viewed_pages: [],
              watched_sec: null,
              updated_at: updatedAt,
            },
          ],
        }),
      });
      expect(response.status, await response.clone().text()).toBe(200);
    }
    const legacyCertificates = () =>
      db.select().from(certificates).where(eq(certificates.stageId, "legacy"));
    const legacyEnrollment = async () =>
      (await db.select().from(enrollments).where(eq(enrollments.stageId, "legacy")))[0]?.status;

    it("同期で完了が外れたら、自動発行の修了証と受講登録の修了を巻き戻す", async () => {
      await selfCompletedStage();
      await syncCompleted("2026-10-05T00:00:00.000Z");
      expect(await progressOf("legacy-code")).toBe(false);
      expect(await legacyCertificates()).toHaveLength(0);
      expect(await legacyEnrollment()).toBe("active");
      const audits = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.action, "certificate_reclaim"));
      expect(audits).toHaveLength(1);
      expect(audits[0].metadata).toMatchObject({ stage_id: "legacy", user_id: "learner" });
    });

    it("完了が外れない同期 (LWW で負けた・合格がある) では巻き戻さない", async () => {
      await selfCompletedStage();
      // 端末の行が保存済みより古い。完了は保存済みのまま残る。
      await syncCompleted("2025-12-31T00:00:00.000Z");
      expect(await progressOf("legacy-code")).toBe(true);
      expect(await legacyCertificates()).toHaveLength(1);
      // そのレッスンの課題へのレビュー合格があれば、同期しても完了のまま。
      await db.insert(submissions).values({
        tenantId: "ses",
        studentId: "learner",
        lessonId: "legacy-code",
        assignmentId: "exercise",
        stageTitle: "旧講座",
        assignmentTitle: "演習",
        code: "x",
        status: "passed",
        verdict: "pass",
      });
      await syncCompleted("2026-10-05T00:00:00.000Z");
      expect(await progressOf("legacy-code")).toBe(true);
      expect(await legacyCertificates()).toHaveLength(1);
      expect(await legacyEnrollment()).toBe("completed");
    });

    it("staff が発行した修了証は完了が外れても残す", async () => {
      await selfCompletedStage("teacher");
      await syncCompleted("2026-10-05T00:00:00.000Z");
      expect(await progressOf("legacy-code")).toBe(false);
      expect(await legacyCertificates()).toHaveLength(1);
      expect(await legacyEnrollment()).toBe("completed");
    });
  });
});
