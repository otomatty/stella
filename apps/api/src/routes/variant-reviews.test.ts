import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { addStudyDays, studyDateStartMs, toStudyDate } from "@stella/shared/study/activity";
import type { TaskSummary } from "@stella/shared/tasks/catalog";
import type { TaskKind } from "@stella/shared/tasks/manifest";
import type { TodayVariantReview, VariantStockSummary } from "@stella/shared/tasks/variants";
import type { TaskSupportRecord } from "@stella/shared/tasks/support-record";
import { submissionFixture } from "@stella/shared/testing/task-submission";
import { getDb } from "../db/client.js";
import {
  contentUnits,
  enrollments,
  profiles,
  sections,
  skillEvidence,
  skills,
  stages,
  submissions,
  taskPrivate,
  taskProgress,
  taskRevisions,
  tasks,
  tenants,
  variantReviews,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import type { Caller } from "../lib/authz.js";
import { loadLearningPace } from "../lib/learning-pace.js";
import { taskCompletionCounts } from "../lib/task-completion.js";
import { reviewTaskSubmission } from "../lib/task-submission.js";
import { loadTodayVariant } from "../lib/variant-reviews.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { submissionsRoute } from "./submissions.js";
import { taskSupportRoute } from "./task-support.js";
import { tasksRoute } from "./tasks.js";
import { variantReviewsRoute } from "./variant-reviews.js";

const PARENT = "dev-env-basics/u01/page";
const variantId = (name: string) => `dev-env-basics/u01/${name}`;
const MARKER = "VARIANT_SECRET_MARKER_39";
const encode = (text: string) => Buffer.from(text).toString("base64");
const DEFINITION = JSON.stringify({
  submit: { explanation: false, debuggingRecord: false },
  skills: { assesses: ["html"] },
  support: { hintLevels: 0, solutionUnlock: "passed" },
});
/** 予備の類題 (親は PARENT・同じパターン)。 */
const STOCK: { name: string; kind: TaskKind }[] = [
  { name: "v-check-1", kind: "independent" },
  { name: "v-check-2", kind: "independent" },
  { name: "v-b", kind: "assessment-b" },
  { name: "v-r1", kind: "basic" },
  { name: "v-r2", kind: "basic" },
];
/** 日本時間のその日の正午。 */
const noonOf = (date: string) => new Date(studyDateStartMs(date) + 12 * 3_600_000);

const caller = (id: string): Caller => ({
  id,
  tenantId: "ses",
  role: "student",
  name: id,
  email: null,
});
const teacher: Caller = { ...caller("teacher"), role: "instructor" };

describe("類題の出題 (#39)", () => {
  let database: ReturnType<typeof sqliteD1>;
  let env: Env;
  let db: ReturnType<typeof getDb>;
  const tokens: Record<string, string> = {};

  async function addTask(id: string, kind: TaskKind, order: number, variantOf: string | null) {
    const fixture = await submissionFixture({ id, kind });
    await db.batch([
      db.insert(tasks).values({
        id,
        sectionId: "unit",
        title: `課題 ${id}`,
        kind,
        pattern: "page",
        skills: { uses: [], assesses: ["html"] },
        estimatedMinutes: 30,
        order,
        contentHash: fixture.bundle.contentHash,
        definition: DEFINITION,
        bundle: JSON.stringify(fixture.bundle),
        lessonId: variantOf ? null : "task-lesson",
        variantOf,
      }),
      db.insert(taskRevisions).values({
        taskId: id,
        contentHash: fixture.bundle.contentHash,
        definition: DEFINITION,
        bundle: JSON.stringify(fixture.bundle),
      }),
      db.insert(taskPrivate).values({
        taskId: id,
        files: JSON.stringify({
          "solution/index.html": encode(MARKER),
          "explanation.md": encode(MARKER),
          "review.md": encode(MARKER),
          "hints.md": encode(""),
        }),
      }),
    ]);
    return fixture;
  }

  /** 合格の記録を直接入れる (提出と進捗)。`assisted` なら提出にヒントの支援を添える。 */
  async function recordPass(userId: string, taskId: string, at: Date, assisted: boolean) {
    const id = `pass-${userId}-${taskId}`;
    await db.batch([
      db.insert(submissions).values({
        id,
        tenantId: "ses",
        studentId: userId,
        taskId,
        taskContentHash: "a".repeat(64),
        taskKind: "basic",
        submissionMode: "submit",
        supportLog: assisted
          ? [{ kind: "hint", at: at.toISOString(), detail: "ヒントを開いた" }]
          : [],
        assessedSkills: ["html"],
        stageTitle: "開発環境",
        assignmentTitle: taskId,
        code: "",
        verdict: "pass",
        status: "passed",
        submittedAt: at,
      }),
      db
        .insert(taskProgress)
        .values({
          userId,
          taskId,
          status: "passed",
          contentHash: "a".repeat(64),
          updatedAt: at,
          passedAt: at,
        })
        .onConflictDoUpdate({
          target: [taskProgress.userId, taskProgress.taskId],
          set: { status: "passed", updatedAt: at },
        }),
    ]);
    await db
      .update(taskProgress)
      .set({ passedAt: at })
      .where(and(eq(taskProgress.userId, userId), eq(taskProgress.taskId, taskId)));
    return id;
  }

  const reviewsOf = (userId: string) =>
    db
      .select()
      .from(variantReviews)
      .where(eq(variantReviews.userId, userId))
      .orderBy(variantReviews.step);

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
    await db.batch([
      db.insert(tenants).values([
        { id: "ses", name: "テスト" },
        { id: "other", name: "他社" },
      ]),
      db.insert(profiles).values([
        { id: "learner", tenantId: "ses", displayName: "受講者", role: "student" },
        { id: "learner2", tenantId: "ses", displayName: "受講者2", role: "student" },
        { id: "teacher", tenantId: "ses", displayName: "講師", role: "instructor" },
        { id: "outsider", tenantId: "other", displayName: "他社の受講者", role: "student" },
      ]),
      db.insert(skills).values({ id: "html", title: "HTML" }),
      db.insert(stages).values({
        id: "stage",
        tenantId: "ses",
        slug: "dev-env-basics",
        title: "開発環境",
        format: 2,
        status: "published",
        durationHours: 35,
      }),
      db.insert(sections).values({ id: "unit", stageId: "stage", title: "入口" }),
      db.insert(contentUnits).values({ sectionId: "unit", plannedHours: 3 }),
      db.insert(enrollments).values([
        { tenantId: "ses", userId: "learner", stageId: "stage", status: "active" },
        { tenantId: "ses", userId: "learner2", stageId: "stage", status: "active" },
      ]),
    ]);
    await addTask(PARENT, "basic", 0, null);
    for (const [i, v] of STOCK.entries()) await addTask(variantId(v.name), v.kind, i + 1, PARENT);
    for (const id of ["learner", "learner2", "teacher", "outsider"])
      tokens[id] = await signAccessToken("test-secret", id, `${id}@example.com`);
  });
  afterEach(() => {
    vi.useRealTimers();
    database.sqlite.close();
  });

  const app = () =>
    mountTestApp(env, tasksRoute, submissionsRoute, taskSupportRoute, variantReviewsRoute).app;
  const get = (path: string, as = "learner") => request(app(), env, path, { token: tokens[as] });
  const post = (path: string, body: unknown, as = "learner") =>
    request(app(), env, path, { method: "POST", token: tokens[as], body: JSON.stringify(body) });
  const bundleOf = (taskId: string, as = "learner") =>
    get(`/api/tasks/bundle?${new URLSearchParams({ taskId })}`, as);
  const today = async (as = "learner") =>
    (
      await json<{ variant: TodayVariantReview | null }>(
        await get("/api/variant-reviews/today", as),
      )
    ).variant;
  /** 起点の合格を「今日から days 日前」に入れる。 */
  const passParentDaysAgo = (userId: string, days: number, assisted = false) =>
    recordPass(userId, PARENT, noonOf(addStudyDays(toStudyDate(new Date()), -days)), assisted);

  it("出題前の類題は、配布・ヘルプ・提出・手元の結果・一覧・支援の記録のどこからも返さない", async () => {
    const target = variantId("v-check-1");
    const fixture = await submissionFixture({ id: target, kind: "independent" });
    expect((await bundleOf(target)).status).toBe(404);
    expect((await get(`/api/tasks/help?taskId=${encodeURIComponent(target)}`)).status).toBe(404);
    expect((await post("/api/tasks/help/open", { taskId: target, item: "solution" })).status).toBe(
      404,
    );
    expect(
      (await post("/api/tasks/local-result", { taskId: target, contentHash: "a".repeat(64) }))
        .status,
    ).toBe(404);
    const submitted = await post("/api/submissions", { ...fixture.input, support: [] });
    expect(submitted.status).toBe(404);
    expect(await db.select().from(submissions)).toEqual([]);
    // 講座の課題一覧と、ステージの支援の記録には親の課題だけが並ぶ。
    const list = await json<{ tasks: TaskSummary[] }>(await get("/api/tasks/for-stage/stage"));
    expect(list.tasks.map((t) => t.id)).toEqual([PARENT]);
    const support = await json<{ tasks: TaskSupportRecord[] }>(
      await get("/api/task-support?stageId=stage"),
    );
    expect(support.tasks.map((t) => t.taskId)).toEqual([PARENT]);
    // 起点に達していなければ今日の類題も無い。
    expect(await today()).toBeNull();
    expect(JSON.stringify(list)).not.toContain(MARKER);
  });

  it("出題した類題は本人にだけ配り、ほかの受講者・他テナントには返さない", async () => {
    await passParentDaysAgo("learner", 3);
    const variant = await today();
    expect(variant).toMatchObject({
      taskId: variantId("v-check-1"),
      purpose: "day3",
      pattern: "page",
      status: "not-started",
    });
    const taskId = variant?.taskId ?? "";
    const response = await bundleOf(taskId);
    expect(response.status, await response.clone().text()).toBe(200);
    expect(await response.text()).not.toContain(encode(MARKER));
    expect((await get(`/api/tasks/help?taskId=${encodeURIComponent(taskId)}`)).status).toBe(200);
    // 類題自身の解答例は、その類題の種別 (自力・合格後だけ) の方針で開く。
    const locked = await post("/api/tasks/help/open", { taskId, item: "solution" });
    expect(locked.status).toBe(403);
    expect(await locked.text()).not.toContain(MARKER);
    // 同じテナントで同じ講座を受講していても、出題していない受講者には返さない。
    expect((await bundleOf(taskId, "learner2")).status).toBe(404);
    expect((await bundleOf(taskId, "outsider")).status).toBe(404);
    expect(await today("learner2")).toBeNull();
    // 出題しても講座の課題一覧には混ざらない。
    const list = await json<{ tasks: TaskSummary[] }>(await get("/api/tasks/for-stage/stage"));
    expect(list.tasks.map((t) => t.id)).toEqual([PARENT]);
    // 提出は通常の課題と同じ流れで受け付ける (AI の一次レビューの待ち行列に入る)。
    const fixture = await submissionFixture({ id: taskId, kind: "independent" });
    const submitted = await post("/api/submissions", { ...fixture.input, support: [] });
    expect(submitted.status, await submitted.clone().text()).toBe(201);
    const [row] = await db.select().from(submissions).where(eq(submissions.taskId, taskId));
    expect(row).toMatchObject({ studentId: "learner", aiReviewStatus: "queued" });
  });

  it("自力と支援付きで出す時期が変わる", async () => {
    const day = "2026-10-01";
    await recordPass("learner", PARENT, noonOf(day), false);
    await recordPass("learner2", PARENT, noonOf(day), true);
    await loadTodayVariant(db, caller("learner"), noonOf(day));
    await loadTodayVariant(db, caller("learner2"), noonOf(day));
    expect(await reviewsOf("learner")).toMatchObject([
      { step: 1, purpose: "day3", dueOn: "2026-10-04", status: "scheduled", variantTaskId: null },
    ]);
    expect(await reviewsOf("learner2")).toMatchObject([
      { step: 1, purpose: "remedial", dueOn: "2026-10-02", status: "scheduled" },
    ]);
    // 出す日の前は出さない。出す日になったら目的に合う種別から出す。
    expect(await loadTodayVariant(db, caller("learner"), noonOf("2026-10-03"))).toBeNull();
    expect(await loadTodayVariant(db, caller("learner"), noonOf("2026-10-04"))).toMatchObject({
      taskId: variantId("v-check-1"),
      purpose: "day3",
    });
    expect(await loadTodayVariant(db, caller("learner2"), noonOf("2026-10-02"))).toMatchObject({
      taskId: variantId("v-r1"),
      purpose: "remedial",
    });
  });

  it("自力か支援付きかは、解いた順ではなく種別がいちばん難しい練習の合格で決める", async () => {
    const independent = "dev-env-basics/u01/page-independent";
    await addTask(independent, "independent", 10, null);
    // learner: 自力課題をヒント付きで解き、最後に基礎課題を自力で解く → 支援付き (補習)
    await recordPass("learner", independent, noonOf("2026-10-01"), true);
    await recordPass("learner", PARENT, noonOf("2026-10-02"), false);
    // learner2: 基礎課題をヒント付きで解き、最後に自力課題を自力で解く → 自力 (3 日後)
    await recordPass("learner2", PARENT, noonOf("2026-10-01"), true);
    await recordPass("learner2", independent, noonOf("2026-10-02"), false);
    await loadTodayVariant(db, caller("learner"), noonOf("2026-10-02"));
    await loadTodayVariant(db, caller("learner2"), noonOf("2026-10-02"));
    // 起点はどちらも練習をすべて終えた 10/2 のまま。
    expect(await reviewsOf("learner")).toMatchObject([
      { step: 1, purpose: "remedial", dueOn: "2026-10-03", status: "scheduled" },
    ]);
    expect(await reviewsOf("learner2")).toMatchObject([
      { step: 1, purpose: "day3", dueOn: "2026-10-05", status: "scheduled" },
    ]);
  });

  it("同じ類題を 2 度出さず、1 日 1 問・合格するまで次を出さない", async () => {
    await recordPass("learner", PARENT, noonOf("2026-10-01"), false);
    const first = await loadTodayVariant(db, caller("learner"), noonOf("2026-10-04"));
    expect(first?.taskId).toBe(variantId("v-check-1"));
    // 合格するまでは同じ類題が今日の類題のまま。
    expect((await loadTodayVariant(db, caller("learner"), noonOf("2026-10-09")))?.taskId).toBe(
      variantId("v-check-1"),
    );
    await recordPass("learner", variantId("v-check-1"), noonOf("2026-10-09"), false);
    // 合格した日は、合格した類題を今日の類題として返し、次は出さない。
    expect(await loadTodayVariant(db, caller("learner"), noonOf("2026-10-09"))).toMatchObject({
      taskId: variantId("v-check-1"),
      status: "passed",
    });
    // 1 週間後 (= 確認B) は確認Bの類題を優先する。前の類題との間を空ける (10/9 + 4 日)。
    expect(await loadTodayVariant(db, caller("learner"), noonOf("2026-10-12"))).toBeNull();
    expect(await loadTodayVariant(db, caller("learner"), noonOf("2026-10-13"))).toMatchObject({
      taskId: variantId("v-b"),
      purpose: "week1",
    });
    await recordPass("learner", variantId("v-b"), noonOf("2026-10-13"), false);
    await loadTodayVariant(db, caller("learner"), noonOf("2026-10-14"));
    const week3 = await loadTodayVariant(db, caller("learner"), noonOf("2026-10-27"));
    expect(week3).toMatchObject({ taskId: variantId("v-check-2"), purpose: "week3" });
    const issued = (await reviewsOf("learner")).map((r) => r.variantTaskId);
    expect(new Set(issued).size).toBe(issued.length);
    // 一意制約: 同じ類題をもう一度出す書き込みは DB が止める。
    await expect(
      db.insert(variantReviews).values({
        tenantId: "ses",
        userId: "learner",
        pattern: "page",
        step: 99,
        purpose: "day3",
        anchorAt: new Date(),
        dueOn: "2026-10-27",
        status: "passed",
        variantTaskId: variantId("v-check-1"),
      }),
    ).rejects.toThrow();
  });

  it("在庫が尽きたら出さず、講師が在庫の不足と待っている受講者を見られる", async () => {
    await recordPass("learner", PARENT, noonOf("2026-10-01"), true);
    for (const [i, day] of ["2026-10-02", "2026-10-03"].entries()) {
      const issued = await loadTodayVariant(db, caller("learner"), noonOf(day));
      expect(issued?.purpose).toBe("remedial");
      await recordPass("learner", issued?.taskId ?? "", noonOf(day), i === 0);
    }
    // 補習の小問題は 2 問しか無い。3 問目は在庫切れで出さない。
    expect(await loadTodayVariant(db, caller("learner"), noonOf("2026-10-04"))).toBeNull();
    expect((await reviewsOf("learner")).at(-1)).toMatchObject({
      step: 3,
      purpose: "remedial",
      status: "out-of-stock",
      variantTaskId: null,
    });
    const stock = await get("/api/variant-reviews/stock", "teacher");
    expect(stock.status).toBe(200);
    expect((await json<{ patterns: VariantStockSummary[] }>(stock)).patterns).toEqual([
      {
        pattern: "page",
        stock: { remedial: 2, check: 3 },
        waiting: [{ userId: "learner", name: "受講者", purpose: "remedial", dueOn: "2026-10-04" }],
      },
    ]);
    // 受講者は在庫の一覧を読めない。
    expect((await get("/api/variant-reviews/stock")).status).toBe(403);
    // 在庫を足すと、次に開いたときに出す。
    await addTask(variantId("v-r3"), "connection", 9, PARENT);
    expect(await loadTodayVariant(db, caller("learner"), noonOf("2026-10-05"))).toMatchObject({
      taskId: variantId("v-r3"),
      purpose: "remedial",
    });
  });

  it("教材から外れた類題は取り下げ、同じ目的で別の類題を出し直す", async () => {
    await recordPass("learner", PARENT, noonOf("2026-10-01"), false);
    await loadTodayVariant(db, caller("learner"), noonOf("2026-10-04"));
    await db
      .update(tasks)
      .set({ active: false })
      .where(eq(tasks.id, variantId("v-check-1")));
    expect(await loadTodayVariant(db, caller("learner"), noonOf("2026-10-05"))).toMatchObject({
      taskId: variantId("v-check-2"),
      purpose: "day3",
    });
    expect((await reviewsOf("learner")).map((r) => [r.status, r.variantTaskId])).toEqual([
      ["withdrawn", variantId("v-check-1")],
      ["issued", variantId("v-check-2")],
    ]);
  });

  it("類題は修了の判定・学習ペースに数えない", async () => {
    const learner = caller("learner");
    const counts = await taskCompletionCounts(db, "stage", ["learner"]);
    expect(counts.total).toBe(1);
    await recordPass("learner", variantId("v-check-1"), noonOf("2026-10-01"), false);
    expect((await taskCompletionCounts(db, "stage", ["learner"])).passed.get("learner")).toEqual(
      undefined,
    );
    await recordPass("learner", PARENT, noonOf("2026-10-01"), false);
    expect((await taskCompletionCounts(db, "stage", ["learner"])).passed.get("learner")).toEqual(
      new Set([PARENT]),
    );
    // 類題があっても無くても、学習ペースは同じ。
    const withVariants = await loadLearningPace(db, learner, "2026-10-05");
    await db.delete(tasks).where(eq(tasks.variantOf, PARENT));
    expect(await loadLearningPace(db, learner, "2026-10-05")).toEqual(withVariants);
  });

  it("時間を空けた類題の自力の合格は「時間を空けて確認」、補習は自力のまま", async () => {
    // 起点の課題を支援なしで合格し、自力の証拠を残す。
    await db.insert(submissions).values({
      id: "parent-pass",
      tenantId: "ses",
      studentId: "learner",
      taskId: PARENT,
      taskContentHash: "a".repeat(64),
      taskKind: "basic",
      submissionMode: "submit",
      supportLog: [],
      assessedSkills: ["html"],
      stageTitle: "開発環境",
      assignmentTitle: "課題",
      code: "",
      submittedAt: noonOf("2026-10-01"),
    });
    // 判定 (証拠を作る時刻) も出題より前にする。
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(noonOf("2026-10-01"));
    await reviewTaskSubmission(db, teacher, "parent-pass", "pass", "ok");
    vi.setSystemTime(noonOf("2026-10-04"));
    const issued = await loadTodayVariant(db, caller("learner"), noonOf("2026-10-04"));
    expect(issued?.purpose).toBe("day3");
    const [review] = await reviewsOf("learner");
    const submittedAt = new Date((review.issuedAt?.getTime() ?? 0) + 60_000);
    await db.insert(submissions).values({
      id: "variant-pass",
      tenantId: "ses",
      studentId: "learner",
      taskId: issued?.taskId ?? "",
      taskContentHash: "a".repeat(64),
      taskKind: "independent",
      submissionMode: "submit",
      supportLog: [],
      assessedSkills: ["html"],
      stageTitle: "開発環境",
      assignmentTitle: "類題",
      code: "",
      submittedAt,
    });
    vi.setSystemTime(new Date(submittedAt.getTime() + 60_000));
    await reviewTaskSubmission(db, teacher, "variant-pass", "pass", "ok");
    const [evidence] = await db
      .select()
      .from(skillEvidence)
      .where(eq(skillEvidence.submissionId, "variant-pass"));
    expect(evidence).toMatchObject({ skillId: "html", level: "retained", assisted: false });
    // 合格を出題の記録に写し、次 (1 週間後) を積む。
    await loadTodayVariant(db, caller("learner"), noonOf("2026-10-05"));
    expect((await reviewsOf("learner")).map((r) => [r.purpose, r.status])).toEqual([
      ["day3", "passed"],
      ["week1", "scheduled"],
    ]);
  });

  it("通常の確認Bがあるパターンは 1 週間後の類題を出さない", async () => {
    await addTask("dev-env-basics/u01/assessment-b", "assessment-b", 50, null);
    await recordPass("learner", PARENT, noonOf("2026-10-01"), false);
    await loadTodayVariant(db, caller("learner"), noonOf("2026-10-04"));
    await recordPass("learner", variantId("v-check-1"), noonOf("2026-10-04"), false);
    await loadTodayVariant(db, caller("learner"), noonOf("2026-10-05"));
    expect((await reviewsOf("learner")).map((r) => [r.purpose, r.dueOn])).toEqual([
      ["day3", "2026-10-04"],
      ["week3", "2026-10-22"],
    ]);
  });

  it("出題のあとに確定した証拠は「時間を空けて確認」の根拠にしない", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 10/1 に練習を合格 (証拠なし)。同じ日に出し直した提出は講師の判定待ちのまま。
    await recordPass("learner", PARENT, noonOf("2026-10-01"), false);
    await db.insert(submissions).values({
      id: "late-review",
      tenantId: "ses",
      studentId: "learner",
      taskId: PARENT,
      taskContentHash: "a".repeat(64),
      taskKind: "basic",
      submissionMode: "submit",
      supportLog: [],
      assessedSkills: ["html"],
      stageTitle: "開発環境",
      assignmentTitle: "課題",
      code: "",
      attempt: 2,
      submittedAt: new Date(noonOf("2026-10-01").getTime() + 3_600_000),
    });
    // 10/4 に類題を出題したあと、10/5 に講師が先の提出を合格にする (証拠は 10/5 にできる)。
    vi.setSystemTime(noonOf("2026-10-04"));
    const issued = await loadTodayVariant(db, caller("learner"), noonOf("2026-10-04"));
    expect(issued?.purpose).toBe("day3");
    vi.setSystemTime(noonOf("2026-10-05"));
    await reviewTaskSubmission(db, teacher, "late-review", "pass", "ok");
    // 10/6 に類題を自力で合格しても、出題の時点で無かった証拠では「時間を空けて確認」にしない。
    vi.setSystemTime(noonOf("2026-10-06"));
    await db.insert(submissions).values({
      id: "variant-pass",
      tenantId: "ses",
      studentId: "learner",
      taskId: issued?.taskId ?? "",
      taskContentHash: "a".repeat(64),
      taskKind: "independent",
      submissionMode: "submit",
      supportLog: [],
      assessedSkills: ["html"],
      stageTitle: "開発環境",
      assignmentTitle: "類題",
      code: "",
      submittedAt: noonOf("2026-10-06"),
    });
    await reviewTaskSubmission(db, teacher, "variant-pass", "pass", "ok");
    const [evidence] = await db
      .select()
      .from(skillEvidence)
      .where(eq(skillEvidence.submissionId, "variant-pass"));
    expect(evidence).toMatchObject({ skillId: "html", level: "independent", assisted: false });
  });

  it("起点の支援は今の版の合格 (passed_at と同じ合格) で判定する", async () => {
    // 旧版を 10/1 にヒント付きで合格し、改訂版を 10/10 に自力で合格した。
    await db.batch([
      db.insert(submissions).values([
        {
          id: "old-version",
          tenantId: "ses",
          studentId: "learner",
          taskId: PARENT,
          taskContentHash: "b".repeat(64),
          taskKind: "basic",
          submissionMode: "submit",
          supportLog: [{ kind: "hint", at: noonOf("2026-10-01").toISOString(), detail: "ヒント" }],
          assessedSkills: ["html"],
          stageTitle: "開発環境",
          assignmentTitle: "課題",
          code: "",
          verdict: "pass",
          status: "passed",
          attempt: 1,
          submittedAt: noonOf("2026-10-01"),
        },
        {
          id: "new-version",
          tenantId: "ses",
          studentId: "learner",
          taskId: PARENT,
          taskContentHash: "a".repeat(64),
          taskKind: "basic",
          submissionMode: "submit",
          supportLog: [],
          assessedSkills: ["html"],
          stageTitle: "開発環境",
          assignmentTitle: "課題",
          code: "",
          verdict: "pass",
          status: "passed",
          attempt: 2,
          submittedAt: noonOf("2026-10-10"),
        },
      ]),
      db.insert(taskProgress).values({
        userId: "learner",
        taskId: PARENT,
        status: "passed",
        contentHash: "a".repeat(64),
        updatedAt: noonOf("2026-10-10"),
        passedAt: noonOf("2026-10-10"),
      }),
    ]);
    await db
      .update(taskProgress)
      .set({ passedAt: noonOf("2026-10-10") })
      .where(eq(taskProgress.taskId, PARENT));
    await loadTodayVariant(db, caller("learner"), noonOf("2026-10-10"));
    expect(await reviewsOf("learner")).toMatchObject([
      { step: 1, purpose: "day3", dueOn: "2026-10-13", status: "scheduled" },
    ]);
  });

  it("出した類題の支援も、今の版の合格で判定する", async () => {
    await recordPass("learner", PARENT, noonOf("2026-10-01"), false);
    const issued = await loadTodayVariant(db, caller("learner"), noonOf("2026-10-04"));
    const taskId = issued?.taskId ?? "";
    // 類題の旧版をヒント付きで合格したあと、改訂版を自力で合格した。
    await db.batch([
      db.insert(submissions).values([
        {
          id: "variant-old",
          tenantId: "ses",
          studentId: "learner",
          taskId,
          taskContentHash: "b".repeat(64),
          taskKind: "independent",
          submissionMode: "submit",
          supportLog: [{ kind: "hint", at: noonOf("2026-10-04").toISOString(), detail: "ヒント" }],
          assessedSkills: ["html"],
          stageTitle: "開発環境",
          assignmentTitle: "類題",
          code: "",
          verdict: "pass",
          status: "passed",
          attempt: 1,
          submittedAt: noonOf("2026-10-04"),
        },
        {
          id: "variant-new",
          tenantId: "ses",
          studentId: "learner",
          taskId,
          taskContentHash: "a".repeat(64),
          taskKind: "independent",
          submissionMode: "submit",
          supportLog: [],
          assessedSkills: ["html"],
          stageTitle: "開発環境",
          assignmentTitle: "類題",
          code: "",
          verdict: "pass",
          status: "passed",
          attempt: 2,
          submittedAt: noonOf("2026-10-05"),
        },
      ]),
      db.insert(taskProgress).values({
        userId: "learner",
        taskId,
        status: "passed",
        contentHash: "a".repeat(64),
        updatedAt: noonOf("2026-10-05"),
        passedAt: noonOf("2026-10-05"),
      }),
    ]);
    await db
      .update(taskProgress)
      .set({ passedAt: noonOf("2026-10-05") })
      .where(eq(taskProgress.taskId, taskId));
    await loadTodayVariant(db, caller("learner"), noonOf("2026-10-06"));
    expect(
      (await reviewsOf("learner")).map((r) => [r.purpose, r.status, r.passedAssisted]),
    ).toEqual([
      ["day3", "passed", false],
      ["week1", "scheduled", null],
    ]);
  });

  it("読めるパターンの練習が無くなったら新しい段を積まず、出した類題はそのまま解ける", async () => {
    await recordPass("learner", PARENT, noonOf("2026-10-01"), false);
    const issued = await loadTodayVariant(db, caller("learner"), noonOf("2026-10-04"));
    const taskId = issued?.taskId ?? "";
    // 練習の課題が教材から外れた (seed が無効にした)。出した類題は残っている。
    await db.update(tasks).set({ active: false }).where(eq(tasks.id, PARENT));
    expect(await loadTodayVariant(db, caller("learner"), noonOf("2026-10-05"))).toMatchObject({
      taskId,
      purpose: "day3",
    });
    expect((await bundleOf(taskId)).status).toBe(200);
    // 出した類題に合格しても、次の段 (1 週間後) は積まない。
    await recordPass("learner", taskId, noonOf("2026-10-05"), false);
    await loadTodayVariant(db, caller("learner"), noonOf("2026-10-20"));
    expect((await reviewsOf("learner")).map((r) => [r.purpose, r.status])).toEqual([
      ["day3", "passed"],
    ]);
  });
});
