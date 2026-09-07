/**
 * Phase 3a — 腕試し (SkillCheck) と飛び級の route テスト。
 *
 * 見ているのは **API 境界の責務** だけ:
 *   - 霧の星は受験させない (しかもフォーカス切り替えと同じ汎用文言で断る)
 *   - `full` のロック星 (1 歩先) は受験でき、合格すると飛び級で開く
 *   - 不合格では開かない / 設問の足りないステージは非対応と伝える
 *   - 出題にも採点結果にも正答・解説を載せない
 *
 * D1 は `lib/skill-check-data.js` / `lib/skill-map-data.js` を差し替えて、
 * インメモリの設問プールと解放集合で代用する (skill-map.test.ts と同じ流儀)。
 */

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SKILL_CHECK_DAILY_LIMIT } from "@stella/shared/skill-map/skill-check";
import { toStudyDate } from "@stella/shared/study/activity";

import type { Env } from "../env.js";
import { recordAudit } from "../lib/audit.js";
import type { ProfileRole } from "../lib/authz.js";
import { startSelfEnrollment } from "../lib/enrollment-write.js";
import {
  insertSkillCheckAttempt,
  loadCorrectOptionIds,
  loadSkillCheckAttemptCount,
  loadSkillCheckHistory,
  loadSkillCheckQuestions,
  loadStageQuestionIds,
  upsertStageUnlock,
} from "../lib/skill-check-data.js";
import type { SkillCheckAttemptRecord, SkillCheckQuestion } from "../lib/skill-check-data.js";
import {
  loadFocusCompletions,
  loadSkillMapSource,
  loadSkillProfileCounts,
  loadStudyDays,
} from "../lib/skill-map-data.js";
import { skillCheckRoute } from "./skill-check.js";
import { skillMapRoute } from "./skill-map.js";

vi.mock("../lib/skill-check-data.js", () => ({
  loadStageQuestionIds: vi.fn(),
  loadSkillCheckQuestions: vi.fn(),
  loadCorrectOptionIds: vi.fn(),
  loadSkillCheckHistory: vi.fn(),
  loadSkillCheckAttemptCount: vi.fn(),
  insertSkillCheckAttempt: vi.fn(),
  upsertStageUnlock: vi.fn(),
  loadUnlockedStageIds: vi.fn(),
}));

// 自己開始の登録は `lib/enrollment-write.js` に移った (Phase 3b)。腕試しの飛び級も
// 自己開始 API (`POST /api/stages/:id/start`) も同じ関数を通る。
vi.mock("../lib/enrollment-write.js", () => ({
  startSelfEnrollment: vi.fn(),
}));

// 発見教材 (Phase 4) は skill-map の応答に相乗りするので、ここでも読み出しを潰す。
vi.mock("../lib/discovery-data.js", () => ({
  loadApprovedDiscoverySummaries: vi.fn(async () => []),
  loadPassedDiscoveryIds: vi.fn(async () => new Set<string>()),
  loadPassedDiscoveryCount: vi.fn(async () => 0),
}));

vi.mock("../lib/skill-map-data.js", async (importOriginal) => ({
  // 差し替えるのは I/O を持つ口だけ。純粋なヘルパ (視界の段の申告など) は本物を使う。
  ...(await importOriginal<typeof import("../lib/skill-map-data.js")>()),
  // 開発モードはテストでは常に無効 (本番挙動を検証する)。
  isDevMode: () => false,
  wantsDevReveal: () => false,
  shouldRevealDevMap: () => false,
  loadSkillMapSource: vi.fn(),
  loadSkillProfileCounts: vi.fn(),
  loadStudyDays: vi.fn(),
  loadEnrolledStageIds: vi.fn(),
  loadFocusCompletions: vi.fn(),
  loadFocusStageId: vi.fn(),
  saveFocusStageId: vi.fn(),
}));

// 監査は best-effort の付随処理。飛び級の自己開始でも記録することだけ確かめる。
vi.mock("../lib/audit.js", () => ({
  clientIp: () => null,
  recordAudit: vi.fn(async () => undefined),
}));

const BASE_CALLER = {
  id: "seed-learner",
  tenantId: "ses",
  role: "student" as ProfileRole,
  name: "受講者",
  email: null,
};

