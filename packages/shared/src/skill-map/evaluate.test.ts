import { describe, expect, it } from "vitest";

import {
  UNKNOWN_PREREQUISITE_LABEL,
  evaluateSkillMap,
  isSelectableVisibility,
  isStarVisible,
  parentSlugOf,
  type SkillMapResult,
  type SkillMapStage,
} from "./evaluate.js";

/** 解放条件の表示名だけを取り出す (id 付きかどうかは個別のテストで見る)。 */
const reasonLabels = (r: SkillMapResult, stageId: string): string[] =>
  (r.lockReasons.get(stageId) ?? []).map((reason) => reason.label);

/** slug をそのまま id にした簡易ステージ (テストの読みやすさ優先)。 */
function stage(slug: string, prerequisites: string[] = [], extra: Partial<SkillMapStage> = {}) {
  return {
    id: `id-${slug}`,
    slug,
    title: `${slug} の講座`,
    prerequisites,
    category: "プログラミング",
    ...extra,
  } satisfies SkillMapStage;
}

const id = (slug: string) => `id-${slug}`;

/** a → b → c → d → e の一本道。 */
const line: SkillMapStage[] = [
  stage("a"),
  stage("b", ["a"]),
  stage("c", ["b"]),
  stage("d", ["c"]),
  stage("e", ["d"]),
];

describe("evaluateSkillMap — 状態", () => {
  it("何もクリアしていなければ、入口だけが開いて残りはロック", () => {
    const r = evaluateSkillMap({ stages: line, clearedStageIds: new Set() });
    expect(r.states.get(id("a"))).toBe("unlocked");
    expect(r.states.get(id("b"))).toBe("locked");
    expect(r.states.get(id("e"))).toBe("locked");
  });

  it("前提をクリアすると次が開く", () => {
    const r = evaluateSkillMap({ stages: line, clearedStageIds: new Set([id("a")]) });
    expect(r.states.get(id("a"))).toBe("cleared");
    expect(r.states.get(id("b"))).toBe("unlocked");
    expect(r.states.get(id("c"))).toBe("locked");
  });

  it("いま進めている星は active (前提が未充足でもロックに落とさない)", () => {
    const r = evaluateSkillMap({
      stages: line,
      clearedStageIds: new Set(),
      activeStageId: id("c"),
    });
    expect(r.states.get(id("c"))).toBe("active");
    // 着手済みの受講者を後から締め出さない、という決めごと。
    expect(r.lockReasons.has(id("c"))).toBe(false);
  });

  it("クリア済みは active 指定より優先される", () => {
    const r = evaluateSkillMap({
      stages: line,
      clearedStageIds: new Set([id("a")]),
      activeStageId: id("a"),
    });
    expect(r.states.get(id("a"))).toBe("cleared");
  });

  it("飛び級は locked を unlocked にする", () => {
    const base = evaluateSkillMap({ stages: line, clearedStageIds: new Set() });
    expect(base.states.get(id("d"))).toBe("locked");

    const skipped = evaluateSkillMap({
      stages: line,
      clearedStageIds: new Set(),
      unlockedStageIds: new Set([id("d")]),
    });
    expect(skipped.states.get(id("d"))).toBe("unlocked");
    // 飛ばした手前の星まで開いてしまわないこと。
    expect(skipped.states.get(id("c"))).toBe("locked");
  });

  it("全クリアなら全部 cleared で、次の一歩は空", () => {
    const r = evaluateSkillMap({
      stages: line,
      clearedStageIds: new Set(line.map((s) => s.id)),
    });
    expect([...r.states.values()].every((v) => v === "cleared")).toBe(true);
    expect(r.nextStageIds).toEqual([]);
    expect([...r.visibility.values()].every((v) => v === "full")).toBe(true);
  });

  it("空のグラフでも落ちない", () => {
    const r = evaluateSkillMap({ stages: [], clearedStageIds: new Set() });
    expect(r.states.size).toBe(0);
    expect(r.visibility.size).toBe(0);
    expect(r.nextStageIds).toEqual([]);
    expect(r.cycles).toEqual([]);
  });
});

