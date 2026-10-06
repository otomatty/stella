/**
 * 週次の育成メモ (#38・07 §6.5): cron の積み・書き (AI と機械的な要約)・講師の画面の権限と対応。
 * 実 SQLite (全マイグレーション) に対して cron と route を通す。AI の呼び出しだけを差し替える。
 */

import type { MentorMemoView } from "@stella/shared/mentoring/weekly-memo";
import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db/client.js";
import {
  aiReviews,
  enrollments,
  learnerInstructors,
  mentorMemos,
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
import { completeJsonSchema } from "../lib/anthropic-complete.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import {
  enqueueWeeklyMemos,
  MAX_MEMO_ATTEMPTS,
  memoWeekOf,
  runMentorMemoCron,
} from "../lib/mentor-memo.js";
import { MENTOR_MEMO_PROMPT_VERSION } from "../lib/mentor-memo-prompt.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { mentorMemosRoute } from "./mentor-memos.js";

vi.mock("../lib/anthropic-complete.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/anthropic-complete.js")>();
  return { ...actual, completeJsonSchema: vi.fn() };
});
const complete = vi.mocked(completeJsonSchema);

const SECRET = "mentor-memo-test-secret";
const HASH = "a".repeat(64);
const MIN = 60_000;
/** 水曜 12:00 (日本時間)。メモを書く週は 10/5 (月) 〜 10/11 (日)。 */
const NOW = new Date("2026-10-14T03:00:00Z");
const WEEK = "2026-10-05";

let database: ReturnType<typeof sqliteD1>;
let env: Env;
let db: ReturnType<typeof getDb>;
let app: ReturnType<typeof mountTestApp>["app"];

const token = (id: string) => signAccessToken(SECRET, id, `${id}@example.test`);
const get = async (path: string, as: string) => request(app, env, path, { token: await token(as) });
const post = async (path: string, body: unknown, as: string) =>
  request(app, env, path, { token: await token(as), method: "POST", body: JSON.stringify(body) });

const AI_MEMO = {
  summary: "予定より少し遅れていますが、課題に1件合格しました。",
  observations: ["4日学習しました", "人に回った提出が1件あります"],
  suggestedAction: "message",
  actionReason: "人に回った提出があるためです。",
  messageDraft: "先週もおつかれさまでした。詰まったら気軽に相談してください。",
};
const answer = (output: unknown, stopReason: "end_turn" | "refusal" = "end_turn") => ({
  text: typeof output === "string" ? output : JSON.stringify(output),
  stopReason,
  model: "memo-model",
  usage: { inputTokens: 10, outputTokens: 5, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 },
});

