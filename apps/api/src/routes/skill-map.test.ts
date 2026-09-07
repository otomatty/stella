/**
 * Phase 1 — スキルツリー / スキルプロフィール API の route テスト。
 *
 * 見ているのは **API 境界の責務** だけ:
 *   - 認証されていなければ通さない
 *   - 呼び出した本人の caller で評価器を回す
 *   - 視界に応じて伏せる (locked に到達説明を返さない / fog に slug や解放条件を返さない)
 *
 * グラフ評価そのものは `@stella/shared/skill-map` のユニットテストが持つので、
 * ここでは D1 の読み出し (`lib/skill-map-data.js`) をモックして固定の入力を流す。
 */

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { addStudyDays, toStudyDate } from "@stella/shared/study/activity";

import type { Env } from "../env.js";
import { ApiError } from "../lib/authz.js";
import {
  loadFocusCompletions,
  loadSkillMapSource,
  loadSkillProfileCounts,
  loadStudyDays,
  wantsDevReveal,
} from "../lib/skill-map-data.js";
import { skillMapRoute, type SkillMapStagePayload as StagePayload } from "./skill-map.js";

// 発見教材 (Phase 4) の読み出し。このファイルは視界の秘匿だけを見るので、既定は
// 「教材なし」。discovery の公開条件そのものは `routes/discovery.test.ts` が持つ。
vi.mock("../lib/discovery-data.js", () => ({
  loadApprovedDiscoverySummaries: vi.fn(async () => []),
  loadPassedDiscoveryIds: vi.fn(async () => new Set<string>()),
  loadPassedDiscoveryCount: vi.fn(async () => 0),
}));

// 修了条件の自動判定 (/mine の入口で走るバックフィル)。このファイルの関心は視界の
// 秘匿なので、常に「新しくクリアなし」。判定そのものは lib 側のテストが持つ。
vi.mock("../lib/stage-auto-complete.js", () => ({
  autoCompleteEligibleStages: vi.fn(async () => []),
}));

vi.mock("../lib/skill-map-data.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/skill-map-data.js")>()),
  // 開発モードはテストでは常に無効 (本番挙動を検証する)。個別の describe で true にする。
  isDevMode: vi.fn(() => false),
  shouldRevealDevMap: vi.fn(() => false),
  wantsDevReveal: vi.fn(() => false),
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

/** 既定は「4 段 + DevOps 島を描ける画面」= 現行の web が付けるクエリ引数つき。 */
const get = (path: string, auth = true) =>
  app.request(
    `${path}${path.includes("?") ? "&" : "?"}tiers=3`,
    auth ? { headers: { Authorization: "Bearer test" } } : {},
    env,
  );

/** 段を知らない画面 (デプロイ途中の旧 bundle / 開いたままの古いタブ)。 */
const getLegacy = (path: string) =>
  app.request(path, { headers: { Authorization: "Bearer test" } }, env);

/** `tiers=2` までを知る画面 (DevOps 島を島として描けない)。 */
const getTiers2 = (path: string) =>
  app.request(`${path}?tiers=2`, { headers: { Authorization: "Bearer test" } }, env);