describe("evaluateSkillMap — 分岐 (前提が複数)", () => {
  // claude 系の実データと同じ形: 2 本の前提を両方クリアして初めて開く。
  const branch: SkillMapStage[] = [
    stage("ai-fluency-basics", [], { category: "AI駆動開発" }),
    stage("claude-chat-basics", ["ai-fluency-basics"], { category: "AI駆動開発" }),
    stage("claude-code-basics", ["ai-fluency-basics", "claude-chat-basics"], {
      category: "AI駆動開発",
    }),
  ];

  it("前提が 1 本だけ埋まっても開かない (AND)", () => {
    const r = evaluateSkillMap({
      stages: branch,
      clearedStageIds: new Set([id("ai-fluency-basics")]),
    });
    expect(r.states.get(id("claude-code-basics"))).toBe("locked");
    expect(reasonLabels(r, id("claude-code-basics"))).toEqual(["claude-chat-basics の講座"]);
  });

  it("両方埋まると開き、解放条件は消える", () => {
    const r = evaluateSkillMap({
      stages: branch,
      clearedStageIds: new Set([id("ai-fluency-basics"), id("claude-chat-basics")]),
    });
    expect(r.states.get(id("claude-code-basics"))).toBe("unlocked");
    expect(r.lockReasons.has(id("claude-code-basics"))).toBe(false);
  });

  it("解放条件には未充足の前提だけがタイトルで並ぶ", () => {
    const r = evaluateSkillMap({ stages: branch, clearedStageIds: new Set() });
    expect(reasonLabels(r, id("claude-code-basics"))).toEqual([
      "ai-fluency-basics の講座",
      "claude-chat-basics の講座",
    ]);
    // 呼び出し側が視界で伏せ直せるよう、前提の id も添える。
    expect(r.lockReasons.get(id("claude-code-basics"))?.map((x) => x.stageId)).toEqual([
      id("ai-fluency-basics"),
      id("claude-chat-basics"),
    ]);
  });
});

describe("evaluateSkillMap — 視界", () => {
  /**
   * root → a, root → b → c, x は a と c の両方を要求するが線 (parent) は c から。
   * root と a をクリア: 起点は root / a / b (b は unlocked)。
   */
  const merge = (parent: string | undefined): SkillMapStage[] => [
    stage("root"),
    stage("a", ["root"]),
    stage("b", ["root"]),
    stage("c", ["b"]),
    stage("x", ["a", "c"], parent === undefined ? {} : { parent }),
  ];

  it("視界は親の辺だけで伸びる (線の無い前提からは近づかない)", () => {
    const r = evaluateSkillMap({
      stages: merge("c"),
      clearedStageIds: new Set([id("root"), id("a")]),
    });
    // 解放は AND のまま: a はクリア済みでも c が残っている。
    expect(r.states.get(id("x"))).toBe("locked");
    expect(reasonLabels(r, id("x"))).toEqual(["c の講座"]);
    // 視界は c 経由だけ: b (起点) → c = 1 歩 → x = 2 歩。a から直接は近づかない。
    expect(r.visibility.get(id("c"))).toBe("full");
    expect(r.visibility.get(id("x"))).toBe("fog");
  });

  it("parent 省略時は前提の先頭を親に倒す (CMS 由来の行の互換)", () => {
    const r = evaluateSkillMap({
      stages: merge(undefined),
      clearedStageIds: new Set([id("root"), id("a")]),
    });
    // 先頭 = a が親。a (起点) → x = 1 歩。
    expect(r.visibility.get(id("x"))).toBe("full");
  });

  it("parentSlugOf は parent → 前提の先頭 → undefined の順", () => {
    expect(parentSlugOf({ parent: "c", prerequisites: ["a", "c"] })).toBe("c");
    expect(parentSlugOf({ prerequisites: ["a", "c"] })).toBe("a");
    expect(parentSlugOf({ prerequisites: [] })).toBeUndefined();
  });

  it("起点から 0・1 歩は full、2 歩目は fog、3 歩目は edge、4 歩目以降は hidden", () => {
    const r = evaluateSkillMap({ stages: line, clearedStageIds: new Set() });
    // a が unlocked (= 起点、距離 0)。
    expect(r.visibility.get(id("a"))).toBe("full");
    expect(r.visibility.get(id("b"))).toBe("full"); // 1 歩
    expect(r.visibility.get(id("c"))).toBe("fog"); // 2 歩
    expect(r.visibility.get(id("d"))).toBe("edge"); // 3 歩 = 線だけ
    expect(r.visibility.get(id("e"))).toBe("hidden"); // 4 歩 = 何も出さない
  });

  it("段の判定ヘルパは 4 段を 2 つの軸に落とす", () => {
    expect(isStarVisible("full")).toBe(true);
    expect(isStarVisible("fog")).toBe(true);
    expect(isStarVisible("edge")).toBe(false);
    expect(isStarVisible("hidden")).toBe(false);
    // 触れてよい (開始・腕試し・フォーカス) のは full だけ。
    expect(isSelectableVisibility("full")).toBe(true);
    expect(isSelectableVisibility("fog")).toBe(false);
    expect(isSelectableVisibility("edge")).toBe(false);
    expect(isSelectableVisibility("hidden")).toBe(false);
  });

  it("進むと視界も 1 つずつ前に出る", () => {
    const r = evaluateSkillMap({ stages: line, clearedStageIds: new Set([id("a")]) });
    expect(r.visibility.get(id("c"))).toBe("full");
    expect(r.visibility.get(id("d"))).toBe("fog");
    expect(r.visibility.get(id("e"))).toBe("edge");
  });

  it("繋がっていない星も、開いていれば見える (入口が霧に沈まない)", () => {
    const stages = [...line, stage("island", [], { category: "資格対策" })];
    const r = evaluateSkillMap({ stages, clearedStageIds: new Set() });
    expect(r.states.get(id("island"))).toBe("unlocked");
    expect(r.visibility.get(id("island"))).toBe("full");
  });

  it("飛び級で先へ出ると、飛ばした手前の星は霧に戻らない (無向で数える)", () => {
    const r = evaluateSkillMap({
      stages: line,
      clearedStageIds: new Set(),
      unlockedStageIds: new Set([id("e")]),
    });
    // e が起点になるので、その手前の d も 1 歩で見える。
    expect(r.visibility.get(id("e"))).toBe("full");
    expect(r.visibility.get(id("d"))).toBe("full");
    expect(r.visibility.get(id("c"))).toBe("fog");
  });
});