beforeEach(async () => {
  database = sqliteD1();
  env = { DB: database.binding, AUTH_JWT_SECRET: SECRET } as Env;
  db = getDb(env);
  app = mountTestApp(env, mentorMemosRoute).app;
  complete.mockReset();
  await db.batch([
    db.insert(tenants).values([
      { id: "ses", name: "SES" },
      { id: "other", name: "Other" },
    ]),
    db.insert(profiles).values([
      {
        id: "learner",
        tenantId: "ses",
        displayName: "山田 太郎",
        email: "taro@example.test",
        role: "student",
      },
      { id: "peer", tenantId: "ses", displayName: "担当のない受講者", role: "student" },
      { id: "late", tenantId: "ses", displayName: "今週から始めた受講者", role: "student" },
      { id: "teacher", tenantId: "ses", displayName: "担当講師", role: "instructor" },
      { id: "teacher2", tenantId: "ses", displayName: "別の講師", role: "instructor" },
      { id: "admin", tenantId: "ses", displayName: "管理者", role: "admin" },
      { id: "outsider", tenantId: "other", displayName: "他テナントの講師", role: "instructor" },
    ]),
    db.insert(stages).values({
      id: "stage",
      tenantId: "ses",
      slug: "dev-env-basics",
      title: "開発環境",
      format: 2,
    }),
    db.insert(sections).values({ id: "unit", stageId: "stage", title: "入口" }),
    db.insert(tasks).values({
      id: "practice",
      sectionId: "unit",
      title: "はじめてのページ",
      kind: "basic",
      pattern: "page",
      skills: { uses: [], assesses: ["html"] },
      estimatedMinutes: 10,
      order: 0,
      contentHash: HASH,
      definition: "{}",
      bundle: "{}",
    }),
    db.insert(skills).values({ id: "html", title: "HTML" }),
    db.insert(enrollments).values([
      {
        tenantId: "ses",
        userId: "learner",
        stageId: "stage",
        status: "active",
        enrolledAt: new Date("2026-09-28T00:00:00Z"),
      },
      {
        tenantId: "ses",
        userId: "peer",
        stageId: "stage",
        status: "active",
        enrolledAt: new Date("2026-09-28T00:00:00Z"),
      },
      {
        tenantId: "ses",
        userId: "late",
        stageId: "stage",
        status: "active",
        enrolledAt: new Date("2026-10-13T00:00:00Z"),
      },
    ]),
    db.insert(learnerInstructors).values([
      { learnerId: "learner", instructorId: "teacher" },
      { learnerId: "late", instructorId: "teacher" },
    ]),
  ]);
  await db.update(stages).set({ status: "published" }).where(eq(stages.tenantId, "ses"));
});
afterEach(() => database.sqlite.close());