/**
 * 一本道 a → b → c → d → e → f。a はクリア済みなので、視界の起点は a (cleared) と
 * b (unlocked)。そこから c = 1 歩 (full) / d = 2 歩 (fog) / e = 3 歩 (edge = 線だけ) /
 * f = 4 歩 (hidden = 応答に載らない)。
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
    iconPath: `tenant/ses/courses/${slug}/icon-abcd1234.svg`,
  });
  return {
    stages: [
      stage("a", []),
      stage("b", ["a"]),
      stage("c", ["b"]),
      stage("d", ["c"]),
      stage("e", ["d"]),
      stage("f", ["e"]),
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
  vi.mocked(wantsDevReveal).mockReturnValue(false);
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

  it("届く範囲の星だけを状態と視界つきで返す (4 歩先は配列ごと落とす)", async () => {
    const stages = await fetchStages();
    // カタログは 6 星だが、4 歩先 (f) は応答に現れない。
    expect(stages.size).toBe(5);
    expect(stages.get("id-a")?.state).toBe("cleared");
    expect(stages.get("id-b")?.state).toBe("unlocked");
    expect(stages.get("id-c")?.state).toBe("locked");
    expect(stages.get("id-c")?.visibility).toBe("full");
    expect(stages.get("id-d")?.visibility).toBe("fog");
    expect(stages.get("id-e")?.visibility).toBe("edge");
    expect(stages.get("id-f")).toBeUndefined();
  });

  it("段を申告しない画面には幽霊ノードを配らない (旧画面が誤描画しないように)", async () => {
    const res = await getLegacy("/api/skill-map/mine");
    const body = (await res.json()) as { skill_map: { stages: StagePayload[] } };
    const stages = new Map(body.skill_map.stages.map((stage) => [stage.id, stage]));
    // 名前のある星 (0〜2 歩) はそのまま。旧画面は今までどおりこれだけを描く。
    expect(stages.get("id-c")?.visibility).toBe("full");
    expect(stages.get("id-d")?.visibility).toBe("fog");
    // 3 歩先は配らない — 旧 describeStar() は fog 以外を普通の星として描き、
    // 必ず 400 になる腕試しボタンまで出してしまう。
    expect(stages.get("id-e")).toBeUndefined();
    expect(stages.get("id-f")).toBeUndefined();
  });

  it("DevOps 島は島として描ける画面にだけ配る (旧 layout が本土に混ぜないように)", async () => {
    const stage = (slug: string, category: string, prerequisites: string[]) => ({
      id: `id-${slug}`,
      slug,
      title: slug,
      category,
      prerequisites,
      theme: category === "DevOps" ? "開発と運用をつなぐ" : "サーバーとデータの基盤",
    });
    vi.mocked(loadSkillMapSource).mockResolvedValue({
      stages: [
        stage("python-basics", "バックエンド", ["typescript-node-basics"]),
        stage("devops-basics", "DevOps", ["python-basics"]),
      ],
      clearedStageIds: new Set(["id-python-basics"]),
      activeStageId: undefined,
    });
    const idsOf = async (res: Response) => {
      const body = (await res.json()) as { skill_map: { stages: StagePayload[] } };
      return body.skill_map.stages.map((row) => row.id).sort();
    };
    expect(await idsOf(await getLegacy("/api/skill-map/mine"))).toEqual(["id-python-basics"]);
    expect(await idsOf(await getTiers2("/api/skill-map/mine"))).toEqual(["id-python-basics"]);
    expect(await idsOf(await get("/api/skill-map/mine"))).toEqual(
      ["id-devops-basics", "id-python-basics"].sort(),
    );
  });

  it("旧画面の修了数は配った星だけ数える (落とした島のクリアを混ぜない)", async () => {
    const stage = (slug: string, category: string, prerequisites: string[]) => ({
      id: `id-${slug}`,
      slug,
      title: slug,
      category,
      prerequisites,
      theme: category === "DevOps" ? "開発と運用をつなぐ" : "サーバーとデータの基盤",
    });
    vi.mocked(loadSkillMapSource).mockResolvedValue({
      stages: [
        stage("python-basics", "バックエンド", ["typescript-node-basics"]),
        stage("devops-basics", "DevOps", ["python-basics"]),
      ],
      // 新画面で DevOps までクリアしたあと、古いタブが再取得する状況。
      clearedStageIds: new Set(["id-python-basics", "id-devops-basics"]),
      activeStageId: undefined,
    });
    const countsOf = async (res: Response) => {
      const body = (await res.json()) as {
        skill_map: { stage_count: number; cleared_count: number };
      };
      return {
        stage_count: body.skill_map.stage_count,
        cleared_count: body.skill_map.cleared_count,
      };
    };
    expect(await countsOf(await getTiers2("/api/skill-map/mine"))).toEqual({
      stage_count: 1,
      cleared_count: 1,
    });
    expect(await countsOf(await getLegacy("/api/skill-map/mine"))).toEqual({
      stage_count: 1,
      cleared_count: 1,
    });
    expect(await countsOf(await get("/api/skill-map/mine"))).toEqual({
      stage_count: 2,
      cleared_count: 2,
    });
  });

  it("修了の分母は視界で落とす前の総数 (進むたびに分母が増えない)", async () => {
    const res = await get("/api/skill-map/mine");
    const body = (await res.json()) as {
      skill_map: { stages: StagePayload[]; stage_count: number };
    };
    expect(body.skill_map.stages).toHaveLength(5);
    expect(body.skill_map.stage_count).toBe(6);
  });

  it("3 歩先は線を引くトポロジだけ (名前もテーマも状態語以上のものも返さない)", async () => {
    const stages = await fetchStages();
    const e = stages.get("id-e");
    expect(e?.visibility).toBe("edge");
    // 線の終点になる座標を盤面が出せるように、親と扇だけは載せる。
    expect(e?.parent_id).toBe("id-d");
    expect(e?.category).toBe("プログラミング");
    // 距離 1 以上は必ず locked なので、状態は何も明かさない。
    expect(e?.state).toBe("locked");
    expect(e?.title).toBeUndefined();
    expect(e?.theme).toBeUndefined();
    expect(e?.slug).toBeUndefined();
    expect(e?.has_icon).toBeUndefined();
    expect(e?.lock_reasons).toBeUndefined();
    expect(Object.keys(e ?? {})).not.toContain("enrolled");
  });

  it("応答に載らない星を指す親 id は付けない (端点の無い線は引けない)", async () => {
    const stages = await fetchStages();
    // f は落としてあるので、その手前 (e) から f への線も張らせない…
    // (e の親は d なので、ここで見るのは「f が居ない」ことそのもの)。
    expect(stages.get("id-f")).toBeUndefined();
    expect([...stages.values()].some((stage) => stage.parent_id === "id-f")).toBe(false);
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

  it("2 歩先 (霧) は名前・カテゴリ・前提線まで (slug・到達説明・解放条件は返さない)", async () => {
    const stages = await fetchStages();
    const d = stages.get("id-d");
    expect(d?.visibility).toBe("fog");
    expect(d?.theme).toBe("テーマ");
    // 名前は「ぼかしの予告」用に返す。伏せ方 (blur) は画面側の演出。
    expect(d?.title).toBe("d の講座");
    expect(d?.category).toBe("プログラミング");
    // 線が無いと盤面が深さ = リングを計算できず、先の星が内側に置かれる。
    expect(d?.parent_id).toBe("id-c");
    expect(d?.slug).toBeUndefined();
    expect(d?.can_do).toBeUndefined();
    // 解放条件は 1 歩先まで。2 歩先の「何が要るか」は手前の星が既に語っている。
    expect(d?.lock_reasons).toBeUndefined();
    // アイコンの形は講座の正体を語るので、slug と同じく霧の中に出さない。
    expect(d?.has_icon).toBeUndefined();
    expect(Object.keys(d ?? {})).not.toContain("icon_path");
  });

  it("full の星にはアイコンがあることだけ載せる (R2 キーは出さない)", async () => {
    const stages = await fetchStages();
    expect(stages.get("id-a")?.has_icon).toBe(true);
    expect(stages.get("id-c")?.has_icon).toBe(true);
    expect(stages.get("id-d")?.has_icon).toBeUndefined();
    expect(Object.keys(stages.get("id-a") ?? {})).not.toContain("icon_path");
  });

  it("appearances は霧より先の星にも載せる (slug が無くてもレイアウトが複製できる)", async () => {
    vi.mocked(loadSkillMapSource).mockResolvedValue({
      stages: [
        {
          id: "id-it",
          slug: "it-basics",
          title: "ITのきほん",
          prerequisites: [],
          category: "基礎",
        },
        {
          id: "id-html",
          slug: "html-css-basics",
          title: "HTML/CSS 入門",
          prerequisites: ["it-basics"],
          category: "フロントエンド",
        },
        {
          id: "id-js",
          slug: "javascript-basics",
          title: "JavaScript 入門",
          prerequisites: ["html-css-basics"],
          category: "フロントエンド",
        },
        {
          // 扇ごとの前提 (カタログ) は FE = javascript-basics / BE = node-basics。
          // BE 側の親がこの盤面に無いので、線はフロントエンド扇の 1 本だけになる。
          id: "id-git",
          slug: "git-basics",
          title: "Git 入門",
          prerequisites: ["javascript-basics"],
          category: "基礎",
        },
      ],
      // クリア無し = it が unlocked 起点。html=full (1 歩) / js=fog (2 歩) / git=edge (3 歩)。
      clearedStageIds: new Set<string>(),
      activeStageId: undefined,
    });
    const stages = await fetchStages();
    expect(stages.get("id-js")?.visibility).toBe("fog");
    expect(stages.get("id-js")?.appearances).toBeUndefined();
    const git = stages.get("id-git");
    // 線だけの段でも扇の複製先は要る (無いとどの扇に幽霊ノードを置くかが決まらない)。
    expect(git?.visibility).toBe("edge");
    // ただし **線を張れる扇だけ**。バックエンド側の親 (node-basics) はこの盤面に無いので
    // その扇は挙げない — 挙げると親の無い複製が生えて、空白の楔が残る。
    expect(git?.appearances).toEqual(["フロントエンド"]);
    expect(git?.appearance_parent_ids).toEqual({ フロントエンド: "id-js" });
    // 名前も slug も出さない。appearances はカタログの置き場なので残す。
    expect(git?.title).toBeUndefined();
    expect(git?.slug).toBeUndefined();
    expect(stages.get("id-it")?.appearances).toBeUndefined();
  });

  it("幽霊ノードの線は描かれる星にしか繋がない (幽霊どうしの扇は落とす)", async () => {
    // 現行カタログの形。it → html → js (FE) / it → sql → cli → node (BE)。
    // Git は FE 扇では js (霧) の次、BE 扇では node (幽霊) の次。
    const s = (slug: string, prerequisites: string[], category: string) => ({
      id: `id-${slug.replace(/-basics$/, "")}`,
      slug,
      title: `${slug}`,
      prerequisites,
      category,
    });
    vi.mocked(loadSkillMapSource).mockResolvedValue({
      stages: [
        s("it-basics", [], "基礎"),
        s("html-css-basics", ["it-basics"], "フロントエンド"),
        s("javascript-basics", ["html-css-basics"], "フロントエンド"),
        s("sql-basics", ["it-basics"], "バックエンド"),
        s("cli-basics", ["sql-basics"], "バックエンド"),
        s("node-basics", ["cli-basics"], "バックエンド"),
        s("git-basics", ["javascript-basics", "node-basics"], "基礎"),
      ],
      clearedStageIds: new Set<string>(),
      activeStageId: undefined,
    });
    const stages = await fetchStages();
    expect(stages.get("id-javascript")?.visibility).toBe("fog"); // 2 歩
    expect(stages.get("id-node")?.visibility).toBe("edge"); // 3 歩 = 幽霊
    const git = stages.get("id-git");
    expect(git?.visibility).toBe("edge"); // js 経由で 3 歩
    // BE 扇の親 (node) も幽霊なので、その扇には線を張らない = 複製もしない。
    expect(git?.appearances).toEqual(["フロントエンド"]);
    expect(git?.appearance_parent_ids).toEqual({ フロントエンド: "id-javascript" });
  });

  it("どの扇にも線を張れない複製は、複製をやめて自分のカテゴリに 1 つだけ置く", async () => {
    vi.mocked(loadSkillMapSource).mockResolvedValue({
      stages: [
        {
          id: "id-it",
          slug: "it-basics",
          title: "ITのきほん",
          prerequisites: [],
          category: "基礎",
        },
        {
          // 扇ごとの親 (javascript-basics / node-basics) がどちらも盤面に無い。
          id: "id-git",
          slug: "git-basics",
          title: "Git 入門",
          prerequisites: ["it-basics"],
          category: "基礎",
        },
      ],
      // 飛び級で開いた星 (= 視界の起点)。扇の親が無くても応答には載る形を作る。
      clearedStageIds: new Set<string>(),
      unlockedStageIds: new Set(["id-git"]),
      activeStageId: undefined,
    });
    const stages = await fetchStages();
    const git = stages.get("id-git");
    expect(git?.visibility).toBe("full");
    expect(git?.appearances).toBeUndefined();
    expect(git?.appearance_parent_ids).toBeUndefined();
    // 複製をやめても、自分の前提 (it-basics) からの線はそのまま引ける。
    expect(git?.parent_id).toBe("id-it");
  });

  it("描かれる星の親になっている幽霊は残す (その先へ続くフェード線を消さない)", async () => {
    const s = (slug: string, prerequisites: string[]) => ({
      id: `id-${slug}`,
      slug,
      title: `${slug} の講座`,
      prerequisites,
      category: "基礎",
    });
    vi.mocked(loadSkillMapSource).mockResolvedValue({
      // 本線 r → s1 → s2 → s3 → p (p は 4 歩で hidden)。
      // 飛び級で e を開くと、その手前が e → d → c → x と数えられ、x は 3 歩 = edge に
      // なる。ところが x の **線** は p 側 (4 歩) へ向いているので、x から引ける線が無い。
      stages: [
        s("r", []),
        s("s1", ["r"]),
        s("s2", ["s1"]),
        s("s3", ["s2"]),
        s("p", ["s3"]),
        s("x", ["p"]),
        s("c", ["x"]),
        s("d", ["c"]),
        s("e", ["d"]),
      ],
      clearedStageIds: new Set<string>(),
      unlockedStageIds: new Set(["id-e"]),
      activeStageId: undefined,
    });
    const stages = await fetchStages();
    expect(stages.get("id-d")?.visibility).toBe("full"); // 1 歩
    expect(stages.get("id-c")?.visibility).toBe("fog"); // 2 歩
    // x は 3 歩 = 幽霊。自分の親 p は 4 歩で届かないが、描かれる c が x を親に
    // 指しているので、c → x のフェード線のために残す。
    expect(stages.get("id-x")?.visibility).toBe("edge");
    expect(stages.get("id-c")?.parent_id).toBe("id-x");
    // 幽霊が自分の親として指せるのは描かれる星だけ (幽霊どうしの線は引かない)。
    expect(stages.get("id-x")?.parent_id).toBeUndefined();
    // 4 歩先は配信しない。
    expect(stages.get("id-p")).toBeUndefined();
  });

  it("受講登録の有無は集約フラグで返す (霧より先の登録も数える)", async () => {
    vi.mocked(loadSkillMapSource).mockResolvedValue({
      ...lineSource(),
      // 唯一の受講登録が 2 歩先 (霧) にある受講者。星ごとの `enrolled` は付かない。
      enrolledStageIds: new Set(["id-d"]),
    });
    const res = await get("/api/skill-map/mine");
    const body = (await res.json()) as {
      skill_map: { stages: StagePayload[]; has_enrollment: boolean };
    };
    expect(body.skill_map.has_enrollment).toBe(true);
    expect(body.skill_map.stages.some((stage) => stage.enrolled === true)).toBe(false);
  });

  it("扇ごとの親 id は霧の星にも載せる (複製先で線を張る)", async () => {
    vi.mocked(loadSkillMapSource).mockResolvedValue({
      stages: [
        {
          id: "id-it",
          slug: "it-basics",
          title: "ITのきほん",
          prerequisites: [],
          category: "基礎",
        },
        {
          id: "id-html",
          slug: "html-css-basics",
          title: "HTML/CSS 入門",
          prerequisites: ["it-basics"],
          category: "フロントエンド",
        },
        {
          id: "id-js",
          slug: "javascript-basics",
          title: "JavaScript 入門",
          prerequisites: ["html-css-basics"],
          category: "フロントエンド",
        },
        {
          id: "id-node",
          slug: "node-basics",
          title: "Node.js 入門",
          prerequisites: ["it-basics"],
          category: "バックエンド",
        },
        {
          id: "id-git",
          slug: "git-basics",
          title: "Git 入門",
          prerequisites: ["javascript-basics", "node-basics"],
          category: "基礎",
        },
      ],
      clearedStageIds: new Set<string>(),
      activeStageId: undefined,
    });
    const stages = await fetchStages();
    const git = stages.get("id-git");
    expect(git?.appearance_parent_ids).toEqual({
      フロントエンド: "id-js",
      バックエンド: "id-node",
    });
    expect(stages.get("id-it")?.appearance_parent_ids).toBeUndefined();
    // 複製は扇ごとの親で線を張るので、実体側の parent_id は付けない材料が無い (前提 2 つ、parent 無し)
    // — 先頭 (js) に倒れる。画面は appearance_parent_ids を優先する。
    expect(git?.parent_id).toBe("id-js");
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

  it("受講登録の有無を霧の外の星にだけ載せる (霧には個人の割当を漏らさない)", async () => {
    vi.mocked(loadSkillMapSource).mockResolvedValue({
      ...lineSource(),
      enrolledStageIds: new Set(["id-b"]),
    });
    const stages = await fetchStages();
    expect(stages.get("id-b")?.enrolled).toBe(true);
    expect(stages.get("id-c")?.enrolled).toBe(false);
    // 霧の星は「割り当てられているか」も漏らさない (項目そのものを付けない)。
    expect(Object.keys(stages.get("id-d") ?? {})).not.toContain("enrolled");
  });

  it("線を引く親の id を全部の星に載せる (ツリーが線とリング = 深さを決めるのに使う)", async () => {
    const stages = await fetchStages();
    expect(stages.get("id-c")?.parent_id).toBe("id-b");
    expect(stages.get("id-a")?.parent_id).toBeUndefined();
    // 霧の星にも線は引く — 無いと先のスキルが内側のリングに置かれてしまう。
    expect(stages.get("id-d")?.parent_id).toBe("id-c");
    // 前提 id の配列は返さない (使い手が無い。解放条件は lock_reasons が名前で出す)。
    expect(Object.keys(stages.get("id-c") ?? {})).not.toContain("prerequisite_ids");
  });

  it("前提が 2 つでも線は parent の 1 本。線の無い前提は解放条件に残る", async () => {
    const base = lineSource();
    vi.mocked(loadSkillMapSource).mockResolvedValue({
      ...base,
      stages: [
        ...base.stages,
        {
          id: "id-x",
          slug: "x",
          title: "x の講座",
          // 線は b の 1 本だけ。c は「線の無い前提」(AND の 2 本目)。
          prerequisites: ["c", "b"],
          parent: "b",
          category: "プログラミング",
        },
      ],
    });
    const stages = await fetchStages();
    const x = stages.get("id-x");
    expect(x?.parent_id).toBe("id-b");
    expect(x?.state).toBe("locked");
    // b (起点) の隣 = 1 歩なので解放条件が出る。線の無い c も名前で残る。
    expect(x?.visibility).toBe("full");
    expect(x?.lock_reasons).toEqual(["c の講座", "b の講座"]);
  });

  it("飛び級で開いた星は unlocked になり、視界の起点にもなる", async () => {
    vi.mocked(loadSkillMapSource).mockResolvedValue({
      ...lineSource(),
      unlockedStageIds: new Set(["id-d"]),
    });
    const stages = await fetchStages();
    expect(stages.get("id-d")?.state).toBe("unlocked");
    // d が起点になるので、その隣 (e) が線だけの段から出て full になる。
    expect(stages.get("id-e")?.visibility).toBe("full");
    // その先 (f) も 2 歩 = 霧まで浮かび上がる。
    expect(stages.get("id-f")?.visibility).toBe("fog");
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
 * 2 つの連結成分をまたぐ形。root1 — x と root2 — m — p があり、x は root1 と p の
 * 両方を前提にする。x は 1 歩先 (full) なので解放条件が出るが、p は root2 から 2 歩で
 * 霧の中。このとき x の解放条件に p の **タイトル** を出すと、ぼかしたはずの名前が
 * 手前の星から読めてしまう。
 *
 * 解放条件を 1 歩先までに絞っても、**線の無い前提 (AND の 2 本目) は視界の外にあり得る**
 * ので、この伏せ字は残る。
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
      // 線は root1 の 1 本 (前提の先頭)。p は線の無い前提。
      s("x", ["root1", "p"], "テーマX"),
      s("root2", [], "テーマY"),
      s("m", ["root2"], "テーマY"),
      // p はテーマを持たない (CMS で作った直後のステージと同じ形)。
      s("p", ["m"]),
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
    expect(stages.get("id-x")?.visibility).toBe("full");
    expect(stages.get("id-p")?.visibility).toBe("fog");
    const reasons = stages.get("id-x")?.lock_reasons ?? [];
    // 見えている前提 (root1) はタイトルのまま。霧の中の p は伏せる。
    expect(reasons).toContain("root1 の講座");
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
    expect(stages.get("id-x")?.lock_reasons).toEqual(["root1 の講座", "テーマY"]);
  });

  it("霧の星そのものも、テーマが無ければ伏せ字を返す (名無しの星にしない)", async () => {
    const stages = await fetchStages();
    const p = stages.get("id-p");
    expect(p?.theme).toBe("？？？");
    // 名前は「ぼかしの予告」として返る (画面側で伏せる)。到達説明は届かないまま。
    expect(p?.title).toBe("p の講座");
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

describe("GET /api/skill-map/mine — 開発者モード (FAB オン)", () => {
  it("霧より先の星にも slug と解放条件を載せる (画面がぼかさず名前を出す材料)", async () => {
    vi.mocked(wantsDevReveal).mockReturnValue(true);
    const stages = await fetchStages();
    const e = stages.get("id-e");
    expect(e?.visibility).toBe("edge");
    expect(e?.title).toBe("e の講座");
    expect(e?.slug).toBe("e");
    expect(e?.lock_reasons).toEqual(["d の講座"]);
    expect(e?.has_icon).toBeUndefined();
  });

  it("4 歩以上先も落とさない (開発者は全体の配置を見たい)", async () => {
    vi.mocked(wantsDevReveal).mockReturnValue(true);
    const stages = await fetchStages();
    expect(stages.size).toBe(6);
    const f = stages.get("id-f");
    expect(f?.visibility).toBe("hidden");
    expect(f?.title).toBe("f の講座");
    expect(f?.parent_id).toBe("id-e");
  });

  it("応答に dev_mode を立て、本番では available も false のまま", async () => {
    vi.mocked(wantsDevReveal).mockReturnValue(true);
    const res = await get("/api/skill-map/mine");
    const body = (await res.json()) as {
      skill_map: { dev_mode?: boolean; dev_mode_available?: boolean };
    };
    expect(body.skill_map.dev_mode).toBe(true);
    // isDevMode はモック既定 false = 本番相当。available は env の有無で、今回の
    // リクエストが開発者表示かどうか (dev_mode) とは別フラグ。
    expect(body.skill_map.dev_mode_available).toBe(false);
  });

  it("開発者表示オフでは霧の星に slug も解放条件も載せない", async () => {
    const stages = await fetchStages();
    const e = stages.get("id-e");
    expect(e?.slug).toBeUndefined();
    expect(e?.lock_reasons).toBeUndefined();
  });
});

/** R2 の get だけ覚える素朴なバケット (アイコンプロキシのテスト用)。 */
function fakeMaterialsBucket(objects: Record<string, string>, onGet?: (key: string) => void) {
  return {
    get: async (key: string) => {
      onGet?.(key);
      const body = objects[key];
      if (body === undefined) return null;
      return { body, size: body.length, httpMetadata: { contentType: "image/svg+xml" } };
    },
  };
}