describe("evaluateSkillMap — 壊れたデータ", () => {
  it("未知 slug の前提は「決してクリアされない前提」として locked のまま残す", () => {
    const stages = [stage("a"), stage("b", ["a", "does-not-exist"])];
    const r = evaluateSkillMap({ stages, clearedStageIds: new Set([id("a")]) });
    expect(r.states.get(id("b"))).toBe("locked");
    // 生の slug は出さない。未公開 / 削除済みステージの識別子になりうるため。
    expect(reasonLabels(r, id("b"))).toEqual([UNKNOWN_PREREQUISITE_LABEL]);
    expect(JSON.stringify(r.lockReasons.get(id("b")))).not.toContain("does-not-exist");
    // 伏せた前提には id が付かない (呼び出し側が視界で引き直せない = 引く先が無い)。
    expect(r.lockReasons.get(id("b"))?.[0]?.stageId).toBeUndefined();
  });

  it("循環は例外にせず cycles で報告する (全員 locked のまま)", () => {
    const stages = [stage("x", ["y"]), stage("y", ["x"]), stage("free")];
    const r = evaluateSkillMap({ stages, clearedStageIds: new Set() });
    expect(r.states.get(id("x"))).toBe("locked");
    expect(r.states.get(id("y"))).toBe("locked");
    expect(r.cycles).toHaveLength(1);
    expect(r.cycles[0]?.sort()).toEqual([id("x"), id("y")]);
    // 健全な星は巻き添えにならない。
    expect(r.states.get(id("free"))).toBe("unlocked");
  });

  it("自己参照も循環として拾う", () => {
    const r = evaluateSkillMap({ stages: [stage("self", ["self"])], clearedStageIds: new Set() });
    expect(r.states.get(id("self"))).toBe("locked");
    expect(r.cycles).toEqual([[id("self")]]);
  });

  it("循環していないグラフでは cycles は空", () => {
    const r = evaluateSkillMap({ stages: line, clearedStageIds: new Set() });
    expect(r.cycles).toEqual([]);
  });
});

describe("evaluateSkillMap — 次の一歩", () => {
  it("unlocked だけが並ぶ", () => {
    const r = evaluateSkillMap({ stages: line, clearedStageIds: new Set([id("a")]) });
    expect(r.nextStageIds).toEqual([id("b")]);
  });

  it("進行中のカテゴリを先に出す", () => {
    const stages = [
      stage("prog-1", [], { category: "プログラミング" }),
      stage("prog-2", ["prog-1"], { category: "プログラミング" }),
      stage("cert-1", [], { category: "資格対策" }),
    ];
    const r = evaluateSkillMap({
      stages,
      clearedStageIds: new Set([id("prog-1")]),
    });
    expect(r.nextStageIds).toEqual([id("prog-2"), id("cert-1")]);
  });

  it("同じ条件なら order → 前提の数 → slug で安定して並ぶ", () => {
    const stages = [
      stage("late", [], { order: 9 }),
      stage("early", [], { order: 1 }),
      stage("zzz"),
      stage("aaa"),
    ];
    const r = evaluateSkillMap({ stages, clearedStageIds: new Set() });
    expect(r.nextStageIds).toEqual([id("early"), id("late"), id("aaa"), id("zzz")]);
  });
});