/** 週の中と外に、材料になる記録を置く。 */
async function seedWeek() {
  const at = (iso: string) => new Date(iso);
  await db.insert(studyActivity).values([
    {
      tenantId: "ses",
      userId: "learner",
      date: "2026-10-06",
      watchedSec: 600,
      completedLessons: 2,
    },
    { tenantId: "ses", userId: "learner", date: "2026-10-08", watchedSec: 0, completedLessons: 1 },
    {
      tenantId: "ses",
      userId: "learner",
      date: "2026-10-12",
      watchedSec: 999,
      completedLessons: 9,
    },
  ]);
  const base = {
    tenantId: "ses",
    studentId: "learner",
    taskId: "practice",
    taskContentHash: HASH,
    taskKind: "basic",
    stageTitle: "開発環境",
    assignmentTitle: "はじめてのページ",
    code: "",
  };
  await db.insert(submissions).values([
    { ...base, id: "old", submissionMode: "submit", submittedAt: at("2026-10-01T00:00:00Z") },
    {
      ...base,
      id: "s1",
      submissionMode: "submit",
      submittedAt: at("2026-10-07T01:00:00Z"),
      supportLog: [{ kind: "hint", at: "2026-10-07T00:30:00.000Z" }],
    },
    {
      ...base,
      id: "s2",
      submissionMode: "consult",
      submittedAt: at("2026-10-09T01:00:00Z"),
      // 前の試行の支援が繰り返し載っても 1 件に数える。
      supportLog: [{ kind: "hint", at: "2026-10-07T00:30:00.000Z" }],
    },
  ]);
  await db.insert(aiReviews).values({
    submissionId: "s1",
    tenantId: "ses",
    taskId: "practice",
    taskContentHash: HASH,
    taskKind: "basic",
    outcome: "escalated",
    routeReasons: ["rubric-unmet"],
    rubricResults: [
      {
        id: "naming",
        criterion: "関数名が戻り値の意味を表している",
        required: true,
        rule: true,
        result: "unmet",
        evidence: [],
        note: "",
      },
    ],
    findings: [
      {
        file: "index.js",
        startLine: 1,
        endLine: 1,
        severity: "major",
        comment: "見出しの階層が飛んでいます",
      },
    ],
    promptVersion: "t",
    thresholdVersion: "t",
    disposition: "applied",
    appliedAt: at("2026-10-07T02:00:00Z"),
    createdAt: at("2026-10-07T02:00:00Z"),
  });
  await db.insert(submissionReviews).values({
    submissionId: "s1",
    source: "human",
    verdict: "resubmit",
    notes: "直してください",
    createdAt: at("2026-10-08T00:00:00Z"),
  });
  await db.insert(taskProgress).values({
    userId: "learner",
    taskId: "practice",
    status: "passed",
    contentHash: HASH,
    updatedAt: at("2026-10-08T03:00:00Z"),
    passedAt: at("2026-10-08T03:00:00Z"),
  });
  await db.insert(skillEvidence).values([
    {
      tenantId: "ses",
      userId: "learner",
      skillId: "html",
      level: "supported",
      submissionId: "old",
      assisted: true,
      createdAt: at("2026-10-01T00:00:00Z"),
    },
    {
      tenantId: "ses",
      userId: "learner",
      skillId: "html",
      level: "independent",
      submissionId: "s1",
      assisted: false,
      createdAt: at("2026-10-08T03:00:00Z"),
    },
  ]);
  await db.insert(notifications).values([
    {
      id: "stumble:idle:learner:teacher:2026-10-01",
      userId: "teacher",
      tenantId: "ses",
      type: "learner_stumble",
      payload: { learner_id: "learner", signal: "idle" },
      createdAt: at("2026-10-06T00:00:00Z"),
    },
    {
      id: "stumble:idle:peer:teacher:2026-10-01",
      userId: "teacher",
      tenantId: "ses",
      type: "learner_stumble",
      payload: { learner_id: "peer", signal: "idle" },
      createdAt: at("2026-10-06T00:00:00Z"),
    },
    {
      id: "stumble:local:learner:teacher:2026-10-13",
      userId: "teacher",
      tenantId: "ses",
      type: "learner_stumble",
      payload: { learner_id: "learner", signal: "local-failures" },
      createdAt: at("2026-10-13T00:00:00Z"),
    },
  ]);
  await db.insert(taskSupportEvents).values([
    {
      tenantId: "ses",
      userId: "learner",
      taskId: "practice",
      kind: "ai-chat",
      createdAt: at("2026-10-06T05:00:00Z"),
    },
    {
      tenantId: "ses",
      userId: "learner",
      taskId: "practice",
      kind: "ai-chat",
      createdAt: at("2026-10-13T05:00:00Z"),
    },
  ]);
  await db.insert(taskLocalRuns).values({
    userId: "learner",
    taskId: "practice",
    tenantId: "ses",
    contentHash: HASH,
    failedRuns: 4,
    failureStreak: 4,
    streakStartedAt: at("2026-10-13T00:00:00Z"),
    lastOutcome: "failed",
    firstRunAt: at("2026-10-01T00:00:00Z"),
    lastRunAt: at("2026-10-13T01:00:00Z"),
  });
}

const memoRows = () => db.select().from(mentorMemos);

