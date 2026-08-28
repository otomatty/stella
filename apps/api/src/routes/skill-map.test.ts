/**
 * Phase 1 — スキルツリー / スキルプロフィール API の route テスト。
 *
 * 見ているのは **API 境界の責務** だけ:
 *   - 認証されていなければ通さない
 *   - 呼び出した本人の caller で評価器を回す
 *   - 視界に応じて伏せる (locked に到達説明を返さない / fog にタイトルを返さない)
 *
 * グラフ評価そのものは `@falcon/shared/skill-map` のユニットテストが持つので、
 * ここでは D1 の読み出し (`lib/skill-map-data.js`) をモックして固定の入力を流す。
 */

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { addStudyDays, toStudyDate } from "@falcon/shared/study/activity";

import type { Env } from "../env.js";
import { ApiError } from "../lib/authz.js";
import {
  loadFocusCompletions,
  loadSkillMapSource,
  loadSkillProfileCounts,
  loadStudyDays,
} from "../lib/skill-map-data.js";
import { skillMapRoute, type SkillMapStagePayload as StagePayload } from "./skill-map.js";

// 発見教材 (Phase 4) の読み出し。このファイルは視界の秘匿だけを見るので、既定は
// 「教材なし」。discovery の公開条件そのものは `routes/discovery.test.ts` が持つ。
vi.mock("../lib/discovery-data.js", () => ({
  loadApprovedDiscoverySummaries: vi.fn(async () => []),
  loadPassedDiscoveryIds: vi.fn(async () => new Set<string>()),
  loadPassedDiscoveryCount: vi.fn(async () => 0),
}));

vi.mock("../lib/skill-map-data.js", () => ({
  loadSkillMapSource: vi.fn(),
  loadSkillProfileCounts: vi.fn(),
  loadStudyDays: vi.fn(),
  // Phase 2 で足した口。このファイルは読み出し側だけを見るので、既定は「材料なし」。
  loadFocusCompletions: vi.fn(),
  loadEnrolledStageIds: vi.fn(),
  loadFocusStageId: vi.fn(),
  saveFocusStageId: vi.fn(),
}));

const CALLER = {
  id: "seed-learner",
  tenantId: "ses",
  role: "student",
  name: "受講者",
  email: null,
};

vi.mock("../lib/authz.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/authz.js")>();
  return {
    ...actual,
    getCaller: vi.fn(async (c: { req: { header: (name: string) => string | undefined } }) => {
      const header = c.req.header("Authorization") ?? "";
      if (!header.startsWith("Bearer ")) {
        throw new actual.ApiError("Authorization ヘッダが必要です", 401);
      }
      return { caller: CALLER, db: {} };
    }),
  };
});

const app = new Hono<{ Bindings: Env }>().route("/", skillMapRoute);
const env = {} as Env;

const get = (path: string, auth = true) =>
  app.request(path, auth ? { headers: { Authorization: "Bearer test" } } : {}, env);

