/**
 * Issue #235 — 「今日の練習セット」(SM-2 による 10 問の出題) の API テスト。
 * 対象ルート: ./interview-prep.js (GET/PUT practice-set, PUT progress/:no)
 */

import type { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PRACTICE_SET_SIZE } from "@stella/shared/interview/practice-set";
import { addStudyDays, toStudyDate } from "@stella/shared/study/activity";

import type { Env } from "../env.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { interviewPrepRoute } from "./interview-prep.js";
import {
  INTERVIEW_PREP_PRACTICE_SET_PATH,
  INTERVIEW_PREP_QUESTIONS_PATH,
  SEED_PROFILES,
  createInterviewPrepTestEnv,
  createInterviewPrepTestState,
  interviewPrepPracticeSetPath,
  interviewPrepProgressPath,
  mintInterviewPrepTestToken,
  practiceQuestionBank,
  progressRow,
  type InterviewPrepTestState,
} from "./interview-prep.test-helpers.js";

vi.mock("../lib/audit.js", () => ({
  clientIp: () => "127.0.0.1",
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/authz.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/authz.js")>();
  const { SEED_PROFILES, TEST_JWT_SECRET, createInterviewPrepTestDb } = await import(
    "./interview-prep.test-helpers.js"
  );

  const profileByToken: Record<string, (typeof SEED_PROFILES)[keyof typeof SEED_PROFILES]> = {
    "seed-learner": SEED_PROFILES.learner,
    "seed-learner-b": SEED_PROFILES.learnerB,
    "seed-instructor": SEED_PROFILES.instructor,
    "seed-admin": SEED_PROFILES.admin,
  };

  return {
    ...actual,
    getCaller: vi.fn(async (c) => {
      const header = c.req.header("Authorization") ?? "";
      const token = header.replace(/^Bearer\s+/i, "").trim();
      const { jwtVerify } = await import("jose");
      const { payload } = await jwtVerify(token, new TextEncoder().encode(TEST_JWT_SECRET), {
        issuer: "stella-api",
        audience: "stella-web",
      });
      const profile = profileByToken[payload.sub as string];
      if (!profile) throw new actual.ApiError("プロフィールが見つかりません", 403);

      const state = (globalThis as { __interviewPrepTestState?: InterviewPrepTestState })
        .__interviewPrepTestState;
      if (!state) throw new actual.ApiError("テスト state が未設定です", 500);

      const noParam = Number.parseInt(c.req.param("no") ?? "", 10);
      return {
        caller: {
          id: profile.id,
          tenantId: profile.tenantId,
          role: profile.role,
          name: profile.id,
          email: null,
        },
        db: createInterviewPrepTestDb(state, {
          callerId: profile.id,
          callerTenantId: profile.tenantId,
          targetProfileId: c.req.param("profileId") || c.req.query("profileId") || undefined,
          questionNo: Number.isInteger(noParam) ? noParam : undefined,
          rowId: c.req.param("id") || undefined,
        }),
      };
    }),
  };
});

const TODAY = toStudyDate(new Date());
const YESTERDAY = addStudyDays(TODAY, -1);
const NEXT_MONTH = addStudyDays(TODAY, 30);

/**
 * レスポンス本文のうち、 このファイルのテストが実際に読む範囲。
 * 正本は interview-prep.ts の serializePracticeSet / 各ハンドラ。
 */
type SerializedSet = {
  id: string;
  question_nos: number[];
  completed_nos: number[];
  status: string;
  started_percent: number;
  total: number;
  remaining: number;
  next_no: number | null;
};
/** GET /practice-set (セットがある場合)。 */
type PracticeSetBody = { set: SerializedSet; resumed: boolean; rows: { no: number }[] };
/** PUT /practice-set/:id (終了)。 */
type FinishBody = {
  set: SerializedSet;
  summary: { gainedPercent: number; currentPercent: number };
};
/** PUT 自己評価。 */
type SelfRatingBody = { set: SerializedSet | null; due_date: string | null };

const createTestApp = (env: Env) => mountTestApp(env, interviewPrepRoute);

describe("今日の練習セット (#235)", () => {
  let env: Env;
  let state: InterviewPrepTestState;
  let token: string;

  beforeEach(async () => {
    env = createInterviewPrepTestEnv();
    state = createInterviewPrepTestState();
    state.questions = practiceQuestionBank(14);
    state.assignments.set(`ses:${SEED_PROFILES.learner.id}`, {
      tenantId: "ses",
      profileId: SEED_PROFILES.learner.id,
      categories: ["PHP"],
      interviewDate: null,
      interviewNote: null,
      assignedBy: SEED_PROFILES.sales.id,
    });
    (globalThis as { __interviewPrepTestState?: InterviewPrepTestState }).__interviewPrepTestState =
      state;
    token = await mintInterviewPrepTestToken("seed-learner");
  });

  const getSet = async (app: Hono<{ Bindings: Env }>) =>
    request(app, env, INTERVIEW_PREP_PRACTICE_SET_PATH, { token });

  it("10 問のセットを作り、 質問本体を出題順で返す", async () => {
    const { app } = createTestApp(env);

    const res = await getSet(app);
    expect(res.status).toBe(200);
    const body = await json<PracticeSetBody>(res);

    expect(body.set.question_nos).toHaveLength(PRACTICE_SET_SIZE);
    expect(body.set.status).toBe("active");
    expect(body.resumed).toBe(false);
    expect(body.rows.map((r: { no: number }) => r.no)).toEqual(body.set.question_nos);
    // 改善点メモ (#234) も同梱して、 答える直前に再表示できるようにする
    expect(body.rows[0]).toHaveProperty("fix_notes");
    expect(state.practiceSets).toHaveLength(1);
  });

  it("要練習・未練習を優先し、 期日前の得意な質問は出さない", async () => {
    // 201: もう一度 (期日到来) / 202: 練習OK で期日到来 / 203〜210: 未練習
    // 211〜214: 練習OK で期日が先 (= 得意) → 上位 10 問で埋まるので出題されない
    state.progress = [
      progressRow({
        questionNo: 201,
        status: "read",
        lastResult: "again",
        srsDueDate: YESTERDAY,
        srsReps: 0,
        srsIntervalDays: 1,
      }),
      progressRow({
        questionNo: 202,
        status: "confident",
        lastResult: "good",
        srsDueDate: YESTERDAY,
        srsReps: 2,
        srsIntervalDays: 6,
      }),
      ...[211, 212, 213, 214].map((no) =>
        progressRow({
          questionNo: no,
          status: "confident",
          lastResult: "good",
          srsDueDate: NEXT_MONTH,
          srsReps: 3,
          srsIntervalDays: 30,
        }),
      ),
    ];
    const { app } = createTestApp(env);

    const body = await json<PracticeSetBody>(await getSet(app));
    const nos: number[] = body.set.question_nos;

    expect(nos[0]).toBe(201); // 「もう一度」が最優先
    expect(nos).toContain(202); // 期日を過ぎた 練習OK は再出題される
    // 未練習 (203〜209 の 7 問) が「もう一度」の次に来る
    expect(nos.slice(1, 9)).toEqual([203, 204, 205, 206, 207, 208, 209, 210]);
    // 期日前の得意な質問は 10 問が埋まっているので出さない
    for (const no of [211, 212, 213, 214]) expect(nos).not.toContain(no);
  });

  it("中断したセットは同じ内容で再開でき、 準備ホームにも残る", async () => {
    const { app } = createTestApp(env);
    const first = await json<PracticeSetBody>(await getSet(app));

    await request(app, env, interviewPrepProgressPath(first.set.question_nos[0]), {
      method: "PUT",
      body: JSON.stringify({ event: "confident", setId: first.set.id }),
      token,
    });

    const resumed = await json<PracticeSetBody>(await getSet(app));
    expect(resumed.resumed).toBe(true);
    expect(resumed.set.id).toBe(first.set.id);
    expect(resumed.set.question_nos).toEqual(first.set.question_nos);
    expect(resumed.set.completed_nos).toEqual([first.set.question_nos[0]]);
    expect(resumed.set.next_no).toBe(first.set.question_nos[1]);
    expect(state.practiceSets).toHaveLength(1);

    const questions = await json<{ activeSet: Record<string, unknown> }>(
      await request(app, env, INTERVIEW_PREP_QUESTIONS_PATH, { token }),
    );
    expect(questions.activeSet).toMatchObject({
      id: first.set.id,
      total: PRACTICE_SET_SIZE,
      completed: 1,
      remaining: PRACTICE_SET_SIZE - 1,
    });
  });

  it("「できた」で SM-2 が進み、 「もう一度」は翌日に戻る", async () => {
    const { app } = createTestApp(env);

    const good = await request(app, env, interviewPrepProgressPath(201), {
      method: "PUT",
      body: JSON.stringify({ event: "confident" }),
      token,
    });
    expect(good.status).toBe(200);
    expect(await good.json()).toMatchObject({
      ok: true,
      interval_days: 1,
      due_date: addStudyDays(TODAY, 1),
    });

    // 2 回目の「できた」で間隔が 6 日へ伸びる (SM-2)
    const again = await request(app, env, interviewPrepProgressPath(201), {
      method: "PUT",
      body: JSON.stringify({ event: "confident" }),
      token,
    });
    expect(await again.json()).toMatchObject({
      interval_days: 6,
      due_date: addStudyDays(TODAY, 6),
    });
    expect(state.progress[0]).toMatchObject({
      status: "confident",
      lastResult: "good",
      srsReps: 2,
      practicedCount: 2,
    });

    // 「もう一度」で ease が下がり、 翌日に戻る = 次のセットの最優先へ
    const retry = await request(app, env, interviewPrepProgressPath(201), {
      method: "PUT",
      body: JSON.stringify({ event: "practiced" }),
      token,
    });
    expect(await retry.json()).toMatchObject({
      interval_days: 1,
      due_date: addStudyDays(TODAY, 1),
    });
    expect(state.progress[0]).toMatchObject({
      // 「練習OK」の表示は下げない (準備率の巻き戻しを避ける) が、 出題は最優先に戻る
      status: "confident",
      lastResult: "again",
      srsReps: 0,
    });
    expect(state.progress[0]?.srsEase).toBeLessThan(2.5);
  });

  it("「もう一度」を重ねると ease が下がり続け、 次の「できた」も減点後の値から進む", async () => {
    const { app } = createTestApp(env);
    const practiced = async () =>
      request(app, env, interviewPrepProgressPath(201), {
        method: "PUT",
        body: JSON.stringify({ event: "practiced" }),
        token,
      });

    await practiced();
    // 初回の誤答: 2.5 - 0.32
    expect(state.progress[0]?.srsEase).toBeCloseTo(2.18, 5);

    // 「もう一度」は reps を 0 に戻すが、 ease の減点は引き継ぐ (未練習扱いにしない)
    await practiced();
    expect(state.progress[0]?.srsEase).toBeCloseTo(1.86, 5);

    const good = await request(app, env, interviewPrepProgressPath(201), {
      method: "PUT",
      body: JSON.stringify({ event: "confident" }),
      token,
    });
    expect(await good.json()).toMatchObject({ interval_days: 1 });
    // 新規カードの 2.6 ではなく、 減点後の 1.86 + 0.1
    expect(state.progress[0]?.srsEase).toBeCloseTo(1.96, 5);
  });

  it("「型を読んだ」は SM-2 を動かさない", async () => {
    const { app } = createTestApp(env);
    const res = await request(app, env, interviewPrepProgressPath(201), {
      method: "PUT",
      body: JSON.stringify({ event: "read" }),
      token,
    });
    expect(await res.json()).toMatchObject({ ok: true, due_date: null, interval_days: null });
    expect(state.progress[0]).toMatchObject({ srsDueDate: null, lastResult: null, srsReps: 0 });
  });

  it("終了サマリに できた n/10 と準備率の伸びが出る", async () => {
    const { app } = createTestApp(env);
    const started = await json<PracticeSetBody>(await getSet(app));
    const nos: number[] = started.set.question_nos;
    expect(started.set.started_percent).toBe(0);

    for (const no of nos.slice(0, 3)) {
      await request(app, env, interviewPrepProgressPath(no), {
        method: "PUT",
        body: JSON.stringify({ event: "confident", setId: started.set.id }),
        token,
      });
    }
    await request(app, env, interviewPrepProgressPath(nos[3] as number), {
      method: "PUT",
      body: JSON.stringify({ event: "practiced", setId: started.set.id }),
      token,
    });

    const res = await request(app, env, interviewPrepPracticeSetPath(started.set.id), {
      method: "PUT",
      body: JSON.stringify({ status: "done" }),
      token,
    });
    expect(res.status).toBe(200);
    const body = await json<FinishBody>(res);

    expect(body.set.status).toBe("done");
    expect(body.summary).toMatchObject({
      total: PRACTICE_SET_SIZE,
      confident: 3,
      again: 1,
      skipped: 6,
      startedPercent: 0,
    });
    // 14 問中 3 問が 練習OK → 21%
    expect(body.summary.currentPercent).toBe(21);
    expect(body.summary.gainedPercent).toBe(21);

    // 終了後は「途中のセット」が消え、 次の GET で新しいセットが始まる
    const next = await json<PracticeSetBody>(await getSet(app));
    expect(next.resumed).toBe(false);
    expect(next.set.id).not.toBe(started.set.id);
  });

  it("消化記録は版数を進めながら 1 問ずつ積み上がる (取りこぼさない)", async () => {
    const { app } = createTestApp(env);
    const started = await json<PracticeSetBody>(await getSet(app));
    const nos: number[] = started.set.question_nos;
    expect(state.practiceSets[0]?.version).toBe(0);

    for (const [i, no] of nos.slice(0, 3).entries()) {
      await request(app, env, interviewPrepProgressPath(no), {
        method: "PUT",
        body: JSON.stringify({ event: "confident", setId: started.set.id }),
        token,
      });
      // 版数が進む = 同時更新は where で弾かれて読み直しに回る
      expect(state.practiceSets[0]?.version).toBe(i + 1);
      expect(state.practiceSets[0]?.completedNos).toEqual(nos.slice(0, i + 1));
    }
  });

  it("同じ質問をやり直すと最後の自己評価が残る", async () => {
    const { app } = createTestApp(env);
    const started = await json<PracticeSetBody>(await getSet(app));
    const no: number = started.set.question_nos[0];
    const rate = async (event: string) =>
      request(app, env, interviewPrepProgressPath(no), {
        method: "PUT",
        body: JSON.stringify({ event, setId: started.set.id }),
        token,
      });

    await rate("confident");
    expect(state.practiceSets[0]?.confidentNos).toEqual([no]);

    await rate("practiced");
    expect(state.practiceSets[0]?.completedNos).toEqual([no]);
    expect(state.practiceSets[0]?.confidentNos).toEqual([]);
  });

  it("割当が変わって出題できなくなった進行中セットは畳んで作り直す", async () => {
    // PHP (201〜) で始めたセットの質問が、 JS へ割当変更で可視範囲から外れるケース
    state.questions = [
      ...practiceQuestionBank(12),
      ...practiceQuestionBank(12, 301).map((q) => ({ ...q, categories: ["JS"] })),
    ];
    const { app } = createTestApp(env);
    const started = await json<PracticeSetBody>(await getSet(app));
    expect(started.set.question_nos.every((no: number) => no < 300)).toBe(true);

    state.assignments.set(`ses:${SEED_PROFILES.learner.id}`, {
      tenantId: "ses",
      profileId: SEED_PROFILES.learner.id,
      categories: ["JS"],
      interviewDate: null,
      interviewNote: null,
      assignedBy: SEED_PROFILES.sales.id,
    });

    const next = await json<PracticeSetBody>(await getSet(app));

    expect(next.resumed).toBe(false);
    expect(next.set.id).not.toBe(started.set.id);
    expect(next.set.question_nos.every((no: number) => no >= 301)).toBe(true);
    // 古いセットは畳まれ、 進行中は常に 1 つ (= 以後もセットを始められる)
    expect(state.practiceSets.filter((r) => r.status === "active")).toHaveLength(1);
    expect(state.practiceSets.find((r) => r.id === started.set.id)?.status).toBe("done");
  });

  it("終了済みセットへの記録は set_recorded=false で返す (黙って成功にしない)", async () => {
    const { app } = createTestApp(env);
    const started = await json<PracticeSetBody>(await getSet(app));
    const nos: number[] = started.set.question_nos;

    // 別タブが先に終了した状況
    await request(app, env, interviewPrepPracticeSetPath(started.set.id), {
      method: "PUT",
      body: JSON.stringify({ status: "done" }),
      token,
    });

    const res = await request(app, env, interviewPrepProgressPath(nos[0] as number), {
      method: "PUT",
      body: JSON.stringify({ event: "confident", setId: started.set.id }),
      token,
    });

    expect(res.status).toBe(200);
    const body = await json<SelfRatingBody>(res);
    // 自己評価そのものは保存される (SM-2 は進む) が、 セットには記録されていない
    expect(body).toMatchObject({ ok: true, set: null, set_recorded: false });
    expect(body.due_date).not.toBeNull();
    expect(state.practiceSets[0]?.completedNos).toEqual([]);
  });

  it("setId 無しの自己評価は set_recorded=true (記録するものが無い)", async () => {
    const { app } = createTestApp(env);
    const res = await request(app, env, interviewPrepProgressPath(201), {
      method: "PUT",
      body: JSON.stringify({ event: "confident" }),
      token,
    });
    expect(await res.json()).toMatchObject({ set: null, set_recorded: true });
  });

  it("一部だけ割当から外れたら、 セットを見える質問だけに刈り込む", async () => {
    // PHP (201〜212) で始めたセットのうち、 一部だけが JS へ移って見えなくなるケース
    state.questions = practiceQuestionBank(12);
    const { app } = createTestApp(env);
    const started = await json<PracticeSetBody>(await getSet(app));
    const nos: number[] = started.set.question_nos;
    expect(nos).toHaveLength(PRACTICE_SET_SIZE);

    // 先頭 2 問だけ答えておく
    for (const no of nos.slice(0, 2)) {
      await request(app, env, interviewPrepProgressPath(no), {
        method: "PUT",
        body: JSON.stringify({ event: "confident", setId: started.set.id }),
        token,
      });
    }
    // セット後半の 3 問を割当外へ (カテゴリを JS に変える)
    const revoked = nos.slice(-3);
    state.questions = (state.questions ?? []).map((q) =>
      revoked.includes(q.no) ? { ...q, categories: ["JS"] } : q,
    );

    const resumed = await json<PracticeSetBody>(await getSet(app));

    // 同じセットのまま、 見えなくなった質問だけが落ちる
    expect(resumed.resumed).toBe(true);
    expect(resumed.set.id).toBe(started.set.id);
    expect(resumed.set.question_nos).toEqual(nos.filter((no) => !revoked.includes(no)));
    expect(resumed.set.total).toBe(PRACTICE_SET_SIZE - 3);
    // 残りの数え方も揃うので、 全部答えれば自動終了できる
    expect(resumed.set.remaining).toBe(PRACTICE_SET_SIZE - 3 - 2);
    expect(resumed.set.completed_nos).toEqual(nos.slice(0, 2));
  });

  it("出題対象でなくなった質問 (A → B / 逆質問) も刈り込む", async () => {
    state.questions = practiceQuestionBank(12);
    const { app } = createTestApp(env);
    const started = await json<PracticeSetBody>(await getSet(app));
    const nos: number[] = started.set.question_nos;

    // 教材更新で 1 問が B 推奨に、 1 問が逆質問になる (どちらも可視のまま)
    const [toB, toReverse] = [nos[2] as number, nos[3] as number];
    state.questions = (state.questions ?? []).map((q) => {
      if (q.no === toB) return { ...q, freq: "B" as const };
      if (q.no === toReverse) return { ...q, is_reverse: 1 };
      return q;
    });

    const resumed = await json<PracticeSetBody>(await getSet(app));

    expect(resumed.set.id).toBe(started.set.id);
    expect(resumed.set.question_nos).not.toContain(toB);
    expect(resumed.set.question_nos).not.toContain(toReverse);
    expect(resumed.set.total).toBe(PRACTICE_SET_SIZE - 2);
  });

  it("他人のセットは終了できない", async () => {
    const { app } = createTestApp(env);
    const started = await json<PracticeSetBody>(await getSet(app));

    const otherToken = await mintInterviewPrepTestToken("seed-learner-b");
    const res = await request(app, env, interviewPrepPracticeSetPath(started.set.id), {
      method: "PUT",
      body: JSON.stringify({ status: "done" }),
      token: otherToken,
    });

    expect(res.status).toBe(404);
    expect(state.practiceSets[0]?.status).toBe("active");
  });

  it("受講者以外は練習セットを取得できない", async () => {
    const { app } = createTestApp(env);
    const staffToken = await mintInterviewPrepTestToken("seed-instructor");

    const res = await request(app, env, INTERVIEW_PREP_PRACTICE_SET_PATH, { token: staffToken });

    expect(res.status).toBe(403);
    expect(state.practiceSets).toHaveLength(0);
  });

  it("割当が無ければセットを作らない (全問からランダムへ誘導)", async () => {
    state.assignments.clear();
    state.questions = practiceQuestionBank(14);
    const { app } = createTestApp(env);

    const body = await json<PracticeSetBody>(await getSet(app));

    expect(body.set).toBeNull();
    expect(body.rows).toEqual([]);
    expect(state.practiceSets).toHaveLength(0);
  });

  it("status が done 以外の終了リクエストは 400", async () => {
    const { app } = createTestApp(env);
    const started = await json<PracticeSetBody>(await getSet(app));

    const res = await request(app, env, interviewPrepPracticeSetPath(started.set.id), {
      method: "PUT",
      body: JSON.stringify({ status: "active" }),
      token,
    });

    expect(res.status).toBe(400);
  });
});