describe("週次の育成メモを積む (cron)", () => {
  it("前の週を、担当のいる・週の終わりまでに始めていた受講者にだけ 1 枚積む", async () => {
    expect(memoWeekOf("2026-10-14")).toBe(WEEK);
    expect(memoWeekOf("2026-10-12")).toBe(WEEK);
    expect(await enqueueWeeklyMemos(db, NOW)).toBe(1);
    expect(await enqueueWeeklyMemos(db, new Date(NOW.getTime() + 15 * MIN))).toBe(0);
    const rows = await memoRows();
    expect(rows).toMatchObject([{ learnerId: "learner", weekStart: WEEK, state: "queued" }]);
  });

  it("週の途中で修了した受講者にも積む。週より前に修了した受講者には積まない", async () => {
    await db
      .update(enrollments)
      .set({ status: "completed", completedAt: new Date("2026-10-08T03:00:00Z") })
      .where(eq(enrollments.userId, "learner"));
    expect(await enqueueWeeklyMemos(db, NOW)).toBe(1);
    await db.delete(mentorMemos);
    await db
      .update(enrollments)
      .set({ completedAt: new Date("2026-10-01T03:00:00Z") })
      .where(eq(enrollments.userId, "learner"));
    expect(await enqueueWeeklyMemos(db, NOW)).toBe(0);
  });

  it("担当が無効・別テナントの講師なら積まない", async () => {
    await db.update(profiles).set({ disabled: true }).where(eq(profiles.id, "teacher"));
    expect(await enqueueWeeklyMemos(db, NOW)).toBe(0);
    await db.delete(learnerInstructors);
    await db.insert(learnerInstructors).values({ learnerId: "learner", instructorId: "outsider" });
    expect(await enqueueWeeklyMemos(db, NOW)).toBe(0);
  });

  it("同じ受講者・週は一意 (同時に積んでも 2 枚にならない)", async () => {
    await enqueueWeeklyMemos(db, NOW);
    await expect(
      db.insert(mentorMemos).values({
        tenantId: "ses",
        learnerId: "learner",
        weekStart: WEEK,
        nextAttemptAt: NOW,
      }),
    ).rejects.toThrow();
  });
});

