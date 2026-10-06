import Anthropic from "@anthropic-ai/sdk";
import { submissionFixture } from "@stella/shared/testing/task-submission";
import type { AiReviewOutput } from "@stella/shared/review/ai-review";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db/client.js";
import {
  aiReviewJobs,
  aiReviews,
  certificates,
  codingRules,
  enrollments,
  lessonProgress,
  lessons,
  notifications,
  profiles,
  resourceLocks,
  sections,
  skillEvidence,
  skills,
  stages,
  submissions,
  taskPrivate,
  taskPrivateVersions,
  taskProgress,
  taskRevisions,
  taskSupportEvents,
  tasks,
  tenants,
} from "../db/schema.js";
import type { Env } from "../env.js";
import {
  AI_REVIEW_RATE_LIMIT,
  leaseAiReviewJob,
  processAiReviewQueue,
} from "../lib/ai-review-queue.js";
import { completeJsonSchema } from "../lib/anthropic-complete.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { submissionsRoute } from "./submissions.js";

vi.mock("../lib/anthropic-complete.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/anthropic-complete.js")>();
  return { ...actual, completeJsonSchema: vi.fn() };
});
const complete = vi.mocked(completeJsonSchema);

const SOLUTION =
  '<!doctype html><html><head><title>課題</title></head><body><main><h1 class="page-title">はじめてのページ</h1><p class="lead">保存して表示を確かめます</p></main></body></html>\n';
const LEAKY = '`<h1 class="page-title">はじめてのページ</h1><p class="lead">` と書くと完成です。';

function aiOutput(over: Partial<AiReviewOutput> = {}): AiReviewOutput {
  const evidence = [{ file: "index.html", startLine: 1, endLine: 1 }];
  return {
    rubric: [
      { id: "CR-SCOPE-01", result: "met", evidence, note: "余分な要素がありません" },
      { id: "heading", result: "met", evidence, note: "見出しがあります" },
    ],
    confidence: "high",
    findings: [
      { file: "index.html", startLine: 1, endLine: 1, severity: "info", comment: "本文が短めです" },
    ],
    learnerReply: {
      message: "提出を確認しました。",
      goodPoints: ["文書の構造が保たれています"],
      nextSteps: ["段落を足して読みやすくしてみましょう"],
    },
    ...over,
  };
}
function answer(output: unknown, stopReason: "end_turn" | "refusal" | "max_tokens" = "end_turn") {
  return {
    text: typeof output === "string" ? output : JSON.stringify(output),
    stopReason,
    model: "review-model",
    usage: {
      inputTokens: 10,
      outputTokens: 5,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 10,
    },
  };
}

