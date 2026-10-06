/**
 * 受講者の育成 (#38): 手元の確認の要約・担当での絞り込み・支援の記録・つまずきの検知。
 * 実 SQLite (全マイグレーション) に対して route と cron を通す。
 */

import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskSupportRecord } from "@stella/shared/tasks/support-record";
import { getDb } from "../db/client.js";
import {
  aiReviews,
  enrollments,
  learnerInstructors,
  notifications,
  profiles,
  sections,
  skillEvidence,
  skills,
  stages,
  studyActivity,
  submissionReviews,
  submissions,
  taskHelpOpens,
  taskLocalRuns,
  taskProgress,
  taskSupportEvents,
  tasks,
  tenants,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import {
  notifyStumbles,
  REVIEW_ESCALATION_STREAK,
  weekdaysBetween,
} from "../lib/stumble-alerts.js";
import { reviewTaskSubmission } from "../lib/task-submission.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { analyticsRoute } from "./analytics.js";
import { chatRoute } from "./chat.js";
import { submissionsRoute } from "./submissions.js";
import { taskSupportRoute } from "./task-support.js";
import { tasksRoute } from "./tasks.js";

const streamChat = vi.hoisted(() => vi.fn());
vi.mock("../lib/rate-limit.js", () => ({ enforceAiRateLimit: vi.fn().mockResolvedValue(null) }));
vi.mock("../lib/anthropic.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/anthropic.js")>()),
  streamChat,
}));

const SECRET = "mentoring-test-secret";
const HASH = "a".repeat(64);
const HOUR = 3_600_000;

let database: ReturnType<typeof sqliteD1>;
let env: Env;
let db: ReturnType<typeof getDb>;
let app: ReturnType<typeof mountTestApp>["app"];

const token = (id: string) => signAccessToken(SECRET, id, `${id}@example.test`);
const get = async (path: string, as: string) => request(app, env, path, { token: await token(as) });
const post = async (path: string, body: unknown, as: string) =>
  request(app, env, path, { token: await token(as), method: "POST", body: JSON.stringify(body) });

beforeEach(async () => {
  database = sqliteD1();
  env = { DB: database.binding, AUTH_JWT_SECRET: SECRET, ANTHROPIC_API_KEY: "sk-test" } as Env;
  db = getDb(env);
  app = mountTestApp(
    env,
    tasksRoute,
    submissionsRoute,
    analyticsRoute,
    taskSupportRoute,
    chatRoute,
  ).app;
  const definition = JSON.stringify({ skills: { assesses: ["html"] } });
  await db.batch([
    db.insert(tenants).values([
      { id: "ses", name: "SES" },
      { id: "other", name: "Other" },
    ]),
    db.insert(profiles).values([
      { id: "learner", tenantId: "ses", displayName: "受講者", role: "student" },
      { id: "peer", tenantId: "ses", displayName: "別の受講者", role: "student" },
      { id: "teacher", tenantId: "ses", displayName: "担当講師", role: "instructor" },
      { id: "teacher2", tenantId: "ses", displayName: "担当のない講師", role: "instructor" },
      { id: "outsider", tenantId: "other", displayName: "他テナントの講師", role: "instructor" },
    ]),
    db.insert(stages).values([
      { id: "stage", tenantId: "ses", slug: "dev-env-basics", title: "開発環境", format: 2 },
      { id: "closed", tenantId: "ses", slug: "html-css-basics", title: "HTML", format: 2 },
    ]),
    db.insert(sections).values([
      { id: "unit", stageId: "stage", title: "入口" },
      { id: "unit2", stageId: "closed", title: "HTML" },
    ]),
    db.insert(tasks).values(
      ["practice", "second", "B"].map((id, order) => ({
        id,
        sectionId: "unit",
        title: id === "B" ? "確認B" : `課題${order + 1}`,
        kind: id === "B" ? "assessment-b" : "basic",
        pattern: "page",
        skills: { uses: [], assesses: ["html"] },
        estimatedMinutes: 10,
        order,
        contentHash: HASH,
        definition,
        bundle: "{}",
      })),
    ),
    db.insert(tasks).values({
      id: "hidden",
      sectionId: "unit2",
      title: "受講していない課題",
      kind: "basic",
      pattern: "page",
      skills: { uses: [], assesses: [] },
      estimatedMinutes: 10,
      order: 0,
      contentHash: HASH,
      definition,
      bundle: "{}",
    }),
    db.insert(skills).values({ id: "html", title: "HTML" }),
    db.insert(enrollments).values({
      tenantId: "ses",
      userId: "learner",
      stageId: "stage",
      status: "active",
      enrolledAt: new Date("2026-10-01T00:00:00Z"),
    }),
    db.insert(learnerInstructors).values({ learnerId: "learner", instructorId: "teacher" }),
  ]);
  await db.update(stages).set({ status: "published" }).where(eq(stages.tenantId, "ses"));
  streamChat.mockReset();
});
afterEach(() => database.sqlite.close());

const runRow = async (taskId = "practice") =>
  (
    await db
      .select()
      .from(taskLocalRuns)
      .where(and(eq(taskLocalRuns.userId, "learner"), eq(taskLocalRuns.taskId, taskId)))
  )[0];

/** 合格は local-result、失敗・エラーは local-runs (拡張と同じ振り分け)。 */
const sendRun = (body: { outcome?: string } & Record<string, unknown>, as = "learner") =>
  post(
    body.outcome && body.outcome !== "passed" ? "/api/tasks/local-runs" : "/api/tasks/local-result",
    body,
    as,
  );