/**
 * 一本道 a → b → c → d → e。a はクリア済みなので、視界の起点は a (cleared) と
 * b (unlocked)。そこから c = 1 歩 (full) / d = 2 歩 (name-only) / e = 3 歩 (霧)。
 * c は full なのに locked — 到達説明を伏せるのが視界ではなく状態で決まることの実例。
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
    activeStageId: undefined,
  };
}

async function fetchStages(): Promise<Map<string, StagePayload>> {
  const res = await get("/api/skill-map/mine");
  expect(res.status).toBe(200);
  const body = (await res.json()) as { skill_map: { stages: StagePayload[] } };
  return new Map(body.skill_map.stages.map((s) => [s.id, s]));
}

beforeEach(() => {
  vi.mocked(loadSkillMapSource).mockResolvedValue(lineSource());
  vi.mocked(loadSkillProfileCounts).mockResolvedValue({
    completedLessons: 4,
    passedQuizzes: 2,
    clearedStages: 1,
  });
  vi.mocked(loadStudyDays).mockResolvedValue([]);
  vi.mocked(loadFocusCompletions).mockResolvedValue([]);
});

describe("GET /api/skill-map/mine", () => {
  it("認証が無ければ 401", async () => {
    const res = await get("/api/skill-map/mine", false);
    expect(res.status).toBe(401);
  });

  it("全ステージを状態と視界つきで返す", async () => {
    const stages = await fetchStages();
    expect(stages.size).toBe(5);
    expect(stages.get("id-a")?.state).toBe("cleared");
    expect(stages.get("id-b")?.state).toBe("unlocked");
    expect(stages.get("id-c")?.state).toBe("locked");
    expect(stages.get("id-c")?.visibility).toBe("full");
    expect(stages.get("id-d")?.visibility).toBe("name-only");
    expect(stages.get("id-e")?.visibility).toBe("fog");
  });

  it("locked のステージには到達説明を返さない (視界が full でも解放条件だけ)", async () => {
    const stages = await fetchStages();
    const c = stages.get("id-c");
    expect(c?.state).toBe("locked");
    expect(c?.visibility).toBe("full");
    expect(c?.can_do).toBeUndefined();
    expect(c?.lock_reasons).toEqual(["b の講座"]);
  });

  it("手が届く星にだけ到達説明を返す", async () => {
    const stages = await fetchStages();
    expect(stages.get("id-a")?.can_do).toBe("a ができる");
    expect(stages.get("id-b")?.can_do).toBe("b ができる");
  });

  it("2 歩先の星は名前と解放条件まで (到達説明は返さない)", async () => {
    const stages = await fetchStages();
    const d = stages.get("id-d");
    expect(d?.visibility).toBe("name-only");
    expect(d?.title).toBe("d の講座");
    expect(d?.lock_reasons).toEqual(["c の講座"]);
    expect(d?.can_do).toBeUndefined();
  });

  it("霧の星はテーマ名だけ (タイトルも解放条件も返さない)", async () => {
    const stages = await fetchStages();
    const e = stages.get("id-e");
    expect(e?.visibility).toBe("fog");
    expect(e?.theme).toBe("テーマ");
    expect(e?.title).toBeUndefined();
    expect(e?.can_do).toBeUndefined();
    expect(e?.lock_reasons).toBeUndefined();
  });

  it("次の一歩とクリア数を返す", async () => {
    const res = await get("/api/skill-map/mine");
    const body = (await res.json()) as {
      skill_map: {
        next_stage_ids: string[];
        cleared_count: number;
        active_stage_id: string | null;
      };
    };
    expect(body.skill_map.next_stage_ids).toEqual(["id-b"]);
    expect(body.skill_map.cleared_count).toBe(1);
    expect(body.skill_map.active_stage_id).toBeNull();
  });

  it("受講登録の有無を霧の外の星にだけ載せる (霧はテーマ名だけのまま)", async () => {
    vi.mocked(loadSkillMapSource).mockResolvedValue({
      ...lineSource(),
      enrolledStageIds: new Set(["id-b"]),
    });
    const stages = await fetchStages();
    expect(stages.get("id-b")?.enrolled).toBe(true);
    expect(stages.get("id-c")?.enrolled).toBe(false);
    // 霧の星は「割り当てられているか」も漏らさない (項目そのものを付けない)。
    expect(Object.keys(stages.get("id-e") ?? {})).not.toContain("enrolled");
  });

  it("前提の id を霧の外の星にだけ載せる (ツリーが線を引くのに使う)", async () => {
    const stages = await fetchStages();
    expect(stages.get("id-c")?.prerequisite_ids).toEqual(["id-b"]);
    expect(stages.get("id-a")?.prerequisite_ids).toEqual([]);
    // 霧の星はテーマ名だけ。前提の線も引かせない。
    expect(Object.keys(stages.get("id-e") ?? {})).not.toContain("prerequisite_ids");
  });

  it("飛び級で開いた星は unlocked になり、視界の起点にもなる", async () => {
    vi.mocked(loadSkillMapSource).mockResolvedValue({
      ...lineSource(),
      unlockedStageIds: new Set(["id-d"]),
    });
    const stages = await fetchStages();
    expect(stages.get("id-d")?.state).toBe("unlocked");
    // d が起点になるので、その隣 (e) が霧から出る。
    expect(stages.get("id-e")?.visibility).toBe("full");
  });

  it("フォーカスの出どころと集中ボーナスを返す", async () => {
    // 「今日」の定義はアプリ基準 TZ の 1 か所 (`toStudyDate`) に任せる。
    // ここで +9h を自前計算すると、実装が TZ の扱いを変えたときに気付けない。
    const today = toStudyDate(new Date());
    const yesterday = addStudyDays(today, -1);
    vi.mocked(loadSkillMapSource).mockResolvedValue({
      ...lineSource(),
      activeStageId: "id-c",
      activeStageSource: "chosen",
    });
    vi.mocked(loadFocusCompletions).mockResolvedValue([
      { stageId: "id-c", date: today },
      { stageId: "id-c", date: yesterday },
    ]);
    const res = await get("/api/skill-map/mine");
    const body = (await res.json()) as {
      skill_map: {
        active_stage_source: string;
        focus_bonus: { streak_days: number; multiplier: number };
      };
    };
    expect(body.skill_map.active_stage_source).toBe("chosen");
    expect(body.skill_map.focus_bonus.streak_days).toBe(2);
    expect(body.skill_map.focus_bonus.multiplier).toBe(1.25);
  });

  it("進行中の星は active として返り、到達説明も付く", async () => {
    vi.mocked(loadSkillMapSource).mockResolvedValue({ ...lineSource(), activeStageId: "id-c" });
    const stages = await fetchStages();
    expect(stages.get("id-c")?.state).toBe("active");
    expect(stages.get("id-c")?.can_do).toBe("c ができる");
  });

  it("ステージが 1 つも無くても 200 で空のマップを返す", async () => {
    vi.mocked(loadSkillMapSource).mockResolvedValue({
      stages: [],
      clearedStageIds: new Set(),
      activeStageId: undefined,
    });
    const res = await get("/api/skill-map/mine");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { skill_map: { stages: unknown[] } };
    expect(body.skill_map.stages).toEqual([]);
  });

  it("読み出しが落ちたらエラー応答にする (握り潰さない)", async () => {
    vi.mocked(loadSkillMapSource).mockRejectedValue(
      new ApiError("プロフィールが見つかりません", 403),
    );
    const res = await get("/api/skill-map/mine");
    expect(res.status).toBe(403);
  });
});

describe("GET /api/skill-profile/mine", () => {
  it("認証が無ければ 401", async () => {
    const res = await get("/api/skill-profile/mine", false);
    expect(res.status).toBe(401);
  });

  it("XP の内訳とレベルを返す", async () => {
    const res = await get("/api/skill-profile/mine");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      skill_profile: {
        xp: Record<string, number>;
        level: Record<string, number>;
        streak: { current: number; longest: number; today: string };
      };
    };
    // 4 レッスン + 2 クイズ + 1 ステージ = 40 + 60 + 200
    expect(body.skill_profile.xp.total).toBe(300);
    expect(body.skill_profile.xp.from_lessons).toBe(40);
    expect(body.skill_profile.xp.from_quizzes).toBe(60);
    expect(body.skill_profile.xp.from_stages).toBe(200);
    expect(body.skill_profile.level.level).toBe(3);
    expect(body.skill_profile.streak.current).toBe(0);
  });

  it("学習ログがあればストリークを返す", async () => {
    const today = toStudyDate(new Date());
    const yesterday = addStudyDays(today, -1);
    vi.mocked(loadStudyDays).mockResolvedValue([
      { date: today, watched_sec: 120, completed_lessons: 1 },
      { date: yesterday, watched_sec: 60, completed_lessons: 0 },
    ]);
    const res = await get("/api/skill-profile/mine");
    const body = (await res.json()) as { skill_profile: { streak: { current: number } } };
    expect(body.skill_profile.streak.current).toBe(2);
  });
});

/**
 * 2 つの連結成分をまたぐ形。root1 — a — x と root2 — m — n — p があり、x は a と p の
 * 両方を前提にする。x は name-only (2 歩) で見えるが、p はどちらの起点からも 3 歩で霧の中。
 * このとき x の解放条件に p の **タイトル** を出すと、霧の星の名前が手前から読めてしまう。
 */
