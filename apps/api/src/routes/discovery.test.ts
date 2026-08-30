/**
 * Phase 4 — 発見教材 (Discovery) の route テスト。
 *
 * 見ているのは **API 境界の責務** だけ:
 *   - 公開条件 (承認済み × 源流ステージが active / cleared) を一覧と受験で揃える
 *   - locked / 霧の星の教材は **存在ごと** 応答に出さない
 *   - 出題にも採点結果にも正答・解説を載せない
 *   - 受けられるロールは腕試しと同じ (受講者 + 管理者)
 *
 * D1 は `lib/discovery-data.js` / `lib/skill-map-data.js` を差し替えてインメモリの
 * 教材と受験記録で代用する (skill-check.test.ts と同じ流儀)。
 */

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DiscoveryQuestion } from "@falcon/shared/discovery/types";

import type { Env } from "../env.js";
import type { ProfileRole } from "../lib/authz.js";
import {
  insertDiscoveryAttempt,
  loadApprovedDiscoverySummaries,
  loadDiscoveryHistory,
  loadDiscoveryMaterial,
  loadPassedDiscoveryCount,
  loadPassedDiscoveryIds,
} from "../lib/discovery-data.js";
import type { DiscoveryMaterialRow } from "../lib/discovery-data.js";
import {
  loadFocusCompletions,
  loadSkillMapSource,
  loadSkillProfileCounts,
  loadStudyDays,
} from "../lib/skill-map-data.js";
import { discoveryRoute } from "./discovery.js";
import { skillMapRoute } from "./skill-map.js";