describe("evaluateSkillMap — 状態の優先順位 (取りこぼしやすい組み合わせ)", () => {
  it("クリア済みなら前提が未充足でも cleared のまま (解放条件も出さない)", () => {
    // 前提を後から足した講座で起きる。既に修了した受講者を locked に落とし直さない。
    const r = evaluateSkillMap({ stages: line, clearedStageIds: new Set([id("d")]) });
    expect(r.states.get(id("d"))).toBe("cleared");
    expect(r.lockReasons.has(id("d"))).toBe(false);
  });

  it("active は飛び級指定より優先される (unlocked ではなく active)", () => {
    const r = evaluateSkillMap({
      stages: line,
      clearedStageIds: new Set(),
      activeStageId: id("d"),
      unlockedStageIds: new Set([id("d")]),
    });
    expect(r.states.get(id("d"))).toBe("active");
    // 「次の一歩」は unlocked だけなので、進行中の星は候補に出さない (二重に急かさない)。
    expect(r.nextStageIds).not.toContain(id("d"));
  });

  it("前提が cleared と active の混在なら、active な前提は充足に数えない", () => {
    // active は「開いている」だけで「終えた」ではない。ここを緩めると、途中の星を
    // 開いただけで先の星が全部開く。
    const stages = [stage("p1"), stage("p2"), stage("goal", ["p1", "p2"])];
    const r = evaluateSkillMap({
      stages,
      clearedStageIds: new Set([id("p1")]),
      activeStageId: id("p2"),
    });
    expect(r.states.get(id("p2"))).toBe("active");
    expect(r.states.get(id("goal"))).toBe("locked");
    expect(reasonLabels(r, id("goal"))).toEqual(["p2 の講座"]);
  });
});

describe("evaluateSkillMap — 2 つの連結成分をまたぐ距離", () => {
  /**
   * root1 — a — x、root2 — m — n — p、そして x は a と p の両方を前提にする。
   * x から見た p は「前提だが遠い星」で、視界の上では霧の中にいる。
   * (API はこの形で、x の解放条件に p のタイトルを出さないことを確かめる)
   */
  const twoRoots: SkillMapStage[] = [
    stage("root1", [], { category: "X" }),
    stage("a", ["root1"], { category: "X" }),
    stage("x", ["a", "p"], { category: "X" }),
    stage("root2", [], { category: "Y" }),
    stage("m", ["root2"], { category: "Y" }),
    stage("n", ["m"], { category: "Y" }),
    stage("p", ["n"], { category: "Y" }),
  ];

  it("どちらの起点からも遠い星は edge、その手前は fog", () => {
    const r = evaluateSkillMap({ stages: twoRoots, clearedStageIds: new Set() });
    // 起点は root1 / root2 (どちらも前提なしで unlocked)。
    expect(r.visibility.get(id("root1"))).toBe("full");
    expect(r.visibility.get(id("a"))).toBe("full");
    expect(r.visibility.get(id("x"))).toBe("fog"); // 2 歩
    expect(r.visibility.get(id("n"))).toBe("fog"); // root2 から 2 歩
    expect(r.visibility.get(id("p"))).toBe("edge"); // どちらの起点からも 3 歩
  });

  it("霧より先の星も、手前の星の解放条件には id つきで並ぶ (伏せるのは呼び出し側)", () => {
    const r = evaluateSkillMap({ stages: twoRoots, clearedStageIds: new Set() });
    expect(r.states.get(id("x"))).toBe("locked");
    expect(r.lockReasons.get(id("x"))?.map((reason) => reason.stageId)).toEqual([id("a"), id("p")]);
  });
});