describe("手元の確認の要約 (POST /api/tasks/local-result・local-runs)", () => {
  const report = (outcome: string, extra: Record<string, unknown> = {}) => ({
    taskId: "practice",
    contentHash: HASH,
    outcome,
    ...extra,
  });

  it("失敗を数え、合格で連続を切る。環境のエラーは連続に数えない", async () => {
    for (let i = 0; i < 3; i++) {
      const res = await sendRun(
        report("failed", { failedSteps: ["test"], tests: { passed: 7, failed: 1 } }),
      );
      expect(res.status, await res.clone().text()).toBe(200);
    }
    let row = await runRow();
    expect(row).toMatchObject({
      failedRuns: 3,
      failureStreak: 3,
      lastOutcome: "failed",
      lastFailedSteps: ["test"],
      lastTestsFailed: 1,
    });
    const started = row?.streakStartedAt;
    expect(started).toBeInstanceOf(Date);
    // 失敗だけでは課題の進捗に触らない。
    expect(await db.select().from(taskProgress)).toEqual([]);

    await sendRun(report("error", { failedSteps: ["deps"] }));
    row = await runRow();
    expect(row).toMatchObject({ errorRuns: 1, failureStreak: 3, lastOutcome: "error" });
    expect(row?.streakStartedAt?.getTime()).toBe(started?.getTime());

    await sendRun(report("passed"));
    row = await runRow();
    expect(row).toMatchObject({ passedRuns: 1, failureStreak: 0, streakStartedAt: null });
    expect((await db.select().from(taskProgress))[0]?.status).toBe("local-passed");

    await sendRun(report("failed"));
    expect((await runRow())?.failureStreak).toBe(1);
  });

  it("失敗は合格の道に送れない (旧 API に戻したとき合格として残さないため)", async () => {
    expect((await post("/api/tasks/local-result", report("failed"), "learner")).status).toBe(400);
    expect((await post("/api/tasks/local-runs", report("passed"), "learner")).status).toBe(400);
    expect(
      (await post("/api/tasks/local-runs", { ...report("x"), outcome: undefined }, "learner"))
        .status,
    ).toBe(400);
    expect(await db.select().from(taskLocalRuns)).toEqual([]);
    expect(await db.select().from(taskProgress)).toEqual([]);
  });

  it("旧拡張の合格 (taskId と contentHash だけ) を合格として数え、要約以外は保存しない", async () => {
    const res = await post(
      "/api/tasks/local-result",
      {
        taskId: "practice",
        contentHash: HASH,
        logTail: "const secret = 'learner code';",
        files: [{ path: "secret.js", sha256: "b".repeat(64), bytes: 1 }],
      },
      "learner",
    );
    expect(res.status).toBe(200);
    expect((await runRow())?.passedRuns).toBe(1);
    const stored = JSON.stringify(database.sqlite.prepare("select * from task_local_runs").all());
    expect(stored).not.toContain("secret");
  });

  it("不正な要約は 400、受講していない課題は 404、版が古ければ 409", async () => {
    expect((await sendRun(report("crashed"))).status).toBe(400);
    expect((await sendRun(report("failed", { failedSteps: ["rm -rf /"] }))).status).toBe(400);
    expect((await sendRun(report("failed", { tests: { passed: -1 } }))).status).toBe(400);
    expect((await sendRun(report("failed"), "peer")).status).toBe(404);
    expect((await sendRun({ ...report("failed"), contentHash: "c".repeat(64) })).status).toBe(409);
    expect(await db.select().from(taskLocalRuns)).toEqual([]);
  });

  it("版が変わると連続の失敗を数え直す (回数の合計は残す)", async () => {
    await sendRun(report("failed"));
    await sendRun(report("failed"));
    const next = "d".repeat(64);
    await db.update(tasks).set({ contentHash: next }).where(eq(tasks.id, "practice"));
    await sendRun({ ...report("failed"), contentHash: next });
    expect(await runRow()).toMatchObject({ failedRuns: 3, failureStreak: 1, contentHash: next });
  });
});

async function seedSubmissions() {
  await db.insert(submissions).values([
    {
      id: "legacy-peer",
      tenantId: "ses",
      studentId: "peer",
      stageTitle: "旧",
      assignmentTitle: "旧課題",
      code: "x",
    },
    {
      id: "legacy-learner",
      tenantId: "ses",
      studentId: "learner",
      stageTitle: "旧",
      assignmentTitle: "旧課題",
      code: "y",
    },
    {
      id: "task-learner",
      tenantId: "ses",
      studentId: "learner",
      taskId: "practice",
      taskContentHash: HASH,
      taskKind: "basic",
      submissionMode: "submit",
      stageTitle: "開発環境",
      assignmentTitle: "課題1",
      code: "",
    },
  ]);
}

describe("担当の受講者だけに絞る", () => {
  it("添削キューは assigned=mine で担当の受講者の提出 (新旧とも) だけを返す", async () => {
    await seedSubmissions();
    const ids = async (path: string, as: string) =>
      (await json<{ rows: { id: string }[] }>(await get(path, as))).rows.map((r) => r.id).sort();
    expect(await ids("/api/submissions", "teacher")).toEqual([
      "legacy-learner",
      "legacy-peer",
      "task-learner",
    ]);
    expect(await ids("/api/submissions?assigned=mine", "teacher")).toEqual([
      "legacy-learner",
      "task-learner",
    ]);
    // 担当のない講師も、絞らなければこれまでどおり全件を見る。
    expect(await ids("/api/submissions", "teacher2")).toHaveLength(3);
    expect(await ids("/api/submissions?assigned=mine", "teacher2")).toEqual([]);
    expect((await get("/api/submissions?assigned=all", "teacher")).status).toBe(400);
    expect((await get("/api/submissions?assigned=mine", "learner")).status).toBe(403);
  });

  it("講師ダッシュボードは assigned=mine で担当の受講者だけを数え、担当の人数を返す", async () => {
    await db.insert(enrollments).values({
      tenantId: "ses",
      userId: "peer",
      stageId: "stage",
      status: "active",
    });
    type Overview = { overview: { total_learners: number; assigned_learners: number } };
    const all = await json<Overview>(await get("/api/analytics/instructor", "teacher"));
    expect(all.overview).toMatchObject({ total_learners: 2, assigned_learners: 1 });
    const mine = await json<Overview>(
      await get("/api/analytics/instructor?assigned=mine", "teacher"),
    );
    expect(mine.overview).toMatchObject({ total_learners: 1, assigned_learners: 1 });
    const none = await json<Overview>(await get("/api/analytics/instructor", "teacher2"));
    expect(none.overview).toMatchObject({ total_learners: 2, assigned_learners: 0 });
  });
});