describe("GET /api/skill-map/stages/:id/icon", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"/>';
  const iconPath = (slug: string) => `tenant/ses/courses/${slug}/icon-abcd1234.svg`;

  beforeEach(() => {
    env.MATERIALS_BUCKET = fakeMaterialsBucket({
      [iconPath("a")]: svg,
      [iconPath("b")]: svg,
      [iconPath("e")]: svg,
    }) as unknown as Env["MATERIALS_BUCKET"];
  });

  it("認証が無ければ 401", async () => {
    const res = await get("/api/skill-map/stages/id-a/icon", false);
    expect(res.status).toBe(401);
  });

  it("霧の外の星の SVG を返す (R2 キーは応答に出さない)", async () => {
    const res = await get("/api/skill-map/stages/id-a/icon");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/image\/svg\+xml/);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await res.text()).toBe(svg);
  });

  it("霧の星は存在ごと 404 (アイコンの有無で霧の中を探れない)", async () => {
    const res = await get("/api/skill-map/stages/id-d/icon");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("ステージが見つかりません");
  });

  it("幽霊ノード (3 歩先) も同じ 404 文言", async () => {
    const res = await get("/api/skill-map/stages/id-e/icon");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("ステージが見つかりません");
  });

  it("開発者表示でも霧の星のアイコンは出さない (開始できない星の正体を形で漏らさない)", async () => {
    vi.mocked(wantsDevReveal).mockReturnValue(true);
    const res = await get("/api/skill-map/stages/id-d/icon");
    expect(res.status).toBe(404);
  });

  it("存在しない id も同じ 404 文言 (有無を区別しない)", async () => {
    const res = await get("/api/skill-map/stages/id-no-such/icon");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("ステージが見つかりません");
  });

  it("R2 に実体が無い星も 404", async () => {
    env.MATERIALS_BUCKET = fakeMaterialsBucket({}) as unknown as Env["MATERIALS_BUCKET"];
    const res = await get("/api/skill-map/stages/id-a/icon");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/skill-map/icons", () => {
  const svgOf = (slug: string) => `<svg xmlns="http://www.w3.org/2000/svg" id="${slug}"/>`;
  const iconPath = (slug: string) => `tenant/ses/courses/${slug}/icon-abcd1234.svg`;

  beforeEach(() => {
    vi.mocked(loadSkillMapSource).mockClear();
    env.MATERIALS_BUCKET = fakeMaterialsBucket({
      [iconPath("a")]: svgOf("a"),
      [iconPath("b")]: svgOf("b"),
      [iconPath("c")]: svgOf("c"),
      [iconPath("d")]: svgOf("d"),
      [iconPath("e")]: svgOf("e"),
    }) as unknown as Env["MATERIALS_BUCKET"];
  });

  it("認証が無ければ 401", async () => {
    const res = await get("/api/skill-map/icons", false);
    expect(res.status).toBe(401);
  });

  it("霧の外の SVG を 1 応答にまとめる (マップ評価は 1 回、R2 キーは出さない)", async () => {
    const res = await get("/api/skill-map/icons");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(loadSkillMapSource).toHaveBeenCalledTimes(1);
    const body = (await res.json()) as { icons: Record<string, string> };
    expect(body.icons["id-a"]).toBe(svgOf("a"));
    expect(body.icons["id-b"]).toBe(svgOf("b"));
    expect(body.icons["id-c"]).toBe(svgOf("c"));
    expect(body.icons["id-d"]).toBeUndefined();
    expect(body.icons["id-e"]).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("tenant/ses/courses");
  });

  it("霧の星の R2 は取りに行かない (有無で霧の中を探れない)", async () => {
    const keys: string[] = [];
    env.MATERIALS_BUCKET = fakeMaterialsBucket(
      {
        [iconPath("a")]: svgOf("a"),
        [iconPath("d")]: svgOf("d"),
        [iconPath("e")]: svgOf("e"),
      },
      (key) => keys.push(key),
    ) as unknown as Env["MATERIALS_BUCKET"];
    const res = await get("/api/skill-map/icons");
    expect(res.status).toBe(200);
    expect(keys.some((key) => key.includes("/d/"))).toBe(false);
    expect(keys.some((key) => key.includes("/e/"))).toBe(false);
  });

  it("開発者表示でも霧の星のアイコンは出さない", async () => {
    vi.mocked(wantsDevReveal).mockReturnValue(true);
    const res = await get("/api/skill-map/icons");
    const body = (await res.json()) as { icons: Record<string, string> };
    expect(body.icons["id-d"]).toBeUndefined();
    expect(body.icons["id-e"]).toBeUndefined();
  });

  it("R2 に実体が無い星はキーごと落とす (200 のまま)", async () => {
    env.MATERIALS_BUCKET = fakeMaterialsBucket({
      [iconPath("b")]: svgOf("b"),
    }) as unknown as Env["MATERIALS_BUCKET"];
    const res = await get("/api/skill-map/icons");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { icons: Record<string, string> };
    expect(body.icons["id-a"]).toBeUndefined();
    expect(body.icons["id-b"]).toBe(svgOf("b"));
  });
});
