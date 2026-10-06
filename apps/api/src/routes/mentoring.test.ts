/**
 * 受講者の育成 (#38): 手元の確認の要約・担当での絞り込み・支援の記録・つまずきの検知。
 * 実 SQLite (全マイグレーション) に対して route と cron を通す。
 */

import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskSupportRecord } from "@stella/shared/tasks/support-record";
import { getDb } from "../db/client.js";
import {
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
  taskLocalRuns,
  taskProgress,
  taskSupportEvents,
  tasks,
  tenants,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { notifyStumbles, weekdaysBetween } from "../lib/stumble-alerts.js";
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