describe("支援の記録 (GET /api/task-support)", () => {
  async function seedSupport() {
    const at = (iso: string) => new Date(iso);
    await db.insert(submissions).values([
      {
        id: "consult",
        tenantId: "ses",
        studentId: "learner",
        taskId: "practice",
        taskContentHash: HASH,
        taskKind: "basic",
        submissionMode: "consult",
        supportLog: [
          { kind: "hint", at: "2026-10-05T01:00:00.000Z" },
          { kind: "instructor", at: "2026-10-05T02:00:00.000Z", detail: "講師への相談" },
        ],
        stageTitle: "開発環境",
        assignmentTitle: "課題1",
        code: "",
        attempt: 1,
        submittedAt: at("2026-10-05T02:00:00Z"),
      },
      {
        id: "submit",
        tenantId: "ses",
        studentId: "learner",
        taskId: "practice",
        taskContentHash: HASH,
        taskKind: "basic",
        submissionMode: "submit",
        supportLog: [{ kind: "hint", at: "2026-10-05T01:00:00.000Z" }],
        stageTitle: "開発環境",
        assignmentTitle: "課題1",
        code: "",
        attempt: 2,
        submittedAt: at("2026-10-06T02:00:00Z"),
      },
    ]);
    await db.insert(submissionReviews).values({
      submissionId: "consult",
      source: "human",
      reviewerId: "teacher",
      verdict: "resubmit",
      notes: "受講者には見せない講師のメモ",
    });
    await db.insert(taskSupportEvents).values({
      tenantId: "ses",
      userId: "learner",
      taskId: "practice",
      kind: "ai-chat",
      createdAt: at("2026-10-05T03:00:00Z"),
    });
    await sendRun({
      taskId: "practice",
      contentHash: HASH,
      outcome: "failed",
      failedSteps: ["lint"],
      tests: { passed: 3, failed: 1 },
    });
  }

  it("受講者は自分の課題ごとの記録を見る。相談・申告・人のレビュー・AI チャット・手元の確認を束ねる", async () => {
    await seedSupport();
    const res = await get("/api/task-support?stageId=stage", "learner");
    expect(res.status, await res.clone().text()).toBe(200);
    const { tasks: records } = await json<{ tasks: TaskSupportRecord[] }>(res);
    expect(records.map((r) => r.taskId)).toEqual(["practice", "second", "B"]);
    const [practice] = records;
    // 申告は試行ごとに繰り返し載っても 1 件。相談に付く「講師への相談」は相談そのものと数える。
    expect(practice?.counts).toEqual({ consult: 1, hint: 1, "human-review": 1, "ai-chat": 1 });
    expect(practice?.localRuns).toMatchObject({
      failed: 1,
      failureStreak: 1,
      lastFailedSteps: ["lint"],
      lastTests: { passed: 3, failed: 1 },
    });
    expect(practice?.level).toBeNull();
    expect(JSON.stringify(records)).not.toContain("受講者には見せない");
    expect(records[1]).toMatchObject({ counts: {}, events: [], localRuns: null });
  });

  it("受講者は他人の記録と受講していないステージを見られない。講師は同じテナントの受講者だけ", async () => {
    await seedSupport();
    expect((await get("/api/task-support?userId=learner", "peer")).status).toBe(403);
    expect((await get("/api/task-support?stageId=closed", "learner")).status).toBe(404);
    const teacher = await get("/api/task-support?userId=learner", "teacher");
    expect(teacher.status).toBe(200);
    const { tasks: records } = await json<{ tasks: TaskSupportRecord[] }>(teacher);
    // ステージを指定しなければ、記録のある課題だけ。
    expect(records.map((r) => r.taskId)).toEqual(["practice"]);
    expect((await get("/api/task-support?userId=learner", "outsider")).status).toBe(404);
  });

  it("ステージを省略しても、本人には今読めるステージの課題だけを返す", async () => {
    await seedSupport();
    const mine = async () =>
      (await json<{ tasks: TaskSupportRecord[] }>(await get("/api/task-support", "learner"))).tasks;
    expect((await mine()).map((r) => r.taskId)).toEqual(["practice"]);
    // 受講が期限切れになった・ステージが非公開になったら、課題名ごと出さない。
    await db
      .update(enrollments)
      .set({ status: "expired" })
      .where(eq(enrollments.userId, "learner"));
    expect(await mine()).toEqual([]);
    await db
      .update(enrollments)
      .set({ status: "completed" })
      .where(eq(enrollments.userId, "learner"));
    expect((await mine()).map((r) => r.taskId)).toEqual(["practice"]);
    await db.update(stages).set({ status: "draft" }).where(eq(stages.id, "stage"));
    expect(await mine()).toEqual([]);
    // 講師はテナントの範囲で見る。
    const teacher = await json<{ tasks: TaskSupportRecord[] }>(
      await get("/api/task-support?userId=learner", "teacher"),
    );
    expect(teacher.tasks.map((r) => r.taskId)).toEqual(["practice"]);
  });
});

