import { submissionFixture } from "@stella/shared/testing/task-submission";
import type { AiReviewOutput } from "@stella/shared/review/ai-review";
import type {
  AiPassedRow,
  ReviewCommentTemplate,
  ReviewMetrics,
  SubmissionCheckRecord,
  TaskBoard,
} from "@stella/shared/review/review-desk";
import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db/client.js";
import {
  aiReviewOverrides,
  certificates,
  codingRules,
  discoveryRequests,
  enrollments,
  learnerInstructors,
  lessonProgress,
  lessons,
  notifications,
  profiles,
  sections,
  skillEvidence,
  skills,
  stages,
  submissionChecks,
  submissionReviews,
  submissions,
  taskPrivate,
  taskProgress,
  taskRevisions,
  tasks,
  tenants,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { processAiReviewQueue } from "../lib/ai-review-queue.js";
import { completeJsonSchema } from "../lib/anthropic-complete.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { reviewDeskRoute } from "./review-desk.js";
import { submissionsRoute } from "./submissions.js";

vi.mock("../lib/anthropic-complete.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/anthropic-complete.js")>();
  return { ...actual, completeJsonSchema: vi.fn() };
});
const complete = vi.mocked(completeJsonSchema);

const SOLUTION = "<!doctype html><html><body><h1>はじめてのページ</h1></body></html>\n";

function aiOutput(over: Partial<AiReviewOutput> = {}): AiReviewOutput {
  const evidence = [{ file: "index.html", startLine: 1, endLine: 1 }];
  return {
    rubric: [
      { id: "CR-SCOPE-01", result: "met", evidence, note: "余分な要素がありません" },
      { id: "heading", result: "met", evidence, note: "見出しがあります" },
    ],
    confidence: "high",
    findings: [],
    learnerReply: { message: "提出を確認しました。", goodPoints: [], nextSteps: [] },
    ...over,
  };
}
function answer(output: AiReviewOutput) {
  return {
    text: JSON.stringify(output),
    stopReason: "end_turn" as const,
    model: "review-model",
    usage: {
      inputTokens: 1,
      outputTokens: 1,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
    },
  };
}