vi.mock("../lib/discovery-data.js", () => ({
  loadDiscoveryMaterial: vi.fn(),
  loadApprovedDiscoverySummaries: vi.fn(),
  loadDiscoveryHistory: vi.fn(),
  insertDiscoveryAttempt: vi.fn(),
  loadPassedDiscoveryIds: vi.fn(),
  loadPassedDiscoveryCount: vi.fn(),
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

const BASE_CALLER = {
  id: "seed-learner",
  tenantId: "ses",
  role: "student" as ProfileRole,
  name: "受講者",
  email: null,
};

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

const app = new Hono<{ Bindings: Env }>().route("/", discoveryRoute).route("/", skillMapRoute);
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
 * 一本道 a → b → c → d → e。a はクリア済み、b が「いま進めている星」。
 * よって a = cleared / b = active / c = locked (full) / d = name-only / e = 霧。
 */
function lineSource() {
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
    clearedStageIds: new Set(["id-a"]),
    activeStageId: "id-b",
    activeStageSource: "chosen" as const,
    unlockedStageIds: new Set<string>(),
    enrolledStageIds: new Set(["id-a", "id-b"]),
  };
}

/** 4 問の教材 (正答は常に `<id>o1`)。 */
function questions(prefix: string, count = 4): DiscoveryQuestion[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}q${i + 1}`,
    prompt: `${prefix} の問題 ${i + 1}`,
    options: [
      { id: `${prefix}q${i + 1}o1`, label: "正しい", correct: true },
      { id: `${prefix}q${i + 1}o2`, label: "誤り", correct: false },
    ],
    explanation: `${prefix} の解説 ${i + 1}`,
  }));
}

function material(
  id: string,
  stageId: string,
  overrides: Partial<DiscoveryMaterialRow> = {},
): DiscoveryMaterialRow {
  return {
    id,
    stageId,
    title: `${id} の復習`,
    description: `${id} の説明`,
    questions: questions(id),
    source: "ai",
    generator: "heuristic",
    reviewStatus: "approved",
    unlockCondition: "stage_active_or_cleared",
    requestId: null,
    createdAt: new Date("2026-08-20T00:00:00.000Z"),
    reviewedBy: "seed-instructor",
    reviewedAt: new Date("2026-08-21T00:00:00.000Z"),
    ...overrides,
  };
}

/** インメモリの教材ライブラリ (id 引き)。 */
let library: Map<string, DiscoveryMaterialRow>;
/** 記録された受験。 */
let attempts: { materialId: string; passed: boolean; score: number }[];

beforeEach(() => {
  vi.clearAllMocks();
  caller = { ...BASE_CALLER };
  attempts = [];
  library = new Map(
    [
      material("m-active", "id-b"),
      material("m-cleared", "id-a"),
      material("m-locked", "id-c"),
      material("m-fog", "id-e"),
      material("m-draft", "id-b", { reviewStatus: "draft" }),
      material("m-rejected", "id-b", { reviewStatus: "rejected" }),
    ].map((row) => [row.id, row]),
  );

  vi.mocked(loadSkillMapSource).mockImplementation(async () => lineSource());
  vi.mocked(loadSkillProfileCounts).mockResolvedValue({
    completedLessons: 0,
    passedQuizzes: 0,
    clearedStages: 1,
  });
  vi.mocked(loadStudyDays).mockResolvedValue([]);
  vi.mocked(loadFocusCompletions).mockResolvedValue([]);

  // 本物と同じくテナントで絞る (ライブラリはテナント `ses` のものとして持つ)。
  vi.mocked(loadDiscoveryMaterial).mockImplementation(async (_db, tenantId, id) =>
    tenantId === "ses" ? (library.get(id) ?? null) : null,
  );
  // 一覧は見出しだけを読む (設問の全文は受験でしか要らない)。
  vi.mocked(loadApprovedDiscoverySummaries).mockImplementation(async () =>
    [...library.values()]
      .filter((row) => row.reviewStatus === "approved")
      .map((row) => ({
        id: row.id,
        stageId: row.stageId,
        title: row.title,
        description: row.description,
        questionCount: row.questions.length,
      })),
  );
  vi.mocked(loadDiscoveryHistory).mockImplementation(async (_db, _caller, materialId) => {
    const mine = attempts.filter((row) => row.materialId === materialId);
    return {
      attemptCount: mine.length,
      passed: mine.some((row) => row.passed),
      lastScore: mine.at(-1)?.score ?? null,
      lastMaxScore: mine.length > 0 ? 4 : null,
      lastAttemptAt: null,
    };
  });
  vi.mocked(insertDiscoveryAttempt).mockImplementation(async (_db, _caller, record) => {
    attempts.push({
      materialId: record.materialId,
      passed: record.passed,
      score: record.score,
    });
  });
  vi.mocked(loadPassedDiscoveryIds).mockImplementation(
    async (_db, _caller, ids) =>
      new Set(ids.filter((id) => attempts.some((row) => row.materialId === id && row.passed))),
  );
  vi.mocked(loadPassedDiscoveryCount).mockImplementation(
    async () => new Set(attempts.filter((row) => row.passed).map((row) => row.materialId)).size,
  );
});

interface DiscoveryListItem {
  id: string;
  stage_id: string;
  title: string;
  description: string;
  question_count: number;
  passed: boolean;
}

async function fetchDiscoveries(): Promise<DiscoveryListItem[]> {
  const res = await get("/api/skill-map/mine");
  expect(res.status).toBe(200);
  const body = (await res.json()) as { skill_map: { discoveries: DiscoveryListItem[] } };
  return body.skill_map.discoveries;
}

interface PaperQuestion {
  id: string;
  kind: string;
  prompt: string;
  points: number;
  options: { id: string; label: string }[];
}

async function fetchPaper(id: string) {
  const res = await get(`/api/discovery/${id}`);
  expect(res.status).toBe(200);
  const body = (await res.json()) as {
    discovery: {
      id: string;
      title: string;
      generator: string;
      pass_score: number;
      questions: PaperQuestion[];
      history: { attempt_count: number; passed: boolean };
    };
  };
  return body.discovery;
}

const correctAnswers = (rows: PaperQuestion[]) =>
  rows.map((q) => ({ question_id: q.id, selected_option_ids: [`${q.id}o1`] }));
const wrongAnswers = (rows: PaperQuestion[]) =>
  rows.map((q) => ({ question_id: q.id, selected_option_ids: [`${q.id}o2`] }));

describe("GET /api/skill-map/mine — 発見教材の公開条件", () => {
  it("進行中とクリア済みの星の教材だけを載せる", async () => {
    const rows = await fetchDiscoveries();
    expect(rows.map((row) => row.id).sort()).toEqual(["m-active", "m-cleared"]);
  });

  it("locked / 霧の星の教材は存在ごと出さない (題名も説明も漏らさない)", async () => {
    const res = await get("/api/skill-map/mine");
    const text = await res.text();
    expect(text).not.toContain("m-locked");
    expect(text).not.toContain("m-fog");
  });

  it("未承認 (draft / rejected) の教材は出さない", async () => {
    const ids = (await fetchDiscoveries()).map((row) => row.id);
    expect(ids).not.toContain("m-draft");
    expect(ids).not.toContain("m-rejected");
  });

  it("設問数だけを添え、設問と正答は載せない", async () => {
    const row = (await fetchDiscoveries()).find((r) => r.id === "m-active");
    expect(row?.question_count).toBe(4);
    const text = await (await get("/api/skill-map/mine")).text();
    expect(text).not.toContain("m-activeq1o1");
    expect(text).not.toContain("correct");
  });

  it("合格した教材には印が付く", async () => {
    const paper = await fetchPaper("m-active");
    await post("/api/discovery/m-active", { answers: correctAnswers(paper.questions) });
    const row = (await fetchDiscoveries()).find((r) => r.id === "m-active");
    expect(row?.passed).toBe(true);
  });
});

describe("GET /api/discovery/:id", () => {
  it("認証が無ければ 401", async () => {
    expect((await get("/api/discovery/m-active", false)).status).toBe(401);
  });

  it("受験票に正答も解説も含めない", async () => {
    const paper = await fetchPaper("m-active");
    const text = JSON.stringify(paper.questions);
    expect(text).not.toContain("correct");
    expect(text).not.toContain("explanation");
    expect(text).not.toContain("解説");
    expect(paper.questions).toHaveLength(4);
    expect(paper.questions[0]?.kind).toBe("single");
  });

  it("出自 (AI 生成 / 生成器) は隠さない", async () => {
    expect((await fetchPaper("m-active")).generator).toBe("heuristic");
  });

  it.each(["m-locked", "m-fog", "m-draft", "m-rejected", "m-does-not-exist"])(
    "%s は同じ汎用文言の 400 (存在も理由も書き分けない)",
    async (id) => {
      const res = await get(`/api/discovery/${id}`);
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toBe(
        "受講登録のないステージは選べません",
      );
    },
  );

  it("他テナントの教材も同じ 400", async () => {
    caller = { ...BASE_CALLER, tenantId: "other" };
    expect((await get("/api/discovery/m-active")).status).toBe(400);
  });
});

describe("POST /api/discovery/:id — 採点", () => {
  it("全問正解で合格し、受験が記録される", async () => {
    const paper = await fetchPaper("m-active");
    const res = await post("/api/discovery/m-active", {
      answers: correctAnswers(paper.questions),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result: { score: number; max_score: number; percent: number; passed: boolean };
    };
    expect(body.result).toMatchObject({ score: 4, max_score: 4, percent: 100, passed: true });
    expect(attempts).toHaveLength(1);
    expect(insertDiscoveryAttempt).toHaveBeenCalledTimes(1);
  });

  it("不合格でも記録する (履歴は残す)", async () => {
    const paper = await fetchPaper("m-active");
    const res = await post("/api/discovery/m-active", { answers: wrongAnswers(paper.questions) });
    const body = (await res.json()) as { result: { score: number; passed: boolean } };
    expect(body.result.passed).toBe(false);
    expect(attempts).toHaveLength(1);
  });

  it("採点結果に正答も個別の正誤も載せない", async () => {
    const paper = await fetchPaper("m-active");
    const text = await (
      await post("/api/discovery/m-active", { answers: correctAnswers(paper.questions) })
    ).text();
    expect(text).not.toContain("correct_option_ids");
    expect(text).not.toContain("explanation");
    expect(text).not.toContain("results");
  });

  it("一部の設問だけ送っても満点にはならない (土俵はサーバの設問)", async () => {
    const paper = await fetchPaper("m-active");
    const res = await post("/api/discovery/m-active", {
      answers: correctAnswers(paper.questions.slice(0, 1)),
    });
    const body = (await res.json()) as { result: { score: number; max_score: number } };
    expect(body.result.max_score).toBe(4);
    expect(body.result.score).toBe(1);
  });

  it("壊れた本文でも 200 で 0 点 (落ちない)", async () => {
    const res = await post("/api/discovery/m-active", { answers: "not-an-array" });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { result: { score: number } }).result.score).toBe(0);
  });

  it.each(["m-locked", "m-fog", "m-draft"])(
    "%s への直接 POST も 400 で、採点も記録もしない",
    async (id) => {
      const res = await post(`/api/discovery/${id}`, { answers: [] });
      expect(res.status).toBe(400);
      expect(insertDiscoveryAttempt).not.toHaveBeenCalled();
    },
  );

  it("記録に失敗しても採点は返す (再挑戦を促す文言を添える)", async () => {
    const paper = await fetchPaper("m-active");
    vi.mocked(insertDiscoveryAttempt).mockRejectedValueOnce(new Error("D1 down"));
    const res = await post("/api/discovery/m-active", {
      answers: correctAnswers(paper.questions),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { result: { passed: boolean; record_error?: string } };
    expect(body.result.passed).toBe(true);
    expect(body.result.record_error).toContain("もう一度");
  });
});

describe("受験できるロール (腕試しと同じ顔ぶれ)", () => {
  it("管理者は受講者と同じ発見教材を受けられる", async () => {
    caller = { ...BASE_CALLER, id: "seed-admin", role: "admin" };
    const paper = await fetchPaper("m-active");
    expect(
      (await post("/api/discovery/m-active", { answers: correctAnswers(paper.questions) })).status,
    ).toBe(200);
  });

  it.each(["instructor", "sales"] as const)("%s は出題も採点も 403", async (role) => {
    caller = { ...BASE_CALLER, id: `seed-${role}`, role };
    expect((await get("/api/discovery/m-active")).status).toBe(403);
    expect((await post("/api/discovery/m-active", { answers: [] })).status).toBe(403);
    expect(insertDiscoveryAttempt).not.toHaveBeenCalled();
  });
});

describe("XP への反映", () => {
  const fetchXp = async () => {
    const res = await get("/api/skill-profile/mine");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      skill_profile: {
        xp: { total: number; passed_discoveries: number; from_discoveries: number };
      };
    };
    return body.skill_profile.xp;
  };

  it("合格した発見教材 1 つにつき 30 XP", async () => {
    expect((await fetchXp()).total).toBe(200); // クリア 1 ステージぶん
    const paper = await fetchPaper("m-active");
    await post("/api/discovery/m-active", { answers: correctAnswers(paper.questions) });
    const xp = await fetchXp();
    expect(xp.passed_discoveries).toBe(1);
    expect(xp.from_discoveries).toBe(30);
    expect(xp.total).toBe(230);
  });

  it("同じ教材に何度合格しても 1 回ぶん", async () => {
    const paper = await fetchPaper("m-active");
    await post("/api/discovery/m-active", { answers: correctAnswers(paper.questions) });
    await post("/api/discovery/m-active", { answers: correctAnswers(paper.questions) });
    expect((await fetchXp()).from_discoveries).toBe(30);
  });

  it("不合格では増えない", async () => {
    const paper = await fetchPaper("m-active");
    await post("/api/discovery/m-active", { answers: wrongAnswers(paper.questions) });
    expect((await fetchXp()).from_discoveries).toBe(0);
  });
});