describe("支援の記録を習得の水準に反映する", () => {
  const caller = {
    id: "teacher",
    tenantId: "ses",
    role: "instructor" as const,
    name: "担当講師",
    email: null,
  };
  async function submitAt(id: string, at: Date, mode: "submit" | "consult" = "submit") {
    await db.insert(submissions).values({
      id,
      tenantId: "ses",
      studentId: "learner",
      taskId: "practice",
      taskContentHash: HASH,
      taskKind: "basic",
      submissionMode: mode,
      supportLog: [],
      assessedSkills: ["html"],
      stageTitle: "開発環境",
      assignmentTitle: "課題1",
      code: "",
      submittedAt: at,
    });
  }
  const levelOf = async (id: string) =>
    (await db.select().from(skillEvidence).where(eq(skillEvidence.submissionId, id)))[0];

  it("提出より前の AI チャットがあれば支援付き。提出の後のチャットは数えない", async () => {
    await db.insert(taskSupportEvents).values({
      tenantId: "ses",
      userId: "learner",
      taskId: "practice",
      kind: "ai-chat",
      createdAt: new Date("2026-10-05T00:00:00Z"),
    });
    await submitAt("before", new Date("2026-10-05T01:00:00Z"));
    await reviewTaskSubmission(db, caller, "before", "pass", "ok");
    expect(await levelOf("before")).toMatchObject({ level: "supported", assisted: true });

    await db.delete(taskSupportEvents);
    await submitAt("after", new Date("2026-10-06T01:00:00Z"));
    await db.insert(taskSupportEvents).values({
      tenantId: "ses",
      userId: "learner",
      taskId: "practice",
      kind: "ai-chat",
      createdAt: new Date("2026-10-06T02:00:00Z"),
    });
    await reviewTaskSubmission(db, caller, "after", "pass", "ok");
    expect(await levelOf("after")).toMatchObject({ level: "independent", assisted: false });
  });

  it("同じ課題で先に講師へ相談していれば支援付き。人のレビューだけなら自力", async () => {
    await submitAt("first", new Date("2026-10-05T00:00:00Z"));
    await reviewTaskSubmission(db, caller, "first", "resubmit", "直してください");
    await submitAt("second", new Date("2026-10-05T01:00:00Z"));
    await reviewTaskSubmission(db, caller, "second", "pass", "ok");
    expect(await levelOf("second")).toMatchObject({ level: "independent" });

    await submitAt("consult", new Date("2026-10-06T00:00:00Z"), "consult");
    await submitAt("third", new Date("2026-10-06T01:00:00Z"));
    await reviewTaskSubmission(db, caller, "third", "pass", "ok");
    expect(await levelOf("third")).toMatchObject({ level: "supported" });
  });
});