describe("週次の育成メモを書く (cron)", () => {
  it("API キーが無ければ AI を呼ばず、週の材料から機械的な要約で確定する", async () => {
    await seedWeek();
    expect(await runMentorMemoCron(env, db, () => NOW.getTime())).toEqual(["fallback"]);
    expect(complete).not.toHaveBeenCalled();
    const [memo] = await memoRows();
    expect(memo).toMatchObject({
      state: "ready",
      source: "fallback",
      failure: "unavailable",
      promptVersion: MENTOR_MEMO_PROMPT_VERSION,
      suggestedAction: "message",
      leaseId: null,
    });
    expect(memo?.generatedAt).toEqual(NOW);
    expect(memo?.material).toMatchObject({
      week: { start: WEEK, end: "2026-10-11" },
      activity: { activeDays: 4, studyMinutes: 10, completedLessons: 3, submissions: 2 },
      passedTaskCount: 1,
      passedTasks: [{ title: "はじめてのページ", kind: "basic" }],
      skills: {
        counts: { supported: 0, independent: 1, retained: 0 },
        changed: [{ skill: "HTML", level: "independent" }],
      },
      stumbles: { idle: 1 },
      failureStreaks: [{ title: "はじめてのページ", streak: 4 }],
      support: { hint: 1, "ai-chat": 1, consult: 1 },
      reviews: {
        aiConfirmed: 0,
        aiEscalated: 1,
        escalationReasons: { "rubric-unmet": 1 },
        unmetCriteria: [{ criterion: "関数名が戻り値の意味を表している", count: 1 }],
        humanPass: 0,
        humanResubmit: 1,
      },
    });
    expect(memo?.material?.pace).not.toBeNull();
    // 次の cron は書き直さない。
    expect(await runMentorMemoCron(env, db, () => NOW.getTime() + 15 * MIN)).toEqual([]);
  });

  it("AI が書いたメモを残し、AI には名前・メール・コード・所見を渡さない", async () => {
    env.ANTHROPIC_API_KEY = "sk-test";
    env.MENTOR_MEMO_MODEL = "memo-model-setting";
    await seedWeek();
    complete.mockResolvedValue(answer(AI_MEMO));
    expect(await runMentorMemoCron(env, db, () => NOW.getTime())).toEqual(["ai"]);
    const [memo] = await memoRows();
    expect(memo).toMatchObject({
      source: "ai",
      failure: null,
      model: "memo-model",
      summary: AI_MEMO.summary,
      suggestedAction: "message",
      messageDraft: AI_MEMO.messageDraft,
    });
    const args = complete.mock.calls[0]?.[0];
    expect(args?.model).toBe("memo-model-setting");
    const sent = JSON.stringify({ system: args?.system, messages: args?.messages });
    expect(sent).not.toContain("山田");
    expect(sent).not.toContain("taro@example.test");
    expect(sent).not.toContain("見出しの階層が飛んでいます");
    expect(sent).not.toContain("learner");
    expect(sent).toContain("関数名が戻り値の意味を表している");
  });

  it("時間切れは次の cron でやり直し、最後は機械的な要約で確定する", async () => {
    env.ANTHROPIC_API_KEY = "sk-test";
    const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
    complete.mockRejectedValue(timeout);
    let at = NOW.getTime();
    for (let i = 1; i < MAX_MEMO_ATTEMPTS; i++) {
      expect(await runMentorMemoCron(env, db, () => at)).toEqual(["retry"]);
      const [memo] = await memoRows();
      expect(memo).toMatchObject({ state: "queued", attempts: i, leaseId: null });
      expect(memo?.lastError).toContain("timeout");
      // 次の試行の時刻まではリースを取らない。
      expect(await runMentorMemoCron(env, db, () => at + MIN)).toEqual([]);
      at += 15 * MIN;
    }
    expect(await runMentorMemoCron(env, db, () => at)).toEqual(["fallback"]);
    expect((await memoRows())[0]).toMatchObject({
      state: "ready",
      source: "fallback",
      failure: "timeout",
      attempts: MAX_MEMO_ATTEMPTS,
    });
    expect(complete).toHaveBeenCalledTimes(MAX_MEMO_ATTEMPTS);
  });

  it("形の誤り・拒否はやり直さずに機械的な要約で確定する", async () => {
    env.ANTHROPIC_API_KEY = "sk-test";
    complete.mockResolvedValueOnce(answer({ ...AI_MEMO, suggestedAction: "call" }));
    expect(await runMentorMemoCron(env, db, () => NOW.getTime())).toEqual(["fallback"]);
    expect((await memoRows())[0]).toMatchObject({ source: "fallback", failure: "invalid-format" });

    await db.delete(mentorMemos);
    complete.mockResolvedValueOnce(answer("", "refusal"));
    expect(await runMentorMemoCron(env, db, () => NOW.getTime())).toEqual(["fallback"]);
    expect((await memoRows())[0]).toMatchObject({ source: "fallback", failure: "refusal" });
  });

  it("積んだあとに無効になった受講者のメモは書かずに消す", async () => {
    await enqueueWeeklyMemos(db, NOW);
    await db.update(profiles).set({ disabled: true }).where(eq(profiles.id, "learner"));
    expect(await runMentorMemoCron(env, db, () => NOW.getTime())).toEqual(["skipped"]);
    expect(await memoRows()).toEqual([]);
  });
});

describe("講師の画面 (GET /api/mentor-memos)", () => {
  type List = { week: string; weekEnd: string; memos: MentorMemoView[] };
  const list = async (as: string, query = "") => get(`/api/mentor-memos${query}`, as);

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    await seedWeek();
    await runMentorMemoCron(env, db, () => NOW.getTime());
  });
  afterEach(() => vi.useRealTimers());

  it("担当講師は自分の受講者のメモを読み、既定は前の週", async () => {
    const res = await list("teacher");
    expect(res.status).toBe(200);
    const body = await json<List>(res);
    expect(body).toMatchObject({ week: WEEK, weekEnd: "2026-10-11" });
    expect(body.memos).toMatchObject([
      { learnerId: "learner", learnerName: "山田 太郎", state: "ready", source: "fallback" },
    ]);
    expect(body.memos[0]?.material?.reviews.aiEscalated).toBe(1);
    // リースや使用量など運用の列は返さない。
    expect(JSON.stringify(body)).not.toContain("leaseId");
    const other = await json<List>(await list("teacher", "?week=2026-09-28"));
    expect(other.memos).toEqual([]);
  });

  it("担当外の講師・別テナントには見えず、受講者本人は読めない。管理者はテナントの全員を読む", async () => {
    expect((await json<List>(await list("teacher2"))).memos).toEqual([]);
    expect((await json<List>(await list("outsider"))).memos).toEqual([]);
    expect((await list("learner")).status).toBe(403);
    expect((await json<List>(await list("admin"))).memos).toHaveLength(1);
    // 担当を外れたら読めなくなる。
    await db.delete(learnerInstructors).where(eq(learnerInstructors.learnerId, "learner"));
    expect((await json<List>(await list("teacher"))).memos).toEqual([]);
  });

  it("週は月曜の日付だけを受け付ける", async () => {
    expect((await list("teacher", "?week=2026-10-06")).status).toBe(400);
    expect((await list("teacher", "?week=2026-13-01")).status).toBe(400);
  });
});