describe("提出の AI 一次レビュー (実 SQLite / R2)", () => {
  let database: ReturnType<typeof sqliteD1>;
  let env: Env;
  let db: ReturnType<typeof getDb>;
  let fixture: Awaited<ReturnType<typeof submissionFixture>>;
  let token: string;
  let instructorToken: string;
  let objects: Map<string, Uint8Array>;

  async function seedTask(kind: string, review: object) {
    fixture = await submissionFixture({ kind: kind as "basic" });
    const definition = JSON.stringify({
      kind,
      submit: { explanation: true, debuggingRecord: false },
      skills: { assesses: ["html"] },
      review,
    });
    await db.batch([
      db.insert(tasks).values({
        id: fixture.input.taskId,
        sectionId: "unit",
        title: "課題",
        kind,
        pattern: "page",
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
          "review.md": Buffer.from("# よくある違反\n\n見出しを飾りに使う。").toString("base64"),
        }),
      }),
    ]);
  }

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
    await db.batch([
      db.insert(tenants).values({ id: "ses", name: "テスト" }),
      db.insert(profiles).values([
        { id: "learner", tenantId: "ses", displayName: "受講者", role: "student" },
        { id: "teacher", tenantId: "ses", displayName: "講師", role: "instructor" },
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
      db.insert(skills).values({ id: "html", title: "HTML" }),
      db
        .insert(lessonProgress)
        .values({ tenantId: "ses", userId: "learner", lessonId: "reading", completed: true }),
      db.insert(codingRules).values([
        {
          id: "CR-SCOPE-01",
          scope: "common",
          position: 0,
          title: "求められていない処理を残さない",
          statement: "課題で求めていない処理・要素を残していない。",
          appliesTo: "すべて",
          introducedIn: "dev-env-basics",
          contentHash: "f".repeat(64),
        },
        {
          id: "DEV-HTML-01",
          scope: "dev-env-basics",
          position: 0,
          title: "内容に合った要素を使う",
          statement: "見出しは h1〜h6 で書いている。",
          appliesTo: "HTML",
          introducedIn: "dev-env-basics",
          contentHash: "e".repeat(64),
        },
      ]),
    ]);
    await seedTask("basic", {
      rules: [{ id: "CR-SCOPE-01", required: true }],
      rubric: [{ id: "heading", criterion: "見出しが内容を表している", required: true }],
      escalateWhen: [],
    });
    token = await signAccessToken("test-secret", "learner", "test@example.com");
    instructorToken = await signAccessToken("test-secret", "teacher", "teacher@example.com");
  });
  afterEach(() => database.sqlite.close());

  async function submit(input = fixture.input) {
    const { app } = mountTestApp(env, submissionsRoute);
    const response = await request(app, env, "/api/submissions", {
      method: "POST",
      token,
      body: JSON.stringify(input),
    });
    expect(response.status, await response.clone().text()).toBe(201);
    return (await json<{ row: { id: string; ai_review_status: string } }>(response)).row;
  }
  async function detail(id: string, as: string) {
    const { app } = mountTestApp(env, submissionsRoute);
    const response = await request(app, env, `/api/submissions/${id}`, { token: as });
    expect(response.status, await response.clone().text()).toBe(200);
    return (await json<{ row: Record<string, unknown> }>(response)).row;
  }
  async function mine() {
    const { app } = mountTestApp(env, submissionsRoute);
    const response = await request(app, env, "/api/submissions/mine", { token });
    return (await json<{ rows: Record<string, unknown>[] }>(response)).rows;
  }
  const run = (now?: () => number) =>
    processAiReviewQueue(env, db, {
      timeoutMs: 1_000,
      maxJobs: 5,
      lockWaitMs: 200,
      ...(now ? { now } : {}),
    });
  const progress = async () => (await db.select().from(taskProgress))[0]?.status;
  const reviews = () => db.select().from(aiReviews);

  it("提出をキューに積み、受講者には「AI が確認中」とだけ出す", async () => {
    const row = await submit();
    expect(row.ai_review_status).toBe("queued");
    expect(await progress()).toBe("submitted");
    const [job] = await db.select().from(aiReviewJobs);
    expect(job).toMatchObject({ submissionId: row.id, state: "queued", attempts: 0 });
    const [listed] = await mine();
    expect(listed).toMatchObject({ ai_review_status: "queued", verdict: null, review_notes: "" });
  });

  it("AI で確定した提出は人の合格と同じく進捗・証拠・通知・修了に流し、受講者には返信と所見だけを返す", async () => {
    complete.mockResolvedValue(answer(aiOutput()));
    const row = await submit();
    expect(await run()).toEqual(["applied"]);
    const [saved] = await db.select().from(submissions).where(eq(submissions.id, row.id));
    expect(saved).toMatchObject({
      verdict: "pass",
      status: "passed",
      reviewSource: "ai",
      aiReviewStatus: "confirmed",
      reviewerId: null,
    });
    expect(saved.reviewNotes).toContain("良かった点");
    expect(await progress()).toBe("ai-passed");
    expect((await db.select().from(skillEvidence))[0]).toMatchObject({ level: "independent" });
    expect(
      (await db.select().from(notifications)).filter((n) => n.type === "review_completed"),
    ).toHaveLength(1);
    expect((await db.select().from(certificates)).length).toBe(1);
    const [review] = await reviews();
    expect(review).toMatchObject({
      outcome: "confirmed",
      routeReasons: [],
      confidence: "high",
      proposedVerdict: "pass",
      model: "review-model",
      disposition: "applied",
      appliedRules: [{ id: "CR-SCOPE-01", required: true, contentHash: "f".repeat(64) }],
    });
    expect(review.promptVersion).toBeTruthy();
    expect(review.thresholdVersion).toBeTruthy();
    expect(review.ruleSetHash).toMatch(/^[a-f0-9]{64}$/);
    expect((await db.select().from(aiReviewJobs))[0].state).toBe("done");

    const learnerView = await detail(row.id, token);
    expect(learnerView.ai_feedback).toMatchObject({
      message: "提出を確認しました。",
      goodPoints: ["文書の構造が保たれています"],
      findings: [{ comment: "本文が短めです" }],
    });
    expect(learnerView).not.toHaveProperty("ai_review");
    const staffView = await detail(row.id, instructorToken);
    expect(staffView.ai_review).toMatchObject({
      outcome: "confirmed",
      findings: expect.any(Array),
    });
  });

  it("キャッシュが効く順に入力を並べ、構造化出力の形を固定する", async () => {
    complete.mockResolvedValue(answer(aiOutput()));
    await submit();
    await run();
    const args = complete.mock.calls[0]?.[0];
    if (!args) throw new Error("AI が呼ばれていない");
    expect(args.schema).toMatchObject({
      required: ["rubric", "confidence", "findings", "learnerReply"],
    });
    expect(args.system.map((b) => [b.text.split("\n")[0], Boolean(b.cache_control)])).toEqual([
      [expect.stringContaining("課題レビュー担当"), false],
      ["# プログラム共通のコーディング規則", true],
      ["# 講座の追加規則 (dev-env-basics)", true],
    ]);
    expect(args.system[1].text).toContain("CR-SCOPE-01");
    expect(args.system[2].text).toContain("DEV-HTML-01");
    const content = args.messages[0]?.content;
    if (!Array.isArray(content)) throw new Error("content が配列でない");
    expect(
      content.map((b) => [
        b.type === "text" ? b.text.split("\n")[0] : "",
        Boolean("cache_control" in b && b.cache_control),
      ]),
    ).toEqual([
      [expect.stringContaining("# 課題文"), false],
      ["# ルーブリック", false],
      [expect.stringContaining("# 解答例"), false],
      ["# 観点とよくある違反", true],
      ["# 提出", false],
    ]);
    const text = content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
    expect(text).toContain("id: CR-SCOPE-01 / 必須 / 規則");
    expect(text).toContain("page-title");
    expect(text).toContain("1| <!doctype html>");
  });

  const encode = (text: string) => Buffer.from(text).toString("base64");
  /** seed が非公開の素材だけを差し替えた状態 (課題の版のハッシュは変わらない)。 */
  const replacePrivate = (solution: string, guide: string) =>
    db.update(taskPrivate).set({
      files: JSON.stringify({
        "solution/index.html": encode(solution),
        "review.md": encode(guide),
      }),
    });
  const promptOf = (call: number) =>
    JSON.stringify([
      complete.mock.calls[call]?.[0].system,
      complete.mock.calls[call]?.[0].messages,
    ]);

  it("素材だけが差し替わっても、提出は受け付けた時点の解答例と観点でレビュー・照合する", async () => {
    complete.mockResolvedValue(
      // 確定するとステージを修了して次の提出ができないので、人に回る結果にする。
      answer(
        aiOutput({
          confidence: "low",
          learnerReply: { message: LEAKY, goodPoints: [], nextSteps: [] },
        }),
      ),
    );
    const first = await submit();
    const [saved] = await db.select().from(submissions).where(eq(submissions.id, first.id));
    expect(saved?.taskPrivateHash).toMatch(/^[a-f0-9]{64}$/);
    await replacePrivate(
      '<section class="hero-banner">差し替え後の解答例</section>\n',
      "差し替え後の観点",
    );
    await run();
    expect(promptOf(0)).toContain("見出しを飾りに使う");
    expect(promptOf(0)).toContain("page-title");
    expect(promptOf(0)).not.toContain("差し替え後");
    // 照合も受け付けた時点の解答例で行う (差し替え後の解答例では当たらない返信)。
    expect((await reviews())[0]?.leakCheck).toMatchObject({ action: "sanitize", hits: [0] });

    // 差し替え後の提出は、差し替え後の素材を読む。
    const second = await submit();
    await run();
    expect(promptOf(1)).toContain("差し替え後の観点");
    expect(promptOf(1)).not.toContain("見出しを飾りに使う");
    const [latest] = await db.select().from(submissions).where(eq(submissions.id, second.id));
    expect(latest?.taskPrivateHash).not.toBe(saved?.taskPrivateHash);
    expect(await db.select().from(taskPrivateVersions)).toHaveLength(2);
  });

  it("今の版と違う課題の版への提出は素材の版を記録せず、AI を呼ばずに人に回す", async () => {
    complete.mockResolvedValue(answer(aiOutput()));
    await db.update(tasks).set({ contentHash: "b".repeat(64) });
    const row = await submit();
    const [saved] = await db.select().from(submissions).where(eq(submissions.id, row.id));
    expect(saved?.taskPrivateHash).toBeNull();
    await run();
    expect(complete).not.toHaveBeenCalled();
    expect((await reviews())[0]).toMatchObject({
      outcome: "escalated",
      failure: "stale-material",
      routeReasons: ["ai-unavailable"],
      learnerReply: null,
    });
    expect(await progress()).toBe("instructor-pending");
  });

  it("記録した素材の版の行が無ければ人に回す", async () => {
    complete.mockResolvedValue(answer(aiOutput()));
    await submit();
    await db.delete(taskPrivateVersions);
    await run();
    expect(complete).not.toHaveBeenCalled();
    expect((await reviews())[0]).toMatchObject({ failure: "stale-material", outcome: "escalated" });
  });

  it("人に回した提出は「講師の確認待ち」にし、受講者向けの API から AI の所見を返さない", async () => {
    const out = aiOutput({ confidence: "medium" });
    out.rubric[1].evidence = [{ file: "missing.html", startLine: 1, endLine: 1 }];
    complete.mockResolvedValue(answer(out));
    const row = await submit();
    expect(await run()).toEqual(["applied"]);
    expect(await progress()).toBe("instructor-pending");
    const [saved] = await db.select().from(submissions).where(eq(submissions.id, row.id));
    expect(saved).toMatchObject({ verdict: null, status: "pending", aiReviewStatus: "escalated" });
    const [review] = await reviews();
    expect(review).toMatchObject({
      outcome: "escalated",
      confidence: "low",
      reportedConfidence: "medium",
    });
    expect(review.routeReasons).toEqual(["low-confidence"]);
    const learnerView = await detail(row.id, token);
    expect(learnerView).toMatchObject({
      ai_feedback: null,
      review_notes: "",
      ai_suggestions: [],
      rubric: [],
      ai_review_status: "escalated",
    });
    expect(JSON.stringify(learnerView)).not.toContain("本文が短めです");
    expect(JSON.stringify(await mine())).not.toContain("本文が短めです");
    const staffView = await detail(row.id, instructorToken);
    expect(staffView.ai_review).toMatchObject({ routeReasons: ["low-confidence"] });
  });

  it("staff の一覧・詳細・保存の応答に、AI 一次レビューが記録済みかを載せる (受講者には載せない)", async () => {
    complete.mockResolvedValue(answer(aiOutput({ confidence: "low" })));
    const row = await submit();
    const { app } = mountTestApp(env, submissionsRoute);
    const staffList = async () =>
      (
        await json<{ rows: { id: string; ai_review_ready: boolean }[] }>(
          await request(app, env, "/api/submissions", { token: instructorToken }),
        )
      ).rows.find((r) => r.id === row.id);
    expect((await staffList())?.ai_review_ready).toBe(false);
    await run();
    expect((await staffList())?.ai_review_ready).toBe(true);
    expect((await detail(row.id, instructorToken)).ai_review_ready).toBe(true);
    const patched = await request(app, env, `/api/submissions/${row.id}`, {
      method: "PATCH",
      token: instructorToken,
      body: JSON.stringify({ reviewNotes: "下書き" }),
    });
    expect((await json<{ row: { ai_review_ready: boolean } }>(patched)).row.ai_review_ready).toBe(
      true,
    );
    expect((await mine())[0]).toMatchObject({ ai_review_ready: false });
    expect((await detail(row.id, token)).ai_review_ready).toBe(false);
  });

  it("統合・確認は確信度が中なら人に回す", async () => {
    await db.delete(tasks);
    await seedTask("assessment-a", {
      rubric: [{ id: "heading", criterion: "見出しが内容を表している", required: true }],
      escalateWhen: [],
    });
    const out = aiOutput({ confidence: "medium" });
    out.rubric = [out.rubric[1]];
    complete.mockResolvedValue(answer(out));
    await submit();
    await run();
    expect((await reviews())[0]).toMatchObject({
      outcome: "escalated",
      routeReasons: ["low-confidence"],
    });
    expect(await progress()).toBe("instructor-pending");
  });

  it("API キーが無ければ AI を呼ばず、AI が判定できなかったとして人に回す", async () => {
    env.ANTHROPIC_API_KEY = "";
    await submit();
    await run();
    expect(complete).not.toHaveBeenCalled();
    expect((await reviews())[0]).toMatchObject({
      outcome: "escalated",
      failure: "unavailable",
      routeReasons: ["ai-unavailable"],
    });
    expect(await progress()).toBe("instructor-pending");
  });

  it.each([
    ["拒否", answer("{}", "refusal"), "refusal"],
    ["打ち切り", answer(aiOutput(), "max_tokens"), "invalid-format"],
    ["形式の誤り", answer({ confidence: "0.9" }), "invalid-format"],
  ] as const)("%s は人に回す", async (_, response, failure) => {
    complete.mockResolvedValue(response);
    await submit();
    await run();
    expect((await reviews())[0]).toMatchObject({ failure, routeReasons: ["ai-unavailable"] });
    expect(await progress()).toBe("instructor-pending");
  });

  it("同じ項目を 2 回返した応答は形の誤りとして人に回す", async () => {
    const out = aiOutput();
    out.rubric.push({ ...out.rubric[1], result: "unmet" } as AiReviewOutput["rubric"][number]);
    complete.mockResolvedValue(answer(out));
    await submit();
    await run();
    expect((await reviews())[0]).toMatchObject({
      outcome: "escalated",
      failure: "invalid-format",
      routeReasons: ["ai-unavailable"],
    });
    expect(await progress()).toBe("instructor-pending");
  });

  it("時間切れは時間を空けてやり直し、上限に達したら人に回す", async () => {
    complete.mockRejectedValue(new Anthropic.APIConnectionTimeoutError());
    await submit();
    let now = Date.now();
    expect(await run(() => now)).toEqual(["retry"]);
    expect(await reviews()).toHaveLength(0);
    expect(await progress()).toBe("submitted");
    // やり直しの時刻までは取らない。
    expect(await run(() => now)).toEqual([]);
    now += 61_000;
    expect(await run(() => now)).toEqual(["retry"]);
    now += 301_000;
    expect(await run(() => now)).toEqual(["applied"]);
    expect(complete).toHaveBeenCalledTimes(3);
    expect((await reviews())[0]).toMatchObject({ failure: "timeout", outcome: "escalated" });
    expect((await db.select().from(aiReviewJobs))[0]).toMatchObject({ state: "done", attempts: 3 });
  });

  it("提出に無いファイル・範囲外の行を指す所見は受講者に見せず、AI の原文は記録に残す", async () => {
    const valid = {
      file: "index.html",
      startLine: 1,
      endLine: 2,
      severity: "info" as const,
      comment: "実在する箇所",
    };
    complete.mockResolvedValue(
      answer(
        aiOutput({
          findings: [
            valid,
            {
              file: "src/missing.js",
              startLine: 1,
              endLine: 3,
              severity: "minor",
              comment: "架空のファイル",
            },
            {
              file: "index.html",
              startLine: 2,
              endLine: 40,
              severity: "minor",
              comment: "範囲外の行",
            },
          ],
        }),
      ),
    );
    const row = await submit();
    expect(await run()).toEqual(["applied"]);
    const [review] = await reviews();
    expect(review).toMatchObject({ outcome: "confirmed", routeReasons: [] });
    expect(review?.findings).toHaveLength(3);
    expect(review?.learnerReply?.findings).toEqual([valid]);
    const learnerView = await detail(row.id, token);
    expect(learnerView.ai_feedback).toMatchObject({ findings: [valid] });
    expect(JSON.stringify(learnerView)).not.toContain("架空のファイル");
    expect(JSON.stringify(learnerView)).not.toContain("範囲外の行");
  });

  it("確認で箇所の誤った所見があれば人に回す", async () => {
    await db.delete(tasks);
    await seedTask("assessment-a", {
      rubric: [{ id: "heading", criterion: "見出しが内容を表している", required: true }],
      escalateWhen: [],
    });
    const out = aiOutput({
      findings: [
        { file: "index.html", startLine: 5, endLine: 5, severity: "info", comment: "範囲外" },
      ],
    });
    out.rubric = out.rubric.slice(1);
    complete.mockResolvedValue(answer(out));
    const row = await submit();
    await run();
    expect((await reviews())[0]).toMatchObject({
      outcome: "escalated",
      routeReasons: ["misplaced-finding"],
    });
    expect((await detail(row.id, token)).ai_feedback).toBeNull();
  });

  it("練習で返信が解答例と重なったら、返信を差し替えて確定する", async () => {
    complete.mockResolvedValue(
      answer(aiOutput({ learnerReply: { message: LEAKY, goodPoints: [], nextSteps: [] } })),
    );
    const row = await submit();
    await run();
    const [review] = await reviews();
    expect(review.outcome).toBe("confirmed");
    expect(review.leakCheck).toMatchObject({ action: "sanitize", hits: [0] });
    const learnerView = await detail(row.id, token);
    expect(JSON.stringify(learnerView)).not.toContain("page-title");
    expect(learnerView.review_notes).not.toContain("page-title");
  });

  it("確認A・Bで返信が解答例と重なったら人に回す", async () => {
    await db.delete(tasks);
    await seedTask("assessment-b", {
      rubric: [{ id: "heading", criterion: "見出しが内容を表している", required: true }],
      escalateWhen: [],
    });
    const out = aiOutput({
      learnerReply: {
        message: "よく書けています。",
        goodPoints: [],
        nextSteps: ['`class="lead">保存して` を参考に'],
      },
    });
    out.rubric = [out.rubric[1]];
    complete.mockResolvedValue(answer(out));
    const row = await submit();
    await run();
    expect((await reviews())[0]).toMatchObject({
      outcome: "escalated",
      routeReasons: ["solution-leak"],
    });
    expect((await detail(row.id, token)).ai_feedback).toBeNull();
  });

  describe("サーバーが記録した支援 (課題の AI チャット・相談、#38)", () => {
    const recordSupport = (createdAt: Date) =>
      db.insert(taskSupportEvents).values({
        tenantId: "ses",
        userId: "learner",
        taskId: fixture.input.taskId,
        kind: "ai-chat",
        createdAt,
      });
    const passAll = () => {
      const out = aiOutput();
      out.rubric = out.rubric.slice(1);
      return answer(out);
    };
    beforeEach(async () => {
      await db.delete(tasks);
      await seedTask("assessment-a", {
        rubric: [{ id: "heading", criterion: "見出しが内容を表している", required: true }],
        escalateWhen: [],
      });
    });

    it("確認Aの前に AI チャットの記録があれば、提出の時点で人に回し、AI は合格にしない", async () => {
      await recordSupport(new Date(Date.now() - 60_000));
      complete.mockResolvedValue(passAll());
      const row = await submit();
      expect(row.ai_review_status).toBe("escalated");
      expect(await progress()).toBe("instructor-pending");
      await run();
      expect((await reviews())[0]).toMatchObject({
        outcome: "escalated",
        routeReasons: ["unallowed-support"],
        proposedVerdict: "pass",
      });
      const [saved] = await db.select().from(submissions).where(eq(submissions.id, row.id));
      expect(saved).toMatchObject({ verdict: null, aiReviewStatus: "escalated" });
      expect((await detail(row.id, token)).ai_feedback).toBeNull();
    });

    it("AI の結果を記録したあとに届いた記録でも、合格にせず人に回す (確認待ちのまま残さない)", async () => {
      const row = await submit();
      expect(row.ai_review_status).toBe("queued");
      const [saved] = await db.select().from(submissions).where(eq(submissions.id, row.id));
      // AI の呼び出し中に、提出より前の時刻の記録が書き込まれた (遅れて届いた記録)。
      complete.mockImplementation(async () => {
        await recordSupport(new Date((saved?.submittedAt.getTime() ?? Date.now()) - 1_000));
        return passAll();
      });
      expect(await run()).toEqual(["applied"]);
      expect((await reviews())[0]).toMatchObject({
        outcome: "escalated",
        routeReasons: ["unallowed-support"],
        disposition: "applied",
      });
      const [after] = await db.select().from(submissions).where(eq(submissions.id, row.id));
      expect(after).toMatchObject({ verdict: null, aiReviewStatus: "escalated" });
      expect(await progress()).toBe("instructor-pending");
      expect(await db.select().from(skillEvidence)).toHaveLength(0);
    });

    it("練習では記録があっても AI で確定でき、証拠は支援付きになる", async () => {
      await db.delete(tasks);
      await seedTask("basic", {
        rubric: [{ id: "heading", criterion: "見出しが内容を表している", required: true }],
        escalateWhen: [],
      });
      await recordSupport(new Date(Date.now() - 60_000));
      complete.mockResolvedValue(passAll());
      const row = await submit();
      expect(row.ai_review_status).toBe("queued");
      expect(await run()).toEqual(["applied"]);
      expect((await reviews())[0]).toMatchObject({ outcome: "confirmed", routeReasons: [] });
      expect(await progress()).toBe("ai-passed");
      expect((await db.select().from(skillEvidence))[0]).toMatchObject({
        level: "supported",
        assisted: true,
      });
    });
  });

  it("相談・照合の食い違いは提出の時点で講師の確認待ちにし、AI は下書きだけを作る", async () => {
    complete.mockResolvedValue(answer(aiOutput()));
    const row = await submit({ ...fixture.input, mode: "consult" });
    expect(row.ai_review_status).toBe("escalated");
    expect(await progress()).toBe("instructor-pending");
    await run();
    const [saved] = await db.select().from(submissions).where(eq(submissions.id, row.id));
    expect(saved).toMatchObject({ verdict: null, aiReviewStatus: "escalated" });
    expect((await reviews())[0]).toMatchObject({
      outcome: "escalated",
      routeReasons: ["consult"],
      proposedVerdict: "pass",
      disposition: "applied",
    });
  });

  it("人が先に確定した提出には、遅れて届いた AI の結果を当てない", async () => {
    complete.mockResolvedValue(answer(aiOutput()));
    const row = await submit();
    const { app } = mountTestApp(env, submissionsRoute);
    const patched = await request(app, env, `/api/submissions/${row.id}`, {
      method: "PATCH",
      token: instructorToken,
      body: JSON.stringify({ verdict: "resubmit", reviewNotes: "見出しを直してください" }),
    });
    expect(patched.status, await patched.clone().text()).toBe(200);
    expect(await run()).toEqual(["superseded"]);
    const [saved] = await db.select().from(submissions).where(eq(submissions.id, row.id));
    expect(saved).toMatchObject({ verdict: "resubmit", reviewSource: "human" });
    expect(await progress()).toBe("resubmit");
    // 一致率の評価に使うので、AI の結果は置き換え済みとして残す。
    expect((await reviews())[0]).toMatchObject({ outcome: "confirmed", disposition: "superseded" });
    expect((await db.select().from(aiReviewJobs))[0].state).toBe("done");
  });

  it("提出のロックを取れなければ結果を残して後で当て、AI を呼び直さない", async () => {
    complete.mockResolvedValue(answer(aiOutput()));
    const row = await submit();
    const lockId = `task-submission:ses:learner:${fixture.input.taskId}`;
    await db
      .insert(resourceLocks)
      .values({ id: lockId, holder: "human", expiresAt: new Date(Date.now() + 60_000) });
    let now = Date.now();
    expect(await run(() => now)).toEqual(["busy"]);
    expect((await reviews())[0]?.disposition).toBeNull();
    expect((await db.select().from(submissions))[0]?.verdict).toBeNull();
    await db.delete(resourceLocks).where(eq(resourceLocks.id, lockId));
    now += 31_000;
    expect(await run(() => now)).toEqual(["applied"]);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(await reviews()).toHaveLength(1);
    const [saved] = await db.select().from(submissions).where(eq(submissions.id, row.id));
    expect(saved?.verdict).toBe("pass");
  });

  it("同じ課題を出し直したら、前の試行の AI レビューを取り消して新しい提出をレビューする", async () => {
    complete.mockResolvedValue(answer(aiOutput()));
    const first = await submit();
    const second = await submit();
    const jobs = await db.select().from(aiReviewJobs);
    expect(jobs.find((j) => j.submissionId === first.id)?.state).toBe("cancelled");
    const [old] = await db.select().from(submissions).where(eq(submissions.id, first.id));
    expect(old.aiReviewStatus).toBe("superseded");
    expect(await run()).toEqual(["applied"]);
    expect(complete).toHaveBeenCalledTimes(1);
    const [latest] = await db.select().from(submissions).where(eq(submissions.id, second.id));
    expect(latest.verdict).toBe("pass");
  });

  it("出し直したら人に回した判定前の試行も置き換え済みにし、確定した試行は残す", async () => {
    const { app } = mountTestApp(env, submissionsRoute);
    const patch = async (id: string, verdict: string) => {
      const response = await request(app, env, `/api/submissions/${id}`, {
        method: "PATCH",
        token: instructorToken,
        body: JSON.stringify({ verdict }),
      });
      expect(response.status, await response.clone().text()).toBe(200);
    };
    const decided = await submit();
    await patch(decided.id, "resubmit");
    const consulted = await submit({ ...fixture.input, mode: "consult" });
    expect(consulted.ai_review_status).toBe("escalated");
    const latest = await submit();
    const status = async (id: string) =>
      (await db.select().from(submissions).where(eq(submissions.id, id)))[0];
    expect(await status(decided.id)).toMatchObject({
      aiReviewStatus: "queued",
      verdict: "resubmit",
    });
    expect(await status(consulted.id)).toMatchObject({
      aiReviewStatus: "superseded",
      verdict: null,
    });
    expect(await status(latest.id)).toMatchObject({ aiReviewStatus: "queued" });
    const jobs = await db.select().from(aiReviewJobs);
    expect(jobs.find((j) => j.submissionId === consulted.id)?.state).toBe("cancelled");
    expect(await progress()).toBe("submitted");
    // 置き換え済みの試行を講師が開いて確定しても、進捗は最新の試行に従う (合格なら合格を残す)。
    await patch(consulted.id, "resubmit");
    expect(await progress()).toBe("submitted");
    expect((await mine()).find((r) => r.id === consulted.id)).toMatchObject({
      ai_review_status: "superseded",
      verdict: "resubmit",
    });
  });

  it("リース中の行は別の処理が取らず、60 秒に 20 回を超えて呼ばない", async () => {
    const row = await submit();
    const now = Date.now();
    const leased = await leaseAiReviewJob(db, { now, leaseMs: 60_000 });
    expect(leased?.submissionId).toBe(row.id);
    expect(await leaseAiReviewJob(db, { now: now + 1_000, leaseMs: 60_000 })).toBeNull();
    // リースの期限が切れたら取り直せる。
    expect(await leaseAiReviewJob(db, { now: now + 61_000, leaseMs: 60_000 })).not.toBeNull();

    // 直近 60 秒に上限ぶんのリースがあれば、待っている行があっても取らない。
    const rows = Array.from({ length: AI_REVIEW_RATE_LIMIT.limit }, (_, i) => `busy-${i}`);
    const later = now + 200_000;
    for (const id of rows) {
      await db.batch([
        db.insert(submissions).values({
          id,
          tenantId: "ses",
          studentId: "learner",
          stageTitle: "開発環境",
          assignmentTitle: "x",
          code: "",
        }),
        db.insert(aiReviewJobs).values({
          submissionId: id,
          tenantId: "ses",
          state: "done",
          nextAttemptAt: new Date(later),
          leasedAt: new Date(later - 30_000),
          enqueuedAt: new Date(later),
        }),
      ]);
    }
    await db
      .update(aiReviewJobs)
      .set({ leaseUntil: null, nextAttemptAt: new Date(later - 1) })
      .where(eq(aiReviewJobs.submissionId, row.id));
    expect(await leaseAiReviewJob(db, { now: later, leaseMs: 60_000 })).toBeNull();
    expect(await leaseAiReviewJob(db, { now: later + 31_000, leaseMs: 60_000 })).not.toBeNull();
  });
});