describe("evaluateSkillMap — 飛び級と推奨順の細部", () => {
  it("飛び級で開いた星は視界の起点になり、次の一歩にも並ぶ", () => {
    const r = evaluateSkillMap({
      stages: line,
      clearedStageIds: new Set(),
      unlockedStageIds: new Set([id("d")]),
    });
    expect(r.states.get(id("d"))).toBe("unlocked");
    expect(r.nextStageIds).toContain(id("d"));
    // 起点なので自分は full、隣 (c / e) も 1 歩で見える。
    expect(r.visibility.get(id("d"))).toBe("full");
    expect(r.visibility.get(id("e"))).toBe("full");
  });

  it("同カテゴリ優先の判定に unlocked は寄与しない (cleared / active だけ)", () => {
    // ongoing に unlocked まで数えると、開いている星のカテゴリが全部「進行中」になり、
    // 並びが slug 順に潰れる (下の期待は逆順になる)。
    const stages = [
      stage("zzz-ongoing", [], { category: "進行中" }),
      stage("aaa-other", [], { category: "別カテゴリ" }),
      stage("done", [], { category: "進行中" }),
    ];
    const r = evaluateSkillMap({ stages, clearedStageIds: new Set([id("done")]) });
    expect(r.nextStageIds).toEqual([id("zzz-ongoing"), id("aaa-other")]);
  });
});

describe("evaluateSkillMap — slug の重複", () => {
  it("同じ slug が複数あれば後勝ちで解決する", () => {
    // テナント内で slug は一意という前提。破れたときに黙って両方を前提扱いすると、
    // 「どちらをクリアすれば開くのか」が入力順で変わって説明できなくなる。
    const stages = [
      { ...stage("dup"), id: "id-dup-old", title: "古い方" },
      { ...stage("dup"), id: "id-dup-new", title: "新しい方" },
      stage("next", ["dup"]),
    ];
    const oldCleared = evaluateSkillMap({ stages, clearedStageIds: new Set(["id-dup-old"]) });
    expect(oldCleared.states.get(id("next"))).toBe("locked");
    expect(reasonLabels(oldCleared, id("next"))).toEqual(["新しい方"]);

    const newCleared = evaluateSkillMap({ stages, clearedStageIds: new Set(["id-dup-new"]) });
    expect(newCleared.states.get(id("next"))).toBe("unlocked");
  });
});

describe("evaluateSkillMap — 扇ごとの前提 (appearances)", () => {
  // Git と同じ形: D1 の prerequisites は和集合、開く条件は扇の組のどれか 1 つ (OR)。
  const dual: SkillMapStage[] = [
    stage("it-basics", [], { category: "基礎", title: "ITのきほん" }),
    stage("html-css-basics", ["it-basics"], {
      category: "フロントエンド",
      title: "HTML/CSS 入門",
    }),
    stage("javascript-basics", ["html-css-basics"], {
      category: "フロントエンド",
      title: "JavaScript 入門",
    }),
    stage("cli-basics", ["it-basics"], {
      category: "バックエンド",
      title: "コマンドライン入門",
    }),
    stage("docker-basics", ["cli-basics"], { category: "バックエンド", title: "Docker 入門" }),
    stage("node-basics", ["docker-basics"], {
      category: "バックエンド",
      title: "Node.js 入門",
    }),
    stage("git-basics", ["javascript-basics", "node-basics"], {
      category: "基礎",
      title: "Git 入門",
    }),
  ];

  it("どちらも埋まっていなければ Git は開かない", () => {
    const r = evaluateSkillMap({
      stages: dual,
      clearedStageIds: new Set([id("it-basics")]),
    });
    expect(r.states.get(id("git-basics"))).toBe("locked");
  });

  it("JavaScript だけクリアすれば Git は開く (フロントの組)", () => {
    const r = evaluateSkillMap({
      stages: dual,
      clearedStageIds: new Set([id("it-basics"), id("html-css-basics"), id("javascript-basics")]),
    });
    expect(r.states.get(id("git-basics"))).toBe("unlocked");
    expect(r.states.get(id("node-basics"))).toBe("locked");
  });

  it("Node.js だけクリアすれば Git は開く (バックの組)", () => {
    const r = evaluateSkillMap({
      stages: dual,
      clearedStageIds: new Set([
        id("it-basics"),
        id("cli-basics"),
        id("docker-basics"),
        id("node-basics"),
      ]),
    });
    expect(r.states.get(id("git-basics"))).toBe("unlocked");
    expect(r.states.get(id("javascript-basics"))).toBe("locked");
  });

  it("片方の扇で開いても、満たしていない扇の前提へ視界が漏れない", () => {
    const r = evaluateSkillMap({
      stages: dual,
      clearedStageIds: new Set([id("it-basics"), id("html-css-basics"), id("javascript-basics")]),
    });
    expect(r.states.get(id("git-basics"))).toBe("unlocked");
    // Git が起点になっても Node へ橋を渡さない。it → cli → docker で Node は 2 歩 = fog。
    expect(r.visibility.get(id("node-basics"))).toBe("fog");
  });
});