describe("講師の対応 (POST /api/mentor-memos/:id/actions)", () => {
  let memoId = "";
  beforeEach(async () => {
    await seedWeek();
    await runMentorMemoCron(env, db, () => NOW.getTime());
    memoId = (await memoRows())[0]?.id ?? "";
  });
  const act = (body: unknown, as = "teacher") =>
    post(`/api/mentor-memos/${memoId}/actions`, body, as);
  const learnerNotifications = () =>
    db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, "learner"), eq(notifications.type, "mentor_message")));

  it("一言は受講者への通知になり、本文は講師が書いた文だけを送る", async () => {
    const res = await act({ kind: "message", message: "  先週もおつかれさまでした。  " });
    expect(res.status, await res.clone().text()).toBe(200);
    const { memo } = await json<{ memo: MentorMemoView }>(res);
    expect(memo.actions).toMatchObject([
      { kind: "message", by: "teacher", detail: "先週もおつかれさまでした。" },
    ]);
    expect(memo.handledAt).not.toBeNull();
    const sent = await learnerNotifications();
    expect(sent).toMatchObject([
      {
        tenantId: "ses",
        title: "担当講師さんからの一言",
        body: "先週もおつかれさまでした。",
        payload: { from_id: "teacher" },
      },
    ]);
    expect(JSON.stringify(sent)).not.toContain("関数名");
  });

  it("ペースの調整は、調整後のペースをサーバーが読み直して残す。様子見も残す", async () => {
    await db
      .update(profiles)
      .set({ weeklyHours: 28, learningStartDate: "2026-09-28" })
      .where(eq(profiles.id, "learner"));
    await act({ kind: "pace", message: "ignored" });
    const res = await act({ kind: "watch" }, "admin");
    const { memo } = await json<{ memo: MentorMemoView }>(res);
    expect(memo.actions).toMatchObject([
      { kind: "pace", by: "teacher", detail: "週28時間 · 開始2026-09-28" },
      { kind: "watch", by: "admin" },
    ]);
    expect(memo.actions[1]?.detail).toBeUndefined();
    expect(await learnerNotifications()).toEqual([]);
  });

  it("担当外・受講者・別テナントは対応できず、空の一言と知らない対応は 400", async () => {
    expect((await act({ kind: "message", message: "x" }, "teacher2")).status).toBe(404);
    expect((await act({ kind: "message", message: "x" }, "outsider")).status).toBe(404);
    expect((await act({ kind: "message", message: "x" }, "learner")).status).toBe(403);
    expect((await act({ kind: "message", message: "  " })).status).toBe(400);
    expect((await act({ kind: "message", message: "あ".repeat(501) })).status).toBe(400);
    expect((await act({ kind: "call" })).status).toBe(400);
    expect(await learnerNotifications()).toEqual([]);
    expect((await memoRows())[0]?.actions).toEqual([]);
  });

  it("作成中のメモには対応できない", async () => {
    await db.update(mentorMemos).set({ state: "queued" });
    expect((await act({ kind: "watch" })).status).toBe(409);
  });
});