describe("旧形式の提出も、確定前の下書きは受講者に返さない", () => {
  it("判定前は AI の指摘・総評を隠し、確定後は講師が採用した指摘だけを返す", async () => {
    const database = sqliteD1();
    const env = { DB: database.binding, AUTH_JWT_SECRET: "test-secret" } as unknown as Env;
    const db = getDb(env);
    await db.batch([
      db.insert(tenants).values({ id: "ses", name: "テスト" }),
      db.insert(profiles).values([
        { id: "learner", tenantId: "ses", displayName: "受講者", role: "student" },
        { id: "teacher", tenantId: "ses", displayName: "講師", role: "instructor" },
      ]),
    ]);
    const token = await signAccessToken("test-secret", "learner", "l@example.com");
    const teacher = await signAccessToken("test-secret", "teacher", "t@example.com");
    const { app } = mountTestApp(env, submissionsRoute);
    const created = await request(app, env, "/api/submissions", {
      method: "POST",
      token,
      body: JSON.stringify({
        assignmentId: "exercise",
        stageTitle: "旧講座",
        assignmentTitle: "演習",
        code: "x",
        priority: "normal",
      }),
    });
    const id = (await json<{ row: { id: string } }>(created)).row.id;
    const suggestion = (sid: string, adopted: boolean | null) => ({
      id: sid,
      line: 1,
      severity: "low",
      category: "命名",
      body: `AI の指摘 ${sid}`,
      adopted,
    });
    const patch = (body: object) =>
      request(app, env, `/api/submissions/${id}`, {
        method: "PATCH",
        token: teacher,
        body: JSON.stringify(body),
      });
    await patch({
      aiReady: true,
      aiSuggestions: [suggestion("a", null), suggestion("b", true), suggestion("c", false)],
      reviewNotes: "AI の下書きの総評",
    });
    const before = await json<{ row: Record<string, unknown> }>(
      await request(app, env, `/api/submissions/${id}`, { token }),
    );
    expect(before.row).toMatchObject({ ai_suggestions: [], review_notes: "", rubric: [] });
    await patch({ verdict: "pass", reviewNotes: "講師の総評" });
    const after = await json<{
      rows: { ai_suggestions: { id: string }[]; review_notes: string }[];
    }>(await request(app, env, "/api/submissions/mine", { token }));
    expect(after.rows[0].ai_suggestions.map((s) => s.id)).toEqual(["b"]);
    expect(after.rows[0].review_notes).toBe("講師の総評");
    database.sqlite.close();
  });
});