describe("講師のレビュー画面 (#34、実 SQLite)", () => {
  let database: ReturnType<typeof sqliteD1>;
  let env: Env;
  let db: ReturnType<typeof getDb>;
  let fixture: Awaited<ReturnType<typeof submissionFixture>>;
  const tokens: Record<string, string> = {};
  let objects: Map<string, Uint8Array>;

  beforeEach(async () => {
    database = sqliteD1();
    objects = new Map();
    complete.mockReset();
    env = {
      DB: database.binding,
      AUTH_JWT_SECRET: "test-secret",
      ANTHROPIC_API_KEY: "test-key",
      SUBMISSIONS_BUCKET: {
        put: vi.fn(async (key: string, data: Uint8Array) => {
          objects.set(key, data);
        }),
        get: vi.fn(async (key: string) => {
          const data = objects.get(key);
          return data ? { arrayBuffer: async () => data.buffer } : null;
        }),
        delete: vi.fn(async () => undefined),
      },
    } as unknown as Env;
    db = getDb(env);
    fixture = await submissionFixture();
    const definition = JSON.stringify({
      kind: "basic",
      submit: { explanation: true, debuggingRecord: false },
      skills: { assesses: ["html"] },
      review: {
        rules: [{ id: "CR-SCOPE-01", required: true }],
        rubric: [{ id: "heading", criterion: "見出しが内容を表している", required: true }],
        escalateWhen: [],
      },
    });
    await db.batch([
      db.insert(tenants).values([
        { id: "ses", name: "テスト" },
        { id: "other", name: "別テナント" },
      ]),
      db.insert(profiles).values([
        { id: "learner", tenantId: "ses", displayName: "受講者A", role: "student" },
        { id: "learner2", tenantId: "ses", displayName: "受講者B", role: "student" },
        { id: "teacher", tenantId: "ses", displayName: "講師", role: "instructor" },
        { id: "boss", tenantId: "ses", displayName: "管理者", role: "admin" },
        { id: "outsider", tenantId: "other", displayName: "別の講師", role: "instructor" },
      ]),
      db.insert(stages).values([
        {
          id: "stage",
          tenantId: "ses",
          slug: "dev-env-basics",
          title: "開発環境",
          format: 2,
          status: "published",
        },
        {
          id: "other-stage",
          tenantId: "other",
          slug: "other-course",
          title: "別の講座",
          format: 2,
          status: "published",
        },
      ]),
      db.insert(sections).values({ id: "unit", stageId: "stage", title: "入口" }),
      db.insert(lessons).values({ id: "reading", sectionId: "unit", title: "読む", type: "text" }),
      db.insert(enrollments).values([
        { tenantId: "ses", userId: "learner", stageId: "stage", status: "active" },
        { tenantId: "ses", userId: "learner2", stageId: "stage", status: "active" },
      ]),
      db.insert(learnerInstructors).values({ learnerId: "learner", instructorId: "teacher" }),
      db.insert(skills).values({ id: "html", title: "HTML" }),
      db.insert(codingRules).values({
        id: "CR-SCOPE-01",
        scope: "common",
        position: 0,
        title: "求められていない処理を残さない",
        statement: "課題で求めていない処理・要素を残していない。",
        appliesTo: "すべて",
        introducedIn: "dev-env-basics",
        contentHash: "f".repeat(64),
      }),
      db.insert(tasks).values({
        id: fixture.input.taskId,
        sectionId: "unit",
        title: "ページを作る",
        kind: "basic",
        pattern: "html-page",
        skills: { uses: [], assesses: ["html"] },
        estimatedMinutes: 10,
        order: 0,
        contentHash: fixture.bundle.contentHash,
        definition,
        bundle: JSON.stringify(fixture.bundle),
      }),
      db.insert(taskRevisions).values({
        taskId: fixture.input.taskId,
        contentHash: fixture.bundle.contentHash,
        definition,
        bundle: JSON.stringify(fixture.bundle),
      }),
      db.insert(taskPrivate).values({
        taskId: fixture.input.taskId,
        files: JSON.stringify({
          "solution/index.html": Buffer.from(SOLUTION).toString("base64"),
        }),
      }),
    ]);
    for (const id of ["learner", "learner2", "teacher", "boss", "outsider"])
      tokens[id] = await signAccessToken("test-secret", id, `${id}@example.com`);
  });
  afterEach(() => database.sqlite.close());

  const app = () => mountTestApp(env, submissionsRoute, reviewDeskRoute).app;
  const call = (path: string, as: string, init: RequestInit = {}) =>
    request(app(), env, path, { ...init, token: tokens[as] });
  const post = (path: string, as: string, body: unknown) =>
    call(path, as, { method: "POST", body: JSON.stringify(body) });

  async function submit(as = "learner", mode: "submit" | "consult" = "submit") {
    const response = await post("/api/submissions", as, { ...fixture.input, mode });
    expect(response.status, await response.clone().text()).toBe(201);
    return (await json<{ row: { id: string } }>(response)).row.id;
  }
  const runAi = () =>
    processAiReviewQueue(env, db, { timeoutMs: 1_000, maxJobs: 5, lockWaitMs: 200 });
  /** AI に判定させて、AI の合格にする。 */
  async function aiPassed(as = "learner", confidence: "high" | "medium" = "high") {
    complete.mockResolvedValue(answer(aiOutput({ confidence })));
    const id = await submit(as);
    expect(await runAi()).toEqual(["applied"]);
    return id;
  }
  const check = (id: string, action: string, comment?: string, as = "teacher") =>
    post(`/api/submissions/${id}/checks`, as, { action, ...(comment ? { comment } : {}) });
  const row = async (id: string) =>
    (await db.select().from(submissions).where(eq(submissions.id, id)))[0];
  const detail = async (id: string, as: string) =>
    (await json<{ row: Record<string, unknown> }>(await call(`/api/submissions/${id}`, as))).row;

  describe("人に回した提出のキュー", () => {
    it("一覧に人に回した理由・確信度・判定案・担当者・講座とパターンを載せる", async () => {
      complete.mockResolvedValue(answer(aiOutput({ confidence: "low" })));
      const escalated = await submit();
      await runAi();
      // AI の下書きがまだ無い相談は、提出の時点で分かる理由 (相談) で分ける。
      const consulted = await submit("learner2", "consult");
      const response = await call("/api/submissions", "teacher");
      expect(response.status).toBe(200);
      const rows = (await json<{ rows: Record<string, unknown>[] }>(response)).rows;
      expect(rows.find((r) => r.id === escalated)).toMatchObject({
        ai_review_status: "escalated",
        route_reasons: ["low-confidence"],
        ai_confidence: "low",
        ai_proposed_verdict: "pass",
        assignee_id: "teacher",
        assignee_name: "講師",
        stage_id: "stage",
        task_pattern: "html-page",
      });
      expect(rows.find((r) => r.id === consulted)).toMatchObject({
        route_reasons: ["consult"],
        ai_confidence: null,
        assignee_id: null,
      });
      // 管理者もキューを読める (画面の入口と同じロール)。
      expect((await call("/api/submissions", "boss")).status).toBe(200);
    });

    it("「まだ確定していない」ときだけの確定は 1 回で、2 回目は 409 にし、判定案と違えば記録する", async () => {
      complete.mockResolvedValue(answer(aiOutput({ confidence: "low" })));
      const id = await submit();
      await runAi();
      const decide = (verdict: string) =>
        call(`/api/submissions/${id}`, "teacher", {
          method: "PATCH",
          body: JSON.stringify({
            verdict,
            reviewNotes: "見出しを直してください",
            expectUndecided: true,
          }),
        });
      const first = await decide("resubmit");
      expect(first.status, await first.clone().text()).toBe(200);
      const second = await decide("pass");
      expect(second.status).toBe(409);
      expect((await row(id))?.verdict).toBe("resubmit");
      // AI の判定案 (合格) と人の判定 (再提出) が食い違ったので、覆した記録を残す。
      expect(await db.select().from(aiReviewOverrides)).toEqual([
        expect.objectContaining({
          submissionId: id,
          source: "final-review",
          aiVerdict: "pass",
          humanVerdict: "resubmit",
          reviewerId: "teacher",
          note: "見出しを直してください",
        }),
      ]);
    });

    it("判定案どおりに確定したら、覆した記録は残さない", async () => {
      complete.mockResolvedValue(answer(aiOutput({ confidence: "low" })));
      const id = await submit();
      await runAi();
      const response = await call(`/api/submissions/${id}`, "teacher", {
        method: "PATCH",
        body: JSON.stringify({ verdict: "pass", expectUndecided: true }),
      });
      expect(response.status).toBe(200);
      expect(await db.select().from(aiReviewOverrides)).toHaveLength(0);
    });
  });

  describe("AI が合格にした提出の事後確認", () => {
    it("確認済みにした記録を残し、staff の詳細にだけ返す", async () => {
      const id = await aiPassed();
      const response = await check(id, "confirm");
      expect(response.status, await response.clone().text()).toBe(200);
      const { checks } = await json<{ checks: SubmissionCheckRecord[] }>(response);
      expect(checks).toEqual([
        expect.objectContaining({
          result: "confirmed",
          reviewerId: "teacher",
          reviewerName: "講師",
        }),
      ]);
      expect((await detail(id, "teacher")).checks).toHaveLength(1);
      const learnerView = await detail(id, "learner");
      expect(learnerView).not.toHaveProperty("checks");
      expect(learnerView.staff_comments).toEqual([]);
      expect((await row(id))?.verdict).toBe("pass");
    });

    it("コメントは判定を変えずに足し、受講者へ通知して受講者の詳細に返す", async () => {
      const id = await aiPassed();
      expect((await check(id, "comment")).status).toBe(400);
      const response = await check(id, "comment", "別解として配列の分割代入も試してみましょう");
      expect(response.status).toBe(200);
      expect(await row(id)).toMatchObject({ verdict: "pass", reviewSource: "ai" });
      const [notice] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.type, "review_comment"));
      expect(notice).toMatchObject({
        userId: "learner",
        body: "別解として配列の分割代入も試してみましょう",
        payload: expect.objectContaining({ submission_id: id }),
      });
      const learnerView = await detail(id, "learner");
      expect(learnerView.staff_comments).toEqual([
        expect.objectContaining({ comment: "別解として配列の分割代入も試してみましょう" }),
      ]);
      // AI で確定した返信は、コメントを足しても受講者に見えたまま。
      expect(learnerView.ai_feedback).toMatchObject({ message: "提出を確認しました。" });
    });

    it("覆すと、この提出の合格・スキルの証拠・初回の合格日・自動の修了を取り消し、理由を知らせる", async () => {
      await db
        .insert(lessonProgress)
        .values({ tenantId: "ses", userId: "learner", lessonId: "reading", completed: true });
      const id = await aiPassed();
      expect(await db.select().from(certificates)).toHaveLength(1);
      expect((await db.select().from(taskProgress))[0]).toMatchObject({ status: "ai-passed" });
      expect((await db.select().from(taskProgress))[0]?.passedAt).not.toBeNull();
      expect((await check(id, "overturn")).status).toBe(400);
      const response = await check(id, "overturn", "見出しが課題の指定と違います");
      expect(response.status, await response.clone().text()).toBe(200);
      expect(await row(id)).toMatchObject({
        verdict: "resubmit",
        reviewSource: "human",
        reviewerId: "teacher",
        reviewNotes: "見出しが課題の指定と違います",
        aiReviewStatus: "confirmed",
      });
      expect(await db.select().from(skillEvidence)).toHaveLength(0);
      const [progress] = await db.select().from(taskProgress);
      expect(progress).toMatchObject({ status: "resubmit", passedAt: null });
      expect(await db.select().from(certificates)).toHaveLength(0);
      expect(await db.select().from(submissionChecks)).toEqual([
        expect.objectContaining({ result: "overturned", comment: "見出しが課題の指定と違います" }),
      ]);
      expect(await db.select().from(aiReviewOverrides)).toEqual([
        expect.objectContaining({
          source: "post-check",
          aiVerdict: "pass",
          humanVerdict: "resubmit",
        }),
      ]);
      const notices = await db
        .select()
        .from(notifications)
        .where(
          and(eq(notifications.userId, "learner"), eq(notifications.type, "review_completed")),
        );
      expect(notices.at(-1)?.body).toContain("見出しが課題の指定と違います");
      // 受講者には AI の返信をもう見せず、覆した理由 (総評) を見せる。
      const learnerView = await detail(id, "learner");
      expect(learnerView).toMatchObject({
        ai_feedback: null,
        review_notes: "見出しが課題の指定と違います",
      });
      // 覆したあとは、どの操作も 409 (二重の確定を防ぐ)。
      expect((await check(id, "overturn", "もう一度")).status).toBe(409);
      expect((await check(id, "confirm")).status).toBe(409);
    });

    it("覆すのはこの提出の合格だけで、同じ課題の後の合格と証拠は残す", async () => {
      const first = await aiPassed();
      // 後の試行が人の合格になっている (出し直して講師が合格にした)。
      const later = new Date(Date.now() + 60_000);
      await db.batch([
        db.insert(submissions).values({
          id: "later",
          tenantId: "ses",
          studentId: "learner",
          taskId: fixture.input.taskId,
          taskContentHash: fixture.bundle.contentHash,
          taskKind: "basic",
          stageTitle: "開発環境",
          assignmentTitle: "ページを作る",
          code: "",
          attempt: 2,
          submittedAt: later,
          verdict: "pass",
          status: "passed",
          reviewSource: "human",
          reviewedAt: later,
        }),
        db.insert(submissionReviews).values({
          submissionId: "later",
          source: "human",
          verdict: "pass",
          notes: "",
          createdAt: later,
        }),
        db.insert(skillEvidence).values({
          tenantId: "ses",
          userId: "learner",
          skillId: "html",
          level: "independent",
          submissionId: "later",
          assisted: false,
        }),
      ]);
      expect((await check(first, "overturn", "見出しが違います")).status).toBe(200);
      expect((await db.select().from(skillEvidence)).map((e) => e.submissionId)).toEqual(["later"]);
      const [progress] = await db.select().from(taskProgress);
      expect(progress?.status).toBe("passed");
      // 初回の合格日は、残っている合格 (後の試行) の日付に付け直す。
      expect(progress?.passedAt?.getTime()).toBe(later.getTime());
    });

    it("一覧は確信度が中を先に、未確認・講座・確信度・受講者・日付・担当で絞り込める", async () => {
      const high = await aiPassed("learner", "high");
      const medium = await aiPassed("learner2", "medium");
      const list = async (query = "", as = "teacher") => {
        const response = await call(`/api/review-desk/ai-passed${query}`, as);
        expect(response.status, await response.clone().text()).toBe(200);
        return (await json<{ rows: AiPassedRow[] }>(response)).rows;
      };
      expect((await list()).map((r) => r.submissionId)).toEqual([medium, high]);
      expect((await list())[0]).toMatchObject({
        studentName: "受講者B",
        stageTitle: "開発環境",
        taskTitle: "ページを作る",
        confidence: "medium",
        verdict: "pass",
        checkCount: 0,
        lastCheck: null,
      });
      await check(high, "confirm");
      expect((await list("?state=unchecked")).map((r) => r.submissionId)).toEqual([medium]);
      expect((await list("?state=checked"))[0]).toMatchObject({
        submissionId: high,
        checkCount: 1,
        lastCheck: { result: "confirmed", reviewerName: "講師" },
      });
      expect((await list("?confidence=high")).map((r) => r.submissionId)).toEqual([high]);
      expect((await list("?learnerId=learner2")).map((r) => r.submissionId)).toEqual([medium]);
      expect((await list("?stageId=stage")).length).toBe(2);
      expect(await list("?from=2999-01-01")).toEqual([]);
      expect((await list("?assigned=mine")).map((r) => r.submissionId)).toEqual([high]);
      expect((await list("", "boss")).length).toBe(2);
      // 別テナントの講師には出さず、受講者は読めない。
      expect(await list("", "outsider")).toEqual([]);
      expect((await call("/api/review-desk/ai-passed", "learner")).status).toBe(403);
      expect((await call("/api/review-desk/ai-passed?confidence=low", "teacher")).status).toBe(400);
      // 別テナントの講師は確認の操作もできない。
      expect((await check(high, "confirm", undefined, "outsider")).status).toBe(404);
    });
  });

  it("しきい値の見直しの数字を出し、境目を超えた行に印を付ける", async () => {
    const medium = await aiPassed("learner", "medium");
    await check(medium, "overturn", "命名が規則に合いません");
    complete.mockResolvedValue(answer(aiOutput({ confidence: "low" })));
    const escalated = await submit("learner2");
    await runAi();
    await call(`/api/submissions/${escalated}`, "teacher", {
      method: "PATCH",
      body: JSON.stringify({ verdict: "pass" }),
    });
    const response = await call("/api/review-desk/metrics?days=30", "boss");
    expect(response.status, await response.clone().text()).toBe(200);
    const metrics = await json<ReviewMetrics>(response);
    expect(metrics.practiceMedium).toEqual([
      expect.objectContaining({
        stageTitle: "開発環境",
        aiPassed: 1,
        checked: 1,
        overturned: 1,
        rate: 1,
        exceeds: true,
      }),
    ]);
    expect(metrics.escalatedByKind).toEqual([
      expect.objectContaining({ key: "basic", decided: 1, passedAsIs: 1, rate: 1, exceeds: true }),
    ]);
    expect(metrics.escalatedByReason).toEqual([
      expect.objectContaining({ key: "low-confidence", decided: 1, passedAsIs: 1 }),
    ]);
    expect(metrics.taskEscalation).toEqual([
      expect.objectContaining({ reviewed: 2, escalated: 1, rate: 0.5, exceeds: true }),
    ]);
    expect((await call("/api/review-desk/metrics?days=0", "teacher")).status).toBe(400);
    expect((await call("/api/review-desk/metrics", "learner")).status).toBe(403);
  });

  describe("同じ課題の提出を並べて見る", () => {
    it("受講者ごとの最新の提出と、項目ごとの「満たさない」を数え、発見教材に回せる", async () => {
      const unmet = aiOutput({ confidence: "high" });
      unmet.rubric[1] = { ...unmet.rubric[1], result: "unmet" } as AiReviewOutput["rubric"][number];
      complete.mockResolvedValue(answer(unmet));
      await submit("learner");
      await runAi();
      const latest = await submit("learner");
      await submit("learner2");
      await runAi();
      const board = (query = "", as = "teacher") =>
        call(
          `/api/review-desk/task-board?taskId=${encodeURIComponent(fixture.input.taskId)}${query}`,
          as,
        );
      const response = await board();
      expect(response.status, await response.clone().text()).toBe(200);
      const loaded = await json<TaskBoard>(response);
      expect(loaded.task).toMatchObject({
        title: "ページを作る",
        pattern: "html-page",
        stageId: "stage",
      });
      expect(loaded.submissions).toHaveLength(2);
      expect(loaded.submissions.find((s) => s.studentId === "learner")?.submissionId).toBe(latest);
      expect(loaded.items).toEqual([
        expect.objectContaining({
          id: "CR-SCOPE-01",
          criterion: "課題で求めていない処理・要素を残していない。",
          met: 2,
        }),
        expect.objectContaining({ id: "heading", unmet: 2 }),
      ]);
      const mine = await json<TaskBoard>(await board("&assigned=mine"));
      expect(mine.submissions.map((s) => s.studentId)).toEqual(["learner"]);

      const route = (rubricId: string, as = "teacher") =>
        post("/api/review-desk/task-board/discovery", as, {
          taskId: fixture.input.taskId,
          rubricId,
        });
      const routed = await route("heading");
      expect(routed.status).toBe(200);
      expect(await db.select().from(discoveryRequests)).toEqual([
        expect.objectContaining({
          tenantId: "ses",
          stageId: "stage",
          origin: "review_common",
          topic: "課題「ページを作る」: 見出しが内容を表している",
        }),
      ]);
      expect((await route("missing")).status).toBe(400);
      // 別テナントの講師には課題ごと見せない。
      expect((await board("", "outsider")).status).toBe(404);
      expect((await route("heading", "outsider")).status).toBe(404);
    });
  });

  describe("コメント集", () => {
    const create = (body: unknown, as = "teacher") => post("/api/review-templates", as, body);

    it("パターンごとに作り、課題に当てはまるものだけを返し、直して消せる", async () => {
      const made = await create({
        stageId: "stage",
        pattern: "html-page",
        ruleId: "CR-SCOPE-01",
        violation: "見出しを飾りに使う",
        body: "見出しは内容の構造を表す要素です。",
      });
      expect(made.status, await made.clone().text()).toBe(201);
      const { template } = await json<{ template: ReviewCommentTemplate }>(made);
      expect(template).toMatchObject({ pattern: "html-page", createdByName: "講師" });
      await create({ stageId: "stage", pattern: "other", violation: "別", body: "別のパターン" });
      await create({ violation: "共通", body: "全講座の定型コメント" }, "boss");
      const listed = async (query: string) =>
        (
          await json<{ templates: ReviewCommentTemplate[] }>(
            await call(`/api/review-templates${query}`, "teacher"),
          )
        ).templates.map((t) => t.violation);
      expect((await listed("?stageId=stage&pattern=html-page")).sort()).toEqual(
        ["共通", "見出しを飾りに使う"].sort(),
      );
      expect(await listed("")).toHaveLength(3);
      const patched = await call(`/api/review-templates/${template.id}`, "teacher", {
        method: "PATCH",
        body: JSON.stringify({ body: "見出しは h1〜h6 で、内容の構造を表します。" }),
      });
      expect((await json<{ template: ReviewCommentTemplate }>(patched)).template.body).toBe(
        "見出しは h1〜h6 で、内容の構造を表します。",
      );
      // 別テナントからは見えず、直せず、消せない。
      expect(await json(await call("/api/review-templates", "outsider"))).toEqual({
        templates: [],
      });
      expect(
        (await call(`/api/review-templates/${template.id}`, "outsider", { method: "DELETE" }))
          .status,
      ).toBe(404);
      expect(
        (await call(`/api/review-templates/${template.id}`, "teacher", { method: "DELETE" }))
          .status,
      ).toBe(200);
      expect(await listed("")).toHaveLength(2);
    });

    it("空の項目・他テナントの講座・受講者からの作成を止める", async () => {
      expect((await create({ violation: "", body: "x" })).status).toBe(400);
      expect((await create({ stageId: "other-stage", violation: "x", body: "y" })).status).toBe(
        400,
      );
      expect((await create({ violation: "x", body: "y" }, "learner")).status).toBe(403);
    });
  });
});