function twoComponentSource() {
  const s = (slug: string, prerequisites: string[], theme?: string) => ({
    id: `id-${slug}`,
    slug,
    title: `${slug} の講座`,
    prerequisites,
    canDo: `${slug} ができる`,
    category: "プログラミング",
    ...(theme ? { theme } : {}),
  });
  return {
    stages: [
      s("root1", [], "テーマX"),
      s("a", ["root1"], "テーマX"),
      s("x", ["a", "p"], "テーマX"),
      s("root2", [], "テーマY"),
      s("m", ["root2"], "テーマY"),
      s("n", ["m"], "テーマY"),
      // p はテーマを持たない (CMS で作った直後のステージと同じ形)。
      s("p", ["n"]),
    ],
    clearedStageIds: new Set<string>(),
    activeStageId: undefined,
  };
}

describe("GET /api/skill-map/mine — 霧の星は解放条件にも名前を出さない", () => {
  beforeEach(() => {
    vi.mocked(loadSkillMapSource).mockResolvedValue(twoComponentSource());
  });

  it("霧の前提はタイトルではなくテーマ名 / 伏せ字で並ぶ", async () => {
    const stages = await fetchStages();
    expect(stages.get("id-x")?.visibility).toBe("name-only");
    expect(stages.get("id-p")?.visibility).toBe("fog");
    const reasons = stages.get("id-x")?.lock_reasons ?? [];
    // 見えている前提 (a) はタイトルのまま。霧の中の p は伏せる。
    expect(reasons).toContain("a の講座");
    expect(reasons).not.toContain("p の講座");
    // p はテーマも持たないので伏せ字に落ちる。
    expect(reasons).toContain("？？？");
  });

  it("テーマがあれば霧の前提はテーマ名で出る", async () => {
    const source = twoComponentSource();
    const p = source.stages.find((s) => s.slug === "p");
    if (p) Object.assign(p, { theme: "テーマY" });
    vi.mocked(loadSkillMapSource).mockResolvedValue(source);
    const stages = await fetchStages();
    expect(stages.get("id-x")?.lock_reasons).toEqual(["a の講座", "テーマY"]);
  });

  it("霧の星そのものも、テーマが無ければ伏せ字を返す (名無しの星にしない)", async () => {
    const stages = await fetchStages();
    const p = stages.get("id-p");
    expect(p?.theme).toBe("？？？");
    expect(p?.title).toBeUndefined();
    expect(p?.can_do).toBeUndefined();
  });

  it("未知 slug の前提は生の slug ではなく伏せ字で返す", async () => {
    const source = twoComponentSource();
    source.stages.push({
      id: "id-orphan",
      slug: "orphan",
      title: "孤児 の講座",
      // root1 を前提に持たせて視界に入れる (孤立させると霧に沈み、解放条件ごと返らない)。
      prerequisites: ["root1", "does-not-exist"],
      canDo: "orphan ができる",
      category: "プログラミング",
      theme: "テーマX",
    });
    vi.mocked(loadSkillMapSource).mockResolvedValue(source);
    const stages = await fetchStages();
    const reasons = stages.get("id-orphan")?.lock_reasons ?? [];
    expect(reasons).toEqual(["root1 の講座", "非公開の教材"]);
    expect(reasons.join()).not.toContain("does-not-exist");
  });
});