/** テストごとに差し替える呼び出し元 (ロールを変える test がある)。 */
let caller: typeof BASE_CALLER;

vi.mock("../lib/authz.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/authz.js")>();
  return {
    ...actual,
    getCaller: vi.fn(async (c: { req: { header: (name: string) => string | undefined } }) => {
      const header = c.req.header("Authorization") ?? "";
      if (!header.startsWith("Bearer ")) {
        throw new actual.ApiError("Authorization ヘッダが必要です", 401);
      }
      return { caller, db: {} };
    }),
  };
});

const app = new Hono<{ Bindings: Env }>().route("/", skillCheckRoute).route("/", skillMapRoute);
const env = {} as Env;

const get = (path: string, auth = true) =>
  app.request(path, auth ? { headers: { Authorization: "Bearer test" } } : {}, env);

const post = (path: string, body: unknown) =>
  app.request(
    path,
    {
      method: "POST",
      headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    env,
  );

/**
 * 一本道 a → b → c → d → e。a / b はクリア済みなので c は unlocked、
 * **d は `full` の locked (= 飛び級の入口)**、e は霧 (受験できない)。
 * skill-map.test.ts と同じ形。
 *
 * 飛び級の入口を 1 歩先に置いてあるのは、視界の段が「触れてよいのは `full` だけ」に
 * 揃ったため (`docs/superpowers/specs/2026-08-30-skill-tree-fog-display-design.md`)。
 */
function lineSource(unlocked: Set<string>, enrolled: Set<string>) {
  const stage = (slug: string, prerequisites: string[]) => ({
    id: `id-${slug}`,
    slug,
    title: `${slug} の講座`,
    prerequisites,
    canDo: `${slug} ができる`,
    theme: "テーマ",
    category: "プログラミング",
  });
  return {
    stages: [
      stage("a", []),
      stage("b", ["a"]),
      stage("c", ["b"]),
      stage("d", ["c"]),
      stage("e", ["d"]),
    ],
    clearedStageIds: new Set(["id-a", "id-b"]),
    activeStageId: undefined,
    unlockedStageIds: unlocked,
    // 受講登録は **明示的に空** から始める。腕試しが受講登録ゲートの例外である
    // (登録が無くても受けられる) ことを、暗黙の undefined ではなく空集合で示す。
    enrolledStageIds: enrolled,
  };
}

/** 4 択 10 問。正解は常に `<id>-o1`。 */
function makeQuestions(ids: string[]): SkillCheckQuestion[] {
  return ids.map((id) => ({
    id,
    kind: "single" as const,
    prompt: `${id} の問題文`,
    points: questionPoints,
    options: [
      { id: `${id}-o1`, label: "正しい" },
      { id: `${id}-o2`, label: "誤り" },
    ],
  }));
}

/** インメモリの解放集合 (upsert が書き、skill-map の読み出しが読む)。 */
let unlockedIds: Set<string>;
/** インメモリの受講登録 (自己登録が書き、skill-map の `enrolled` が読む)。 */
let enrolledIds: Set<string>;
/** 記録された受験 (件数が次の受験票の種になる)。 */
let attempts: (SkillCheckAttemptRecord & { submittedAt: number })[];
/** 出題プール。テストごとに差し替えて「設問が足りない」を作る。 */
let pool: string[];
/** 1 問あたりの配点。0 にすると満点 0 のステージを作れる。 */
let questionPoints: number;
/**
 * テストの中の「いま」。1 日 3 回の上限が暦日で切り替わることを見るために、
 * 実時計ではなくこの値を進める (JST 10:00 から始める)。
 */
let clockMs: number;

/** 上限判定に使う JST の暦日キー。 */
const dayKey = (ms: number) => toStudyDate(ms);

beforeEach(() => {
  // 呼び出し履歴も消す (「呼ばれていない」を見るテストが前のテストの呼び出しを拾う)。
  vi.clearAllMocks();
  caller = { ...BASE_CALLER };
  unlockedIds = new Set<string>();
  enrolledIds = new Set<string>();
  attempts = [];
  pool = Array.from({ length: 20 }, (_, i) => `q${i}`);
  questionPoints = 1;
  clockMs = Date.parse("2026-08-27T01:00:00.000Z");

  vi.mocked(loadSkillMapSource).mockImplementation(async () =>
    lineSource(unlockedIds, enrolledIds),
  );
  vi.mocked(loadSkillProfileCounts).mockResolvedValue({
    completedLessons: 0,
    passedQuizzes: 0,
    clearedStages: 1,
  });
  vi.mocked(loadStudyDays).mockResolvedValue([]);
  vi.mocked(loadFocusCompletions).mockResolvedValue([]);

  vi.mocked(loadStageQuestionIds).mockImplementation(async () => pool);
  vi.mocked(loadSkillCheckQuestions).mockImplementation(async (_db, ids) => makeQuestions(ids));
  vi.mocked(loadCorrectOptionIds).mockImplementation(
    async (_db, ids) => new Map(ids.map((id) => [id, new Set([`${id}-o1`])])),
  );
  vi.mocked(loadSkillCheckHistory).mockImplementation(async (_db, _caller, stageId) => {
    const mine = attempts.filter((row) => row.stageId === stageId);
    const last = mine.at(-1);
    return {
      attemptCount: mine.length,
      attemptsToday: mine.filter((row) => dayKey(row.submittedAt) === dayKey(clockMs)).length,
      passed: mine.some((row) => row.passed),
      lastScore: last?.score ?? null,
      lastMaxScore: last?.maxScore ?? null,
      lastAttemptAt: null,
    };
  });
  vi.mocked(loadSkillCheckAttemptCount).mockImplementation(
    async (_db, _caller, stageId) => attempts.filter((row) => row.stageId === stageId).length,
  );
  // 本番は 1 文の INSERT が判定ごと行う (`lib/skill-check-data.ts`)。ここでは同じ規則を
  // インメモリで写し、route が結果コードをどう HTTP に写すかだけを見る。
  vi.mocked(insertSkillCheckAttempt).mockImplementation(async (_db, _caller, record) => {
    const mine = attempts.filter((row) => row.stageId === record.stageId);
    const today = mine.filter((row) => dayKey(row.submittedAt) === dayKey(clockMs)).length;
    if (today >= SKILL_CHECK_DAILY_LIMIT) return "daily_limit";
    if (mine.length !== record.expectedAttempt) return "stale_paper";
    attempts.push({ ...record, submittedAt: clockMs });
    return "recorded";
  });
  vi.mocked(upsertStageUnlock).mockImplementation(async (_db, _caller, stageId) => {
    unlockedIds.add(stageId);
  });
  vi.mocked(startSelfEnrollment).mockImplementation(async (_db, _caller, stageId) => {
    const created = !enrolledIds.has(stageId);
    enrolledIds.add(stageId);
    // route が見るのは「呼べたか」だけなので、行は最小限の形で返す。
    return { row: { id: `enr-${stageId}` }, created, reactivated: false } as Awaited<
      ReturnType<typeof startSelfEnrollment>
    >;
  });
});

interface CheckPayload {
  attempt?: number;
  stage_id: string;
  title?: string;
  state: string;
  visibility: string;
  supported: boolean;
  unsupported_reason?: string;
  test_out?: boolean;
  pass_score?: number;
  daily_limit?: number;
  attempts_today?: number;
  remaining_today?: number;
  questions?: SkillCheckQuestion[];
  history?: { attempt_count: number; passed: boolean };
}

async function fetchCheck(stageId: string): Promise<CheckPayload> {
  const res = await get(`/api/skill-check/${stageId}`);
  expect(res.status).toBe(200);
  const body = (await res.json()) as { skill_check: CheckPayload };
  return body.skill_check;
}

/** 出題された設問すべてに正答 (`-o1`) を返す解答。 */
function correctAnswers(questions: SkillCheckQuestion[]) {
  return questions.map((q) => ({ question_id: q.id, selected_option_ids: [`${q.id}-o1`] }));
}

/** 全問誤答。 */
function wrongAnswers(questions: SkillCheckQuestion[]) {
  return questions.map((q) => ({ question_id: q.id, selected_option_ids: [`${q.id}-o2`] }));
}

/** `/api/skill-map/mine` の星を id 引きで返す。 */
async function fetchMapStates(): Promise<
  Map<string, { state: string; visibility: string; enrolled?: boolean }>
> {
  const res = await get("/api/skill-map/mine");
  expect(res.status).toBe(200);
  const body = (await res.json()) as {
    skill_map: { stages: { id: string; state: string; visibility: string; enrolled?: boolean }[] };
  };
  return new Map(body.skill_map.stages.map((s) => [s.id, s]));
}

describe("GET /api/skill-check/:stageId", () => {
  it("認証が無ければ 401", async () => {
    const res = await get("/api/skill-check/id-d", false);
    expect(res.status).toBe(401);
  });

  it("霧の星は 400 (フォーカス切り替えと同じ汎用文言 = 飛び級は 1 歩先まで)", async () => {
    const res = await get("/api/skill-check/id-e");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("受講登録のないステージは選べません");
  });

  it("存在しない星も霧と同じ 400 / 同じ文言で断る (存在を漏らさない)", async () => {
    const res = await get("/api/skill-check/id-does-not-exist");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("受講登録のないステージは選べません");
  });

  it("1 歩先のロック星は受験でき、飛び級の入口だと伝える", async () => {
    const check = await fetchCheck("id-d");
    expect(check.visibility).toBe("full");
    expect(check.state).toBe("locked");
    expect(check.supported).toBe(true);
    expect(check.test_out).toBe(true);
    expect(check.pass_score).toBe(80);
    expect(check.questions).toHaveLength(10);
  });

  it("クリア済みの星でも受けられる (レベル測定) が、飛び級ではない", async () => {
    const check = await fetchCheck("id-a");
    expect(check.state).toBe("cleared");
    expect(check.supported).toBe(true);
    expect(check.test_out).toBe(false);
  });

  it("出題に正答も解説も含めない", async () => {
    const check = await fetchCheck("id-d");
    const serialized = JSON.stringify(check.questions);
    expect(serialized).not.toContain("is_correct");
    expect(serialized).not.toContain("isCorrect");
    expect(serialized).not.toContain("explanation");
  });

  it("設問が 5 問に満たないステージは腕試し非対応として返す", async () => {
    pool = ["q0", "q1", "q2", "q3"];
    const check = await fetchCheck("id-d");
    expect(check.supported).toBe(false);
    expect(check.unsupported_reason).toBe("not_enough_questions");
    expect(check.questions).toBeUndefined();
  });

  it("同じ受験の間は同じ受験票 (出題は乱数ではない)", async () => {
    const first = await fetchCheck("id-d");
    const second = await fetchCheck("id-d");
    expect(second.questions?.map((q) => q.id)).toEqual(first.questions?.map((q) => q.id));
  });

  it("受験を 1 回終えると次の受験票は入れ替わる", async () => {
    const first = await fetchCheck("id-d");
    await post("/api/skill-check/id-d", { answers: wrongAnswers(first.questions ?? []) });
    const next = await fetchCheck("id-d");
    expect(next.questions?.map((q) => q.id)).not.toEqual(first.questions?.map((q) => q.id));
    expect(next.history?.attempt_count).toBe(1);
  });
});

describe("POST /api/skill-check/:stageId — 飛び級", () => {
  it("ロック星で合格すると解放され、スキルマップで unlocked になり視界も広がる", async () => {
    const before = await fetchMapStates();
    expect(before.get("id-d")?.state).toBe("locked");
    expect(before.get("id-e")?.visibility).toBe("fog");

    const check = await fetchCheck("id-d");
    const res = await post("/api/skill-check/id-d", {
      answers: correctAnswers(check.questions ?? []),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result: { passed: boolean; unlocked: boolean; percent: number; can_do?: string };
    };
    expect(body.result.passed).toBe(true);
    expect(body.result.unlocked).toBe(true);
    expect(body.result.percent).toBe(100);
    expect(body.result.can_do).toBe("d ができる");
    expect(upsertStageUnlock).toHaveBeenCalledWith({}, caller, "id-d");

    const after = await fetchMapStates();
    expect(after.get("id-d")?.state).toBe("unlocked");
    // 飛び級で開いた星は視界の起点にもなる (その隣の e が霧から出る)。
    expect(after.get("id-e")?.visibility).toBe("full");
  });

  it("不合格なら解放しない (星は locked のまま)", async () => {
    const check = await fetchCheck("id-d");
    const res = await post("/api/skill-check/id-d", {
      answers: wrongAnswers(check.questions ?? []),
    });
    const body = (await res.json()) as {
      result: { passed: boolean; unlocked: boolean; can_do?: string };
    };
    expect(body.result.passed).toBe(false);
    expect(body.result.unlocked).toBe(false);
    // 不合格の応答に到達説明を出すと、ロック星の中身を漏らす。
    expect(body.result.can_do).toBeUndefined();
    expect(upsertStageUnlock).not.toHaveBeenCalled();
    expect((await fetchMapStates()).get("id-d")?.state).toBe("locked");
  });

  it("合格ラインは 80% (8/10 で合格・7/10 で不合格)", async () => {
    const check = await fetchCheck("id-d");
    const questions = check.questions ?? [];
    const mix = (correct: number) => [
      ...correctAnswers(questions.slice(0, correct)),
      ...wrongAnswers(questions.slice(correct)),
    ];

    const seven = await post("/api/skill-check/id-d", { answers: mix(7) });
    expect(((await seven.json()) as { result: { passed: boolean } }).result.passed).toBe(false);

    // 1 回受けたので受験票が変わる。取り直してから 8 問正解を送る。
    const next = await fetchCheck("id-d");
    const nextQuestions = next.questions ?? [];
    const eight = await post("/api/skill-check/id-d", {
      answers: [
        ...correctAnswers(nextQuestions.slice(0, 8)),
        ...wrongAnswers(nextQuestions.slice(8)),
      ],
    });
    expect(((await eight.json()) as { result: { passed: boolean } }).result.passed).toBe(true);
  });

  it("送られてきた設問だけを採点しない (易しい 1 問だけ送っても満点にならない)", async () => {
    const check = await fetchCheck("id-d");
    const one = (check.questions ?? []).slice(0, 1);
    const res = await post("/api/skill-check/id-d", { answers: correctAnswers(one) });
    const body = (await res.json()) as {
      result: { score: number; max_score: number; passed: boolean };
    };
    expect(body.result.max_score).toBe(10);
    expect(body.result.score).toBe(1);
    expect(body.result.passed).toBe(false);
  });

  it("採点結果に正答も解説も含めない", async () => {
    const check = await fetchCheck("id-d");
    const res = await post("/api/skill-check/id-d", {
      answers: correctAnswers(check.questions ?? []),
    });
    const text = await res.text();
    expect(text).not.toContain("correct_option_ids");
    expect(text).not.toContain("explanation");
    // 個別の正誤も返さない (何度でも受けられるので、解答集を作る材料にしない)。
    expect(text).not.toContain("results");
  });

  it("霧の星への直接 POST も 400 (GET を飛ばした飛び級を許さない)", async () => {
    const res = await post("/api/skill-check/id-e", { answers: [] });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe(
      "受講登録のないステージは選べません",
    );
    expect(upsertStageUnlock).not.toHaveBeenCalled();
  });

  it("設問が足りないステージへの POST は採点せず断る", async () => {
    pool = ["q0", "q1"];
    const res = await post("/api/skill-check/id-d", { answers: [] });
    expect(res.status).toBe(400);
    expect(insertSkillCheckAttempt).not.toHaveBeenCalled();
    expect(upsertStageUnlock).not.toHaveBeenCalled();
  });

  it("解答が空でも 200 で 0 点を返す (壊れた本文でも落ちない)", async () => {
    const res = await post("/api/skill-check/id-d", { answers: "not-an-array" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { result: { score: number; passed: boolean } };
    expect(body.result.score).toBe(0);
    expect(body.result.passed).toBe(false);
  });

  it("合否によらず受験を記録する (次の受験票の種になる)", async () => {
    const check = await fetchCheck("id-d");
    await post("/api/skill-check/id-d", { answers: wrongAnswers(check.questions ?? []) });
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.questionIds).toEqual(check.questions?.map((q) => q.id));
    expect(attempts[0]?.passed).toBe(false);
  });
});

describe("受験できるロール (SKILL_CHECK_ROLES)", () => {
  it("管理者は受講者と同じ腕試しを受けられる", async () => {
    caller = { ...BASE_CALLER, id: "seed-admin", role: "admin" };
    const check = await fetchCheck("id-d");
    expect(check.supported).toBe(true);
    const res = await post("/api/skill-check/id-d", {
      answers: correctAnswers(check.questions ?? []),
    });
    expect(res.status).toBe(200);
  });

  it.each(["instructor", "sales"] as const)("%s は出題も採点も 403", async (role) => {
    caller = { ...BASE_CALLER, id: `seed-${role}`, role };
    expect((await get("/api/skill-check/id-d")).status).toBe(403);
    const res = await post("/api/skill-check/id-d", { answers: [] });
    expect(res.status).toBe(403);
    // 403 で弾かれた受験は記録も解放もしない。
    expect(insertSkillCheckAttempt).not.toHaveBeenCalled();
    expect(upsertStageUnlock).not.toHaveBeenCalled();
  });
});

describe("受験票と提出の結び付け (別タブ)", () => {
  it("古い受験票の提出は採点も記録もしない (見ていない問題で不正解にしない)", async () => {
    // タブ A / タブ B が同じ受験票 (attempt = 0) を開いた状態。
    const tabA = await fetchCheck("id-d");
    const tabB = await fetchCheck("id-d");
    expect(tabB.attempt).toBe(0);

    // A が先に提出 → 受験は 1 回ぶん記録され、次の受験票は attempt = 1 になる。
    expect(
      (
        await post("/api/skill-check/id-d", {
          answers: correctAnswers(tabA.questions ?? []),
          attempt: tabA.attempt,
        })
      ).status,
    ).toBe(200);
    expect(attempts).toHaveLength(1);

    // B があとから提出。版が古いので比較交換で弾かれる。
    const stale = await post("/api/skill-check/id-d", {
      answers: correctAnswers(tabB.questions ?? []),
      attempt: tabB.attempt,
    });
    expect(stale.status).toBe(429);
    // 記録は増えない = 見ていない問題の不正解も、消費された受験回数も残らない。
    expect(attempts).toHaveLength(1);
  });

  it("版を送らない提出は従来どおり数え直す (古い画面のための保険)", async () => {
    const check = await fetchCheck("id-d");
    const res = await post("/api/skill-check/id-d", {
      answers: correctAnswers(check.questions ?? []),
    });
    expect(res.status).toBe(200);
    expect(attempts).toHaveLength(1);
  });
});

describe("受験回数の上限 (1 日 3 回)", () => {
  /** 受験票を取り直して全問正解を送る (1 回ぶんの受験)。 */
  const takeOnce = async (stageId = "id-d") => {
    const check = await fetchCheck(stageId);
    return post(`/api/skill-check/${stageId}`, {
      answers: wrongAnswers(check.questions ?? []),
    });
  };

  it("3 回目までは 200、4 回目は 429 で断る", async () => {
    for (let i = 0; i < SKILL_CHECK_DAILY_LIMIT; i++) {
      expect((await takeOnce()).status).toBe(200);
    }
    const over = await takeOnce();
    expect(over.status).toBe(429);
    expect(((await over.json()) as { error: string }).error).toBe(
      "本日の受験回数の上限に達しました。明日また挑戦できます",
    );
    // 上限で断った受験は履歴に積まない (次の受験票の種も動かさない)。
    expect(attempts).toHaveLength(SKILL_CHECK_DAILY_LIMIT);
  });

  it("日付が変わればまた受けられる (暦日は JST)", async () => {
    for (let i = 0; i < SKILL_CHECK_DAILY_LIMIT; i++) await takeOnce();
    expect((await takeOnce()).status).toBe(429);

    clockMs += 86_400_000;
    expect((await takeOnce()).status).toBe(200);
    expect(attempts).toHaveLength(SKILL_CHECK_DAILY_LIMIT + 1);
  });

  it("上限は星ごとに数える (別の星はまだ受けられる)", async () => {
    for (let i = 0; i < SKILL_CHECK_DAILY_LIMIT; i++) await takeOnce("id-d");
    expect((await takeOnce("id-d")).status).toBe(429);
    expect((await takeOnce("id-b")).status).toBe(200);
  });

  it("受ける前に「本日あと何回か」を返す", async () => {
    expect((await fetchCheck("id-d")).remaining_today).toBe(SKILL_CHECK_DAILY_LIMIT);
    await takeOnce();
    const after = await fetchCheck("id-d");
    expect(after.attempts_today).toBe(1);
    expect(after.remaining_today).toBe(SKILL_CHECK_DAILY_LIMIT - 1);
    expect(after.daily_limit).toBe(SKILL_CHECK_DAILY_LIMIT);
  });

  it("同じ受験票からの 2 通目 (並列相当) は 429 で、採点も記録もしない", async () => {
    const check = await fetchCheck("id-d");
    const answers = correctAnswers(check.questions ?? []);
    // 1 通目が記録される前に 2 通目が採点へ入った状況 = どちらも attemptCount 0 で
    // 受験票を導く。ここでは 1 通目を通したあと、同じ受験票を再送して再現する。
    const first = await post("/api/skill-check/id-d", { answers });
    expect(first.status).toBe(200);

    vi.mocked(loadSkillCheckAttemptCount).mockResolvedValueOnce(0);
    const second = await post("/api/skill-check/id-d", { answers });
    expect(second.status).toBe(429);
    expect(attempts).toHaveLength(1);
  });
});

describe("飛び級で開いた星の自己受講登録 (M4)", () => {
  it("合格すると enrollment が作られ、スキルマップで enrolled になる", async () => {
    expect((await fetchMapStates()).get("id-d")?.enrolled).toBe(false);

    const check = await fetchCheck("id-d");
    const res = await post("/api/skill-check/id-d", {
      answers: correctAnswers(check.questions ?? []),
    });
    expect(res.status).toBe(200);
    expect(startSelfEnrollment).toHaveBeenCalledWith({}, caller, "id-d");

    const after = await fetchMapStates();
    expect(after.get("id-d")?.state).toBe("unlocked");
    expect(after.get("id-d")?.enrolled).toBe(true);

    // 自己開始 API と同じ action で監査に残す (割当の記録が無くなったぶん、
    // 「いつこの星に入ったか」を追えるのはここだけ)。 入口は `via` で見分ける。
    expect(recordAudit).toHaveBeenCalledWith(
      {},
      caller,
      expect.objectContaining({
        action: "stage_self_start",
        targetId: "enr-id-d",
        metadata: expect.objectContaining({ stage_id: "id-d", via: "skill_check" }),
      }),
    );
  });

  it("既に登録のある星の合格では二重に作らない", async () => {
    enrolledIds.add("id-d");
    const check = await fetchCheck("id-d");
    await post("/api/skill-check/id-d", { answers: correctAnswers(check.questions ?? []) });
    // 呼びはするが、既存行は触らないので登録は 1 件のまま。
    await expect(vi.mocked(startSelfEnrollment).mock.results[0]?.value).resolves.toMatchObject({
      created: false,
    });
    expect(enrolledIds.size).toBe(1);
    // 登録が動いていない以上、監査にも積まない (再受験のたびに行が増えない)。
    expect(recordAudit).not.toHaveBeenCalled();
  });

  it("解放でない合格 (レベル測定) では登録を作らない", async () => {
    const check = await fetchCheck("id-b");
    await post("/api/skill-check/id-b", { answers: correctAnswers(check.questions ?? []) });
    expect(startSelfEnrollment).not.toHaveBeenCalled();
    expect(enrolledIds.size).toBe(0);
  });

  it("登録が無い学習者でも受験できる (腕試しは受講登録ゲートの例外)", async () => {
    expect(enrolledIds.size).toBe(0);
    const check = await fetchCheck("id-c");
    expect(check.supported).toBe(true);
    expect((await post("/api/skill-check/id-c", { answers: [] })).status).toBe(200);
  });
});

describe("記録と解放の順序", () => {
  it("解放を記録できなければ unlocked を返さず、再挑戦を促す", async () => {
    vi.mocked(upsertStageUnlock).mockRejectedValueOnce(new Error("D1 down"));
    const check = await fetchCheck("id-d");
    const res = await post("/api/skill-check/id-d", {
      answers: correctAnswers(check.questions ?? []),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result: { passed: boolean; unlocked: boolean; unlock_error?: string; can_do?: string };
    };
    expect(body.result.passed).toBe(true);
    expect(body.result.unlocked).toBe(false);
    expect(body.result.unlock_error).toContain("もう一度");
    // 開いていない星の到達説明は出さない。
    expect(body.result.can_do).toBeUndefined();
    // 解放できなかったので自己登録にも進まない。
    expect(startSelfEnrollment).not.toHaveBeenCalled();
    // 受験そのものは記録済み (回数を 1 つ使っている)。
    expect(attempts).toHaveLength(1);
  });

  it("解放済みの星を受け直しても upsertStageUnlock は呼ばない", async () => {
    const first = await fetchCheck("id-d");
    await post("/api/skill-check/id-d", { answers: correctAnswers(first.questions ?? []) });
    expect(upsertStageUnlock).toHaveBeenCalledTimes(1);

    // いまや id-d は unlocked。もう一度合格しても解放は書き足さない。
    const again = await fetchCheck("id-d");
    expect(again.test_out).toBe(false);
    const res = await post("/api/skill-check/id-d", {
      answers: correctAnswers(again.questions ?? []),
    });
    const body = (await res.json()) as { result: { passed: boolean; unlocked: boolean } };
    expect(body.result.passed).toBe(true);
    expect(body.result.unlocked).toBe(false);
    expect(upsertStageUnlock).toHaveBeenCalledTimes(1);
  });
});

describe("採点の頑健さ", () => {
  it("プールが 10 問以下だと受験票は入れ替わらない (受容した設計)", async () => {
    pool = Array.from({ length: 8 }, (_, i) => `q${i}`);
    const first = await fetchCheck("id-d");
    await post("/api/skill-check/id-d", { answers: wrongAnswers(first.questions ?? []) });
    const next = await fetchCheck("id-d");
    // 並び順は種で変わるが、顔ぶれはプールそのもの。だから回数上限が防波堤になる。
    expect([...(next.questions ?? [])].map((q) => q.id).sort()).toEqual(
      [...(first.questions ?? [])].map((q) => q.id).sort(),
    );
  });

  it("同じ設問 id を重ねて送っても、採点されるのは 1 問ぶん", async () => {
    const check = await fetchCheck("id-d");
    const questions = check.questions ?? [];
    const first = questions[0];
    if (!first) throw new Error("設問が無い");
    const res = await post("/api/skill-check/id-d", {
      answers: [
        ...correctAnswers(questions),
        // 同じ設問の 2 通目 (誤答)。後勝ちで 1 問ぶんだけ落ちる。
        { question_id: first.id, selected_option_ids: [`${first.id}-o2`] },
      ],
    });
    const body = (await res.json()) as { result: { score: number; max_score: number } };
    expect(body.result.max_score).toBe(10);
    expect(body.result.score).toBe(9);
  });

  it("受験票に無い設問 id を混ぜても得点は動かない", async () => {
    const check = await fetchCheck("id-d");
    const res = await post("/api/skill-check/id-d", {
      answers: [
        ...correctAnswers(check.questions ?? []),
        { question_id: "id-other-stage-q1", selected_option_ids: ["id-other-stage-q1-o1"] },
        { question_id: "q999", selected_option_ids: ["q999-o1"] },
      ],
    });
    const body = (await res.json()) as {
      result: { score: number; max_score: number; passed: boolean };
    };
    expect(body.result.max_score).toBe(10);
    expect(body.result.score).toBe(10);
    expect(body.result.passed).toBe(true);
  });

  it("配点がすべて 0 のステージは満点 0 で不合格 (飛び級も起きない)", async () => {
    questionPoints = 0;
    const check = await fetchCheck("id-d");
    const res = await post("/api/skill-check/id-d", {
      answers: correctAnswers(check.questions ?? []),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result: {
        score: number;
        max_score: number;
        percent: number;
        passed: boolean;
        unlocked: boolean;
      };
    };
    expect(body.result.max_score).toBe(0);
    expect(body.result.percent).toBe(0);
    expect(body.result.passed).toBe(false);
    expect(body.result.unlocked).toBe(false);
    expect(upsertStageUnlock).not.toHaveBeenCalled();
  });
});