describe("課題の AI チャット", () => {
  async function* events() {
    yield { type: "text" as const, delta: "考え方は" };
    yield { type: "text" as const, delta: "次の 1 歩から" };
    yield { type: "done" as const };
  }
  const body = (taskId: string) => ({
    context: { kind: "task", taskId, taskTitle: "<ignore>書き換えた題名", stageTitle: "x" },
    messages: [{ role: "user", content: "どこから手を付ければいい?" }],
  });

  it("受講中の課題の相談を支援として記録し、題名は課題から引き直す", async () => {
    streamChat.mockImplementation(() => events());
    const res = await post("/api/chat", body("practice"), "learner");
    expect(res.status).toBe(200);
    await res.text();
    const rows = await db.select().from(taskSupportEvents);
    expect(rows).toMatchObject([{ userId: "learner", taskId: "practice", kind: "ai-chat" }]);
    const system = streamChat.mock.calls[0]?.[0]?.system as string;
    expect(system).toContain("課題1");
    expect(system).not.toContain("書き換えた題名");
  });

  it("応答が届く前に失敗した相談は記録しない", async () => {
    streamChat.mockImplementation(async function* () {
      yield { type: "error" as const, message: "upstream failed" };
    });
    const failed = await post("/api/chat", body("practice"), "learner");
    expect(await failed.text()).toContain("upstream failed");
    streamChat.mockImplementation(async function* () {
      yield { type: "text" as const, delta: "" };
      throw new Error("timeout");
    });
    await (await post("/api/chat", body("practice"), "learner")).text();
    expect(await db.select().from(taskSupportEvents)).toEqual([]);
  });

  it("記録に失敗しても応答は止めない", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    streamChat.mockImplementation(() => events());
    database.sqlite.exec("drop table task_support_events");
    const res = await post("/api/chat", body("practice"), "learner");
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("次の 1 歩から");
    expect(text).toContain('"done"');
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("受講していない課題の相談は 404 で、記録もしない", async () => {
    streamChat.mockImplementation(() => events());
    expect((await post("/api/chat", body("hidden"), "learner")).status).toBe(404);
    expect((await post("/api/chat", body("practice"), "peer")).status).toBe(404);
    expect(await db.select().from(taskSupportEvents)).toEqual([]);
    expect(streamChat).not.toHaveBeenCalled();
  });
});

describe("つまずきの検知 (cron)", () => {
  const now = new Date("2026-10-14T03:00:00Z"); // 水曜 12:00 (日本時間)
  const stumbles = () =>
    db
      .select()
      .from(notifications)
      .where(eq(notifications.type, "learner_stumble"))
      .orderBy(notifications.id);
  const keepActive = (date = "2026-10-13") =>
    db.insert(studyActivity).values({ tenantId: "ses", userId: "learner", date, watchedSec: 60 });
  async function streak(taskId: string, count: number, startedAt: Date) {
    await db.insert(taskLocalRuns).values({
      userId: "learner",
      taskId,
      tenantId: "ses",
      contentHash: HASH,
      failedRuns: count,
      failureStreak: count,
      streakStartedAt: startedAt,
      lastOutcome: "failed",
      firstRunAt: startedAt,
      lastRunAt: new Date(now.getTime() - 60_000),
    });
  }

  it("平日の数え方は週末を飛ばす", () => {
    expect(weekdaysBetween("2026-10-08", "2026-10-14")).toBe(3); // 金・月・火
    expect(weekdaysBetween("2026-10-08", "2026-10-13")).toBe(2);
    expect(weekdaysBetween("2026-10-13", "2026-10-14")).toBe(0);
  });

  it("同じ課題で 1 時間以上失敗が続くと担当講師に 1 度だけ知らせ、1 日 1 通にまとめる", async () => {
    await keepActive();
    await streak("practice", 5, new Date(now.getTime() - 2 * HOUR));
    await streak("second", 6, new Date(now.getTime() - 30 * 60_000)); // まだ試行錯誤の途中
    await notifyStumbles(db, now);
    await notifyStumbles(db, now);
    let sent = await stumbles();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ userId: "teacher", tenantId: "ses" });
    expect(sent[0]?.payload).toMatchObject({ signal: "local-failures", task_ids: ["practice"] });
    expect((await runRow("practice"))?.streakAlertedAt).toEqual(now);

    // 同じ日に別の課題の連続が条件を満たしても、翌日に回す。
    const later = new Date(now.getTime() + 2 * HOUR);
    await notifyStumbles(db, later);
    expect(await stumbles()).toHaveLength(1);
    expect((await runRow("second"))?.streakAlertedAt).toBeNull();
    const nextDay = new Date(now.getTime() + 24 * HOUR);
    await notifyStumbles(db, nextDay);
    sent = await stumbles();
    expect(sent).toHaveLength(2);
    expect(sent.map((n) => n.payload.task_ids)).toContainEqual(["second"]);
  });

  it("合格して連続が切れたら、知らせた印も消える", async () => {
    await keepActive();
    await streak("practice", 5, new Date(now.getTime() - 2 * HOUR));
    await notifyStumbles(db, now);
    await post(
      "/api/tasks/local-result",
      { taskId: "practice", contentHash: HASH, outcome: "passed" },
      "learner",
    );
    expect(await runRow("practice")).toMatchObject({ failureStreak: 0, streakAlertedAt: null });
  });

  it("平日 3 日学習の記録がなければ、止まった期間ごとに 1 度だけ知らせる", async () => {
    await keepActive("2026-10-08");
    await notifyStumbles(db, new Date("2026-10-13T03:00:00Z")); // 金・月だけ
    expect(await stumbles()).toEqual([]);
    await notifyStumbles(db, now);
    await notifyStumbles(db, new Date(now.getTime() + 24 * HOUR));
    const sent = await stumbles();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.payload).toMatchObject({ signal: "idle", last_active: "2026-10-08" });
  });

  const bAttempt = (id: string, attempt: number, verdict: "pass" | "resubmit" | "fail") =>
    db.insert(submissions).values({
      id,
      tenantId: "ses",
      studentId: "learner",
      taskId: "B",
      taskContentHash: HASH,
      taskKind: "assessment-b",
      submissionMode: "submit",
      stageTitle: "開発環境",
      assignmentTitle: "確認B",
      code: "",
      attempt,
      verdict,
      status: verdict === "pass" ? "passed" : verdict === "fail" ? "failed" : "resubmit",
      submittedAt: new Date(now.getTime() - (5 - attempt) * HOUR),
      reviewedAt: new Date(now.getTime() - (4 - attempt) * HOUR),
    });

  it("確認Bの再提出・不合格を 1 度だけ知らせる", async () => {
    await keepActive();
    await bAttempt("b-fail", 1, "resubmit");
    await notifyStumbles(db, now);
    await notifyStumbles(db, now);
    const sent = await stumbles();
    expect(sent.map((n) => n.payload)).toMatchObject([
      { signal: "assessment-b", submission_id: "b-fail" },
    ]);
  });

  it("落ちた後の試行で合格していれば知らせない", async () => {
    await keepActive();
    await bAttempt("b-fail", 1, "fail");
    await bAttempt("b-pass", 2, "pass");
    await db
      .insert(taskProgress)
      .values({ userId: "learner", taskId: "B", contentHash: HASH, status: "passed" });
    await notifyStumbles(db, now);
    expect(await stumbles()).toEqual([]);
  });

  it("後の合格が再提出に訂正されていれば、前の不合格も知らせる", async () => {
    await keepActive();
    await bAttempt("b-fail", 1, "fail");
    await bAttempt("b-corrected", 2, "resubmit");
    await notifyStumbles(db, now);
    expect((await stumbles()).map((n) => n.payload.submission_id).sort()).toEqual([
      "b-corrected",
      "b-fail",
    ]);
  });

  it("合格した後の試行で落ちたら知らせる (課題の進捗が合格のままでも見落とさない)", async () => {
    await keepActive();
    await bAttempt("b-pass", 1, "pass");
    await bAttempt("b-regress", 2, "resubmit");
    // 合格がある限り、課題の進捗は合格のまま残る (reviewTaskSubmission と同じ)。
    await db
      .insert(taskProgress)
      .values({ userId: "learner", taskId: "B", contentHash: HASH, status: "passed" });
    await notifyStumbles(db, now);
    expect((await stumbles()).map((n) => n.payload)).toMatchObject([
      { signal: "assessment-b", submission_id: "b-regress" },
    ]);
  });

  describe("人に回る提出が続く", () => {
    let order = 0;
    beforeEach(() => {
      order = 0;
    });
    /** 新形式の提出 1 件と、その提出に当てた AI の一次レビュー。古いものから順に足す。 */
    async function judged(
      outcome: "confirmed" | "escalated",
      reasons: string[] = ["rubric-unmet"],
      opts: { mode?: "submit" | "consult"; at?: Date; appliedAt?: Date } = {},
    ) {
      const id = `judged-${++order}`;
      const at = opts.at ?? new Date(now.getTime() - (20 - order) * HOUR);
      await db.insert(submissions).values({
        id,
        tenantId: "ses",
        studentId: "learner",
        taskId: "practice",
        taskContentHash: HASH,
        taskKind: "basic",
        submissionMode: opts.mode ?? "submit",
        stageTitle: "開発環境",
        assignmentTitle: `課題${order}`,
        code: "",
        submittedAt: at,
        aiReviewStatus: outcome,
      });
      await db.insert(aiReviews).values({
        submissionId: id,
        tenantId: "ses",
        taskId: "practice",
        taskContentHash: HASH,
        taskKind: "basic",
        outcome,
        routeReasons: reasons as never,
        promptVersion: "test",
        thresholdVersion: "test",
        disposition: "applied",
        appliedAt: opts.appliedAt ?? new Date(at.getTime() + 60_000),
        createdAt: at,
      });
      return id;
    }
    /** AI の判定待ちの提出 (新形式・相談でない)。判定はまだ当たっていない。 */
    async function pending() {
      const id = `judged-${++order}`;
      const at = new Date(now.getTime() - (20 - order) * HOUR);
      await db.insert(submissions).values({
        id,
        tenantId: "ses",
        studentId: "learner",
        taskId: "practice",
        taskContentHash: HASH,
        taskKind: "basic",
        submissionMode: "submit",
        stageTitle: "開発環境",
        assignmentTitle: `課題${order}`,
        code: "",
        submittedAt: at,
        aiReviewStatus: "queued",
      });
      return id;
    }
    /** 判定待ちの提出に、あとから AI の判定が当たった。 */
    async function resolve(id: string, outcome: "confirmed" | "escalated") {
      await db.update(submissions).set({ aiReviewStatus: outcome }).where(eq(submissions.id, id));
      await db.insert(aiReviews).values({
        submissionId: id,
        tenantId: "ses",
        taskId: "practice",
        taskContentHash: HASH,
        taskKind: "basic",
        outcome,
        routeReasons: outcome === "escalated" ? ["rubric-unmet"] : [],
        promptVersion: "test",
        thresholdVersion: "test",
        disposition: "applied",
        appliedAt: new Date(now.getTime() - 60_000),
        createdAt: new Date(now.getTime() - 60_000),
      });
    }
    const escalationAlerts = async () =>
      (await stumbles()).filter((n) => n.payload.signal === "review-escalations");

    it(`AI が続けて ${REVIEW_ESCALATION_STREAK} 件人に回したら、続きごとに 1 度だけ知らせる`, async () => {
      await keepActive();
      await judged("confirmed");
      const first = await judged("escalated", ["rubric-unmet"]);
      await judged("escalated", ["low-confidence"]);
      await notifyStumbles(db, now);
      expect(await escalationAlerts()).toEqual([]);
      const third = await judged("escalated", ["machine-check", "ai-unavailable"]);
      await notifyStumbles(db, now);
      await notifyStumbles(db, now);
      let sent = await escalationAlerts();
      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({ userId: "teacher", tenantId: "ses" });
      expect(sent[0]?.payload).toMatchObject({
        learner_id: "learner",
        submission_ids: [first, "judged-3", third],
        task_ids: ["practice"],
      });
      expect(sent[0]?.body).toContain("必須項目に「満たさない」がある");
      // 続きが伸びても知らせ直さない。
      await judged("escalated");
      await notifyStumbles(db, now);
      expect(await escalationAlerts()).toHaveLength(1);
      // AI で合格して切れたあとの新しい続きは、改めて知らせる。
      await judged("confirmed");
      for (let i = 0; i < REVIEW_ESCALATION_STREAK; i++) await judged("escalated");
      await notifyStumbles(db, now);
      sent = await escalationAlerts();
      expect(sent).toHaveLength(2);
    });

    it("AI や教材の都合だけで回った提出と、講師への相談は数えない", async () => {
      await keepActive();
      await judged("escalated");
      await judged("escalated", ["ai-unavailable"]);
      await judged("escalated", ["no-rubric", "solution-leak", "misplaced-finding"]);
      await judged("escalated", ["consult"], { mode: "consult" });
      await judged("escalated", ["low-confidence"]);
      await notifyStumbles(db, now);
      expect(await escalationAlerts()).toEqual([]);
      await judged("escalated", ["rubric-undetermined"]);
      await notifyStumbles(db, now);
      expect((await escalationAlerts())[0]?.payload.submission_ids).toEqual([
        "judged-1",
        "judged-5",
        "judged-6",
      ]);
    });

    const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * HOUR);

    it("前の提出の判定が遅れて当たり、続きがそろったときも知らせる (1 度だけ)", async () => {
      await keepActive();
      await judged("escalated", ["rubric-unmet"], { at: daysAgo(6), appliedAt: daysAgo(6) });
      // 2 件目の判定はやり直しで遅れ、3 件目より後に当たった。
      await judged("escalated", ["rubric-unmet"], { at: daysAgo(5), appliedAt: daysAgo(0.1) });
      await judged("escalated", ["rubric-unmet"], { at: daysAgo(4), appliedAt: daysAgo(4) });
      await notifyStumbles(db, now);
      await notifyStumbles(db, now);
      const sent = await escalationAlerts();
      expect(sent.map((n) => n.payload.submission_ids)).toEqual([
        ["judged-1", "judged-2", "judged-3"],
      ]);
    });

    it("30 日を超えて続く続きに足しても知らせ直さず、AI の合格で切れたあとの新しい続きは知らせる", async () => {
      await keepActive();
      // 40 日前に AI で合格し、35 日前から人に回る提出が続いている。
      await judged("confirmed", [], { at: daysAgo(40), appliedAt: daysAgo(40) });
      for (const d of [35, 34, 33])
        await judged("escalated", ["rubric-unmet"], { at: daysAgo(d), appliedAt: daysAgo(d) });
      await notifyStumbles(db, daysAgo(32.9));
      expect(await escalationAlerts()).toHaveLength(1);
      // 続きの最初の提出が 30 日の期間から落ちても、同じ続きなので知らせ直さない。
      for (const d of [3, 2, 1])
        await judged("escalated", ["rubric-unmet"], { at: daysAgo(d), appliedAt: daysAgo(d) });
      await notifyStumbles(db, now);
      expect(await escalationAlerts()).toHaveLength(1);
      // AI で合格して切れたあとの新しい続きは、改めて知らせる。
      await judged("confirmed", [], { at: daysAgo(0.9), appliedAt: daysAgo(0.9) });
      for (const d of [0.8, 0.7, 0.6])
        await judged("escalated", ["rubric-unmet"], { at: daysAgo(d), appliedAt: daysAgo(d) });
      await notifyStumbles(db, now);
      await notifyStumbles(db, now);
      expect(await escalationAlerts()).toHaveLength(2);
    });

    it("続きは提出の日時で 30 日さかのぼる (判定が遅れて当たった古い提出は数えない)", async () => {
      await keepActive();
      // 35 日前の提出の判定が、29 日前に当たった。
      await judged("escalated", ["rubric-unmet"], { at: daysAgo(35), appliedAt: daysAgo(29) });
      await judged("escalated", ["rubric-unmet"], { at: daysAgo(2) });
      await judged("escalated", ["rubric-unmet"], { at: daysAgo(1) });
      await notifyStumbles(db, now);
      expect(await escalationAlerts()).toEqual([]);
    });

    it("間に AI の判定待ちの提出があれば、そこで止めて判定が当たるのを待つ (人に回れば知らせる)", async () => {
      await keepActive();
      await judged("escalated");
      await judged("escalated");
      const waiting = await pending();
      await judged("escalated");
      await notifyStumbles(db, now);
      expect(await escalationAlerts()).toEqual([]);
      await resolve(waiting, "escalated");
      await notifyStumbles(db, now);
      expect((await escalationAlerts()).map((n) => n.payload.submission_ids)).toEqual([
        ["judged-1", "judged-2", waiting, "judged-4"],
      ]);
    });

    it("判定待ちの提出が AI の合格になれば、続きは無かったことになる", async () => {
      await keepActive();
      await judged("escalated");
      await judged("escalated");
      const waiting = await pending();
      await judged("escalated");
      await resolve(waiting, "confirmed");
      await notifyStumbles(db, now);
      expect(await escalationAlerts()).toEqual([]);
    });

    it("AI で合格した提出を挟めば続きは切れ、古い続きは知らせない", async () => {
      await keepActive();
      await judged("escalated");
      await judged("escalated");
      await judged("confirmed");
      await judged("escalated");
      await notifyStumbles(db, now);
      expect(await escalationAlerts()).toEqual([]);

      await db.delete(aiReviews);
      await db.delete(submissions);
      const old = new Date(now.getTime() - 5 * 24 * HOUR);
      for (let i = 0; i < REVIEW_ESCALATION_STREAK; i++)
        await judged("escalated", ["rubric-unmet"], { at: new Date(old.getTime() + i * HOUR) });
      await notifyStumbles(db, now);
      expect(await escalationAlerts()).toEqual([]);
    });
  });

  describe("ヒントを最後まで開く", () => {
    const NEXT = "b".repeat(64);
    const minutesAgo = (n: number) => new Date(now.getTime() - n * 60_000);
    /** 課題の今の版の方針 (`support`)。 */
    const support = (taskId: string, hintLevels: number, solutionUnlock = "after-hints") =>
      db
        .update(tasks)
        .set({
          definition: JSON.stringify({
            skills: { assesses: ["html"] },
            support: { hintLevels, solutionUnlock },
          }),
        })
        .where(eq(tasks.id, taskId));
    /** ヒントを 1 段開いた記録 (`POST /api/tasks/help/open` が残すもの)。 */
    const open = (
      taskId: string,
      level: number,
      at: Date,
      opts: { afterPass?: boolean; contentHash?: string; tenantId?: string; userId?: string } = {},
    ) =>
      db.insert(taskHelpOpens).values({
        tenantId: opts.tenantId ?? "ses",
        userId: opts.userId ?? "learner",
        taskId,
        item: "hint",
        level,
        contentHash: opts.contentHash ?? HASH,
        privateHash: HASH,
        afterPass: opts.afterPass ?? false,
        openedAt: at,
      });
    const hintAlerts = async () =>
      (await stumbles()).filter((n) => n.payload.signal === "hints-exhausted");

    beforeEach(async () => {
      await keepActive();
      await support("practice", 3);
      await support("second", 2, "passed");
    });

    it("合格前に最後の段まで開くと担当講師に 1 度だけ知らせ、途中の段では知らせない", async () => {
      await open("practice", 1, minutesAgo(120));
      await open("practice", 2, minutesAgo(90));
      await notifyStumbles(db, now);
      expect(await hintAlerts()).toEqual([]);

      await open("practice", 3, minutesAgo(30));
      await notifyStumbles(db, now);
      await notifyStumbles(db, now);
      const sent = await hintAlerts();
      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({
        userId: "teacher",
        tenantId: "ses",
        title: "受講者さんがヒントを最後まで開きました",
        payload: { learner_id: "learner", signal: "hints-exhausted", task_ids: ["practice"] },
      });
      expect(sent[0]?.body).toContain(
        "「課題1」で、合格前にヒントを最後の段 (3段目) まで開きました",
      );
      expect(sent[0]?.body).toContain("次は解答例を開ける段です");
      expect(sent[0]?.body).toContain("責めずに");
      // 翌日も、期間の最後まで、同じ出来事を送り直さない。
      await notifyStumbles(db, new Date(now.getTime() + 24 * HOUR));
      await notifyStumbles(db, new Date(now.getTime() + 70 * HOUR));
      expect(await hintAlerts()).toHaveLength(1);
    });

    it("合格後に開いた段と、今は合格している課題は知らせない", async () => {
      await open("practice", 1, minutesAgo(60));
      await open("practice", 2, minutesAgo(50));
      await open("practice", 3, minutesAgo(40), { afterPass: true });
      await open("second", 1, minutesAgo(60));
      await open("second", 2, minutesAgo(50));
      await db
        .insert(taskProgress)
        .values({ userId: "learner", taskId: "second", contentHash: HASH, status: "ai-passed" });
      await notifyStumbles(db, now);
      expect(await hintAlerts()).toEqual([]);
    });

    it("ヒントが 0 段の課題 (確認A・B・統合と、段を持たない課題) は知らせない", async () => {
      // 確認 B は定義に段を書いても 0 段として扱う (種別の方針がヒントを持たない)。
      await support("B", 2, "passed");
      await open("B", 1, minutesAgo(60));
      await open("B", 2, minutesAgo(50));
      await support("practice", 0, "passed");
      await open("practice", 1, minutesAgo(40));
      await notifyStumbles(db, now);
      expect(await hintAlerts()).toEqual([]);
    });

    it("最後の段に届いたのが期間より前なら、新しい版で開き直しても知らせない", async () => {
      const old = new Date(now.getTime() - 4 * 24 * HOUR);
      await open("practice", 1, old);
      await open("practice", 2, old);
      await open("practice", 3, old);
      await open("practice", 3, minutesAgo(30), { contentHash: NEXT });
      await notifyStumbles(db, now);
      expect(await hintAlerts()).toEqual([]);
    });

    it("段の進み具合は版をまたいで数える", async () => {
      const old = new Date(now.getTime() - 5 * 24 * HOUR);
      await open("practice", 1, old);
      await open("practice", 2, old);
      await open("practice", 3, minutesAgo(30), { contentHash: NEXT });
      await notifyStumbles(db, now);
      expect((await hintAlerts()).map((n) => n.payload.task_ids)).toEqual([["practice"]]);
    });

    it("同じ日に最後まで開いた課題は 1 通にまとめ、送った後に届いた課題は翌日に回す", async () => {
      await open("second", 1, minutesAgo(100));
      await open("second", 2, minutesAgo(90));
      for (const level of [1, 2, 3]) await open("practice", level, minutesAgo(80 - level));
      await notifyStumbles(db, now);
      let sent = await hintAlerts();
      expect(sent.map((n) => n.payload.task_ids)).toEqual([["second", "practice"]]);
      expect(sent[0]?.body).toContain("「課題2」");
      expect(sent[0]?.body).toContain("(ほか1件の課題でも最後まで開いています)");
      // 解答例を開く条件が「合格後」の課題は、解答例の案内を添えない。
      expect(sent[0]?.body).not.toContain("解答例");

      await db.delete(notifications);
      await db.delete(taskHelpOpens);
      for (const level of [1, 2, 3]) await open("practice", level, minutesAgo(10));
      await notifyStumbles(db, now);
      await open("second", 1, new Date(now.getTime() + HOUR));
      await open("second", 2, new Date(now.getTime() + HOUR));
      await notifyStumbles(db, new Date(now.getTime() + 2 * HOUR));
      expect((await hintAlerts()).map((n) => n.payload.task_ids)).toEqual([["practice"]]);
      const nextDay = new Date(now.getTime() + 24 * HOUR);
      await notifyStumbles(db, nextDay);
      await notifyStumbles(db, nextDay);
      sent = await hintAlerts();
      expect(sent.map((n) => n.payload.task_ids)).toEqual([["practice"], ["second"]]);
    });

    it("担当のない受講者と、別のテナントの記録は知らせない", async () => {
      for (const level of [1, 2, 3])
        await open("practice", level, minutesAgo(30), { userId: "peer" });
      for (const level of [1, 2, 3])
        await open("practice", level, minutesAgo(30), { tenantId: "other" });
      await notifyStumbles(db, now);
      expect(await hintAlerts()).toEqual([]);
    });
  });

  it("担当のない受講者、無効な講師、別テナントの講師には知らせない", async () => {
    await keepActive("2026-10-01");
    await db.delete(learnerInstructors);
    await notifyStumbles(db, now);
    expect(await stumbles()).toEqual([]);

    await db.insert(learnerInstructors).values({ learnerId: "learner", instructorId: "outsider" });
    await notifyStumbles(db, now);
    expect(await stumbles()).toEqual([]);

    await db.delete(learnerInstructors);
    await db.insert(learnerInstructors).values({ learnerId: "learner", instructorId: "teacher" });
    await db.update(profiles).set({ disabled: true }).where(eq(profiles.id, "teacher"));
    await notifyStumbles(db, now);
    expect(await stumbles()).toEqual([]);
  });
});
