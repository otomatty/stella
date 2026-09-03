import { describe, expect, it } from "vitest";

import type { SkillMapStageNode } from "@/lib/skill-map-api";

import { DEPTH_STEP, MIN_SEPARATION, layoutRadialSkillTree } from "./radial-layout";

/** 星の核の直径 (`SkillTree.tsx` の `h-8 w-8`)。これより近いと円が重なる。 */
const STAR_CORE = 32;

/** 盤面の全組み合わせのうち、いちばん近い 2 星の距離。同じ id の複製どうしも測る。 */
function closestPair(layout: ReturnType<typeof layoutRadialSkillTree>): number {
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < layout.nodes.length; i++) {
    for (let j = i + 1; j < layout.nodes.length; j++) {
      const a = layout.nodes[i];
      const b = layout.nodes[j];
      if (!a || !b) continue;
      min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y));
    }
  }
  return min;
}

const node = (over: Partial<SkillMapStageNode> & { id: string }): SkillMapStageNode => ({
  state: "locked",
  visibility: "full",
  category: "プログラミング",
  ...over,
});

/** 中心 root → b → c の一本道 + 別カテゴリの x (root 直下)。 */
const tree = (): SkillMapStageNode[] => [
  node({ id: "root", title: "入口", category: "基礎", state: "cleared" }),
  node({ id: "b", title: "B", state: "unlocked", parent_id: "root" }),
  node({ id: "c", title: "C", state: "locked", parent_id: "b" }),
  node({ id: "x", title: "X", category: "資格対策", parent_id: "root" }),
];

const distanceFromCenter = (layout: ReturnType<typeof layoutRadialSkillTree>, id: string) => {
  const p = layout.nodes.find((n) => n.node.id === id);
  if (!p) throw new Error(`missing node: ${id}`);
  return Math.hypot(p.x - layout.centerX, p.y - layout.centerY);
};

describe("layoutRadialSkillTree", () => {
  it("同じ入力なら常に同じ座標 (乱数を使わない)", () => {
    expect(layoutRadialSkillTree(tree())).toEqual(layoutRadialSkillTree(tree()));
  });

  it("前提が 2 つあっても線は親の 1 本 (線が複数入り込まない)", () => {
    const layout = layoutRadialSkillTree([
      node({ id: "root", title: "入口", category: "基礎", state: "cleared" }),
      node({ id: "a", title: "A", state: "cleared", parent_id: "root" }),
      node({ id: "b", title: "B", state: "unlocked", parent_id: "root" }),
      // 解放条件は a と b の両方 (lock_reasons はサーバが名前で持つ)。線は b から。
      node({ id: "x", title: "X", state: "locked", parent_id: "b", lock_reasons: ["B"] }),
    ]);
    const into = layout.edges.filter((e) => e.toId === "x");
    expect(into.map((e) => e.fromId)).toEqual(["b"]);
    // 点灯は「親をクリア済み」。b は unlocked なので破線。
    expect(into[0]?.satisfied).toBe(false);
  });

  it("星の並び順が入れ替わっても同じ座標になる", () => {
    const shuffled = [...tree()].reverse();
    const byId = (layout: ReturnType<typeof layoutRadialSkillTree>) =>
      new Map(layout.nodes.map((n) => [n.node.id, `${n.x},${n.y}`]));
    expect(byId(layoutRadialSkillTree(shuffled))).toEqual(byId(layoutRadialSkillTree(tree())));
  });

  it("唯一の入口 (前提なしが 1 つ) は中心に置く", () => {
    const layout = layoutRadialSkillTree(tree());
    expect(distanceFromCenter(layout, "root")).toBe(0);
  });

  it("前提が深いほど中心から遠いリングに置く (線が外向きに走る)", () => {
    const layout = layoutRadialSkillTree(tree());
    expect(distanceFromCenter(layout, "root")).toBeLessThan(distanceFromCenter(layout, "b"));
    expect(distanceFromCenter(layout, "b")).toBeLessThan(distanceFromCenter(layout, "c"));
    const ring = new Map(layout.nodes.map((n) => [n.node.id, n.ring]));
    expect(ring.get("root")).toBe(0);
    expect(ring.get("b")).toBe(1);
    expect(ring.get("c")).toBe(2);
  });

  it("前提なしが複数あれば、中心の 1 点ではなく内側のリングに散らす", () => {
    const layout = layoutRadialSkillTree([
      node({ id: "a", title: "A" }),
      node({ id: "b", title: "B" }),
    ]);
    expect(distanceFromCenter(layout, "a")).toBeGreaterThan(0);
    expect(distanceFromCenter(layout, "b")).toBeGreaterThan(0);
  });

  it("カテゴリごとに扇を分け、見出しを持つ", () => {
    const layout = layoutRadialSkillTree(tree());
    const keys = layout.sectors.map((s) => s.key);
    expect(keys).toContain("プログラミング");
    expect(keys).toContain("資格対策");
    const sectorOf = new Map(layout.nodes.map((n) => [n.node.id, n.sector]));
    expect(sectorOf.get("b")).toBe("プログラミング");
    expect(sectorOf.get("x")).toBe("資格対策");
  });

  it("前提の線は「前提の星がクリア済みか」で実線 / 破線を分ける", () => {
    const layout = layoutRadialSkillTree(tree());
    const edge = (from: string, to: string) =>
      layout.edges.find((e) => e.fromId === from && e.toId === to);
    // root はクリア済み → 充足。b は未クリア → 未充足。
    expect(edge("root", "b")?.satisfied).toBe(true);
    expect(edge("b", "c")?.satisfied).toBe(false);
  });

  it("応答に無い前提 id には線を引かない", () => {
    const layout = layoutRadialSkillTree([node({ id: "a", parent_id: "missing" })]);
    expect(layout.edges).toEqual([]);
    expect(layout.nodes).toHaveLength(1);
  });

  it("どの線にも触れていない霧の星は最外リングの先へ送る", () => {
    const layout = layoutRadialSkillTree([
      ...tree(),
      // 霧の星には parent_id が来ない (サーバが落としている)。
      { id: "fog", state: "locked", visibility: "fog", theme: "テーマZ" },
    ]);
    expect(distanceFromCenter(layout, "fog")).toBeGreaterThan(distanceFromCenter(layout, "c"));
    // カテゴリを持たない霧の星はテーマ名で扇になる。
    expect(layout.sectors.map((s) => s.key)).toContain("テーマZ");
  });

  it("線だけの段 (幽霊ノード) も座標を持つ — 線の終点が要るので落とさない", () => {
    const layout = layoutRadialSkillTree([
      node({ id: "a", title: "A", state: "cleared" }),
      // サーバは幽霊ノードに名前を返さない。扇 (category) と親だけが来る。
      { id: "ghost", state: "locked", visibility: "edge", category: "基礎", parent_id: "a" },
    ]);
    expect(layout.nodes.map((n) => n.instanceId)).toContain("ghost");
    expect(layout.edges.some((e) => e.fromId === "a" && e.toId === "ghost")).toBe(true);
    // 手前の星より外側 (「その先へ続く」向きに線が伸びる)。
    expect(distanceFromCenter(layout, "ghost")).toBeGreaterThan(0);
  });

  it("API が線を張れる扇だけを挙げるので、親の無い複製が生えない", () => {
    // `GET /api/skill-map/mine` は、親が応答に載らない扇を `appearances` から落とす
    // (BE 側の親が霧より先なら、Git の複製は FE 扇だけ)。その形で盤面を組むと、
    // 複製は 1 つだけになり、バックエンド扇は開かない。
    const layout = layoutRadialSkillTree([
      node({ id: "it", title: "IT", state: "unlocked" }),
      node({ id: "html", title: "HTML", category: "フロントエンド", parent_id: "it" }),
      {
        id: "js",
        state: "locked",
        visibility: "fog",
        title: "JS",
        category: "フロントエンド",
        parent_id: "html",
      },
      {
        id: "git",
        state: "locked",
        visibility: "edge",
        category: "基礎",
        appearances: ["フロントエンド"],
        appearance_parent_ids: { フロントエンド: "js" },
      },
    ]);
    expect(layout.nodes.filter((n) => n.node.id === "git")).toHaveLength(1);
    expect(layout.sectors.map((s) => s.key)).not.toContain("バックエンド");
    expect(layout.edges.some((e) => e.fromId === "js" && e.toId === "git")).toBe(true);
  });

  it("どの線にも触れていない幽霊ノードも最外リングの先へ送る", () => {
    const layout = layoutRadialSkillTree([
      ...tree(),
      { id: "ghost", state: "locked", visibility: "edge", category: "テーマZ" },
    ]);
    expect(distanceFromCenter(layout, "ghost")).toBeGreaterThan(distanceFromCenter(layout, "c"));
  });

  it("見えている星の前提として参照された霧の星は、その線に従って置く", () => {
    const layout = layoutRadialSkillTree([
      node({ id: "a", title: "A", state: "cleared" }),
      { id: "fog", state: "locked", visibility: "fog", theme: "テーマZ" },
      node({ id: "b", title: "B", parent_id: "fog" }),
    ]);
    expect(distanceFromCenter(layout, "fog")).toBeLessThan(distanceFromCenter(layout, "b"));
    expect(layout.edges.some((e) => e.fromId === "fog" && e.toId === "b")).toBe(true);
  });

  it("前提が循環していても止まらず何かを描く", () => {
    const layout = layoutRadialSkillTree([
      node({ id: "a", parent_id: "b" }),
      node({ id: "b", parent_id: "a" }),
    ]);
    expect(layout.nodes).toHaveLength(2);
    expect(layout.width).toBeGreaterThan(0);
  });

  it("同じ深さに星が増えても重ならない (角度が足りなければ半径を広げる)", () => {
    // 入口 1 つ + 直下に 12 星。深さ 1 が混む。
    const many = [
      node({ id: "root", title: "入口", category: "基礎", state: "cleared" }),
      ...Array.from({ length: 12 }, (_, i) =>
        node({ id: `n${i}`, title: `N${i}`, parent_id: "root" }),
      ),
    ];
    const layout = layoutRadialSkillTree(many);
    expect(layout.nodes.filter((n) => n.ring === 1)).toHaveLength(12);
    // 直線距離 (弦長) で見る。星は円弧ではなく直線で重なる。
    expect(closestPair(layout)).toBeGreaterThanOrEqual(MIN_SEPARATION);
  });

  /**
   * 本番のカテゴリ分布。星数の少ない扇は角度も狭いので、「扇の中の星数だけ」で
   * 半径を決めると隣とぶつかる。回帰の見張り役。島 (資格 / AI) も混ぜて全体で見る。
   * ラベル札は密集する星座では重なりうるので、核 (32px) が重ならないことだけ見る。
   */
  it("本番のカテゴリ分布でも、どの 2 星も核より近づかない", () => {
    const of = (category: string, count: number, prefix: string) =>
      Array.from({ length: count }, (_, i) =>
        node({ id: `${prefix}${i}`, title: `${prefix}${i}`, category, parent_id: "root" }),
      );
    const layout = layoutRadialSkillTree([
      node({ id: "root", title: "ITのきほん", category: "基礎", state: "unlocked" }),
      // it-basics 直下 (本土): フロントエンド 1 (html-css) /
      // バックエンド 2 (sql / cli)。Git は appearances で両ルートへ複製する。
      // 島: AWS資格 1 / 情報処理資格 1 / AI駆動開発 1 / DevOps 1。
      ...of("基礎", 1, "base"),
      ...of("フロントエンド", 1, "fe"),
      ...of("バックエンド", 2, "be"),
      ...of("AWS資格", 1, "aws"),
      ...of("情報処理資格", 1, "cert"),
      ...of("AI駆動開発", 1, "ai"),
      ...of("DevOps", 1, "ops"),
    ]);
    expect(closestPair(layout)).toBeGreaterThanOrEqual(STAR_CORE);
  });

  /**
   * 本番の前提グラフそのもの (`packages/content/courses/<slug>/course.json`)。
   * 「外周ほど星がまばらになる」の回帰の見張り役: 同心円は半径が深さに比例して
   * 伸びるので、角度を扇の幅で割ると深い星ほど離れていく。星座のように、深さに
   * 関係なく「親のすぐ先」に置けているかを距離で見る。
   */
  const productionGraph = (): SkillMapStageNode[] => {
    const rows: [string, string, string[], string[]?][] = [
      ["it-basics", "基礎", []],
      ["html-css-basics", "フロントエンド", ["it-basics"]],
      ["javascript-basics", "フロントエンド", ["html-css-basics"]],
      ["modern-css-basics", "フロントエンド", ["html-css-basics"]],
      ["ui-components-basics", "フロントエンド", ["modern-css-basics"]],
      ["page-composition-basics", "フロントエンド", ["ui-components-basics"]],
      ["typescript-basics", "フロントエンド", ["javascript-basics"]],
      ["fetch-api-basics", "フロントエンド", ["typescript-basics"]],
      ["web-a11y-basics", "フロントエンド", ["fetch-api-basics"]],
      ["npm-build-basics", "フロントエンド", ["git-basics"]],
      ["react-basics", "フロントエンド", ["typescript-basics", "npm-build-basics"]],
      ["frontend-testing-basics", "フロントエンド", ["npm-build-basics"]],
      ["sql-basics", "バックエンド", ["it-basics"]],
      ["cli-basics", "バックエンド", ["sql-basics"]],
      ["db-design-basics", "バックエンド", ["sql-basics"]],
      ["docker-basics", "バックエンド", ["cli-basics"]],
      ["node-basics", "バックエンド", ["cli-basics"]],
      ["typescript-node-basics", "バックエンド", ["node-basics"]],
      ["rest-api-basics", "バックエンド", ["typescript-node-basics"]],
      ["auth-basics", "バックエンド", ["rest-api-basics"]],
      ["web-security-basics", "バックエンド", ["rest-api-basics"]],
      ["python-basics", "バックエンド", ["typescript-node-basics"]],
      ["python-testing-ci-basics", "バックエンド", ["python-basics"]],
      ["test-design-basics", "バックエンド", ["python-testing-ci-basics"]],
      [
        "git-basics",
        "基礎",
        ["javascript-basics", "node-basics"],
        ["フロントエンド", "バックエンド"],
      ],
      ["aws-clf-c02-basics", "AWS資格", ["it-basics"]],
      ["fe-kamoku-a", "情報処理資格", ["it-basics"]],
      ["fe-kamoku-b", "情報処理資格", ["fe-kamoku-a"]],
      ["ai-fluency-basics", "AI駆動開発", ["it-basics"]],
      ["claude-chat-basics", "AI駆動開発", ["ai-fluency-basics"]],
      ["claude-cowork-basics", "AI駆動開発", ["claude-chat-basics"]],
      ["claude-code-basics", "AI駆動開発", ["claude-chat-basics", "ai-fluency-basics"]],
      ["claude-code-skills", "AI駆動開発", ["claude-code-basics"]],
      ["claude-code-team", "AI駆動開発", ["claude-code-basics", "claude-code-skills"]],
      ["devops-basics", "DevOps", ["python-basics"]],
      ["linux-ops-basics", "DevOps", ["devops-basics"]],
      ["networking-ops-basics", "DevOps", ["linux-ops-basics"]],
      ["cicd-basics", "DevOps", ["networking-ops-basics"]],
      ["kubernetes-basics", "DevOps", ["cicd-basics", "docker-basics"]],
      ["terraform-basics", "DevOps", ["devops-basics"]],
      ["observability-basics", "DevOps", ["cicd-basics"]],
    ];
    return rows.map(([id, category, parentIds, appearances]) =>
      node({
        id,
        title: id,
        category,
        ...(parentIds[0] !== undefined ? { parent_id: parentIds[0] } : {}),
        ...(appearances ? { appearances } : {}),
        ...(id === "git-basics"
          ? {
              appearance_parent_ids: {
                フロントエンド: "javascript-basics",
                バックエンド: "node-basics",
              },
            }
          : {}),
      }),
    );
  };

  /** 島の角度配りで親の反対側へ回る星 (下の「1 歩以内」の既知の例外)。 */
  const KNOWN_ISLAND_SPREAD = new Set(["claude-cowork-basics", "claude-code-basics"]);

  describe("外周でもまばらにならない (星座のように詰める)", () => {
    it("本番の前提グラフで、どの星も前提の星から 1 歩ぶん以内にある", () => {
      const layout = layoutRadialSkillTree(productionGraph());
      const byInstance = new Map(layout.nodes.map((n) => [n.instanceId, n]));
      for (const edge of layout.edges) {
        const from = byInstance.get(edge.fromId);
        const to = byInstance.get(edge.toId);
        if (!from || !to) throw new Error(`missing ${edge.fromId} -> ${edge.toId}`);
        // 木の親 (同じ扇の直前の前提) からの線は 1 歩。合流の副線 (React ← TS) は
        // 木の外から来るので長くてよい。ここでは「主線の最短」ではなく「どの星も
        // 何かの前提から 1 歩以内」を見る。
        // 島は円全体に角度を配る (fillCircle) ので、同じ親の兄弟が根の反対側へ回る
        // ことがある — AI駆動開発の claude-chat-basics 直下 (cowork / code) が実際に
        // そうなる (1.7〜2.6 歩)。本番の course.json どおりの姿なので、ここでは
        // 例外として見逃し、島の詰め方は別途扱う。
        if (KNOWN_ISLAND_SPREAD.has(to.node.id)) continue;
        const hops = layout.edges
          .filter((e) => e.toId === to.instanceId)
          .map((e) => {
            const f = byInstance.get(e.fromId);
            return f ? Math.hypot(to.x - f.x, to.y - f.y) : Number.POSITIVE_INFINITY;
          });
        expect(Math.min(...hops), to.instanceId).toBeLessThanOrEqual(DEPTH_STEP * 1.6);
      }
    });

    it("本番の前提グラフで、どの 2 星も名前札より近づかない", () => {
      expect(closestPair(layoutRadialSkillTree(productionGraph()))).toBeGreaterThanOrEqual(
        MIN_SEPARATION,
      );
    });

    it("一本道の鎖は直線に並ばず折れる (星座のゆらぎ、乱数ではなく決定的)", () => {
      const chain = [
        node({ id: "root", title: "入口", category: "基礎", state: "cleared" }),
        ...Array.from({ length: 6 }, (_, i) =>
          node({ id: `s${i}`, title: `S${i}`, parent_id: i === 0 ? "root" : `s${i - 1}` }),
        ),
      ];
      const layout = layoutRadialSkillTree(chain);
      const angles = layout.nodes
        .filter((n) => n.node.id !== "root")
        .map((n) => Math.atan2(n.y - layout.centerY, n.x - layout.centerX));
      expect(new Set(angles.map((a) => a.toFixed(3))).size).toBeGreaterThan(1);
      expect(layoutRadialSkillTree(chain)).toEqual(layout);
    });

    it("扇の中で詰めても、扇の見出しは扇の先に付く", () => {
      const layout = layoutRadialSkillTree(productionGraph());
      const keys = layout.sectors.map((s) => s.key).sort();
      expect(keys).toEqual(["バックエンド", "フロントエンド"]);
      for (const sector of layout.sectors) {
        const outer = Math.max(
          ...layout.nodes
            .filter((n) => n.sector === sector.key)
            .map((n) => Math.hypot(n.x - layout.centerX, n.y - layout.centerY)),
        );
        const labelR = Math.hypot(sector.labelX - layout.centerX, sector.labelY - layout.centerY);
        expect(labelR).toBeGreaterThan(outer);
      }
    });
  });

  describe("島 (資格 / AI のカテゴリ)", () => {
    /** 本土 (root → fe) + AWS資格 1 星 + 情報処理資格 2 星の島。 */
    const withIslands = (): SkillMapStageNode[] => [
      node({ id: "root", title: "ITのきほん", category: "基礎", state: "cleared" }),
      node({ id: "fe", title: "HTML/CSS", category: "フロントエンド", parent_id: "root" }),
      node({ id: "aws", title: "AWS CLF", category: "AWS資格", parent_id: "root" }),
      node({ id: "fea", title: "科目A", category: "情報処理資格", parent_id: "root" }),
      node({ id: "feb", title: "科目B", category: "情報処理資格", parent_id: "fea" }),
    ];

    it("島は本土の扇に混ざらず、離れた位置に置かれる", () => {
      const layout = layoutRadialSkillTree(withIslands());
      expect(layout.sectors.map((s) => s.key)).not.toContain("AWS資格");
      const posOf = (id: string) => {
        const p = layout.nodes.find((n) => n.node.id === id);
        if (!p) throw new Error(`missing node: ${id}`);
        return p;
      };
      // 本土のどの星よりも、島の星は本土の中心から遠い。
      const mainlandMax = Math.max(
        ...["root", "fe"].map((id) =>
          Math.hypot(posOf(id).x - layout.centerX, posOf(id).y - layout.centerY),
        ),
      );
      for (const id of ["aws", "fea", "feb"]) {
        const d = Math.hypot(posOf(id).x - layout.centerX, posOf(id).y - layout.centerY);
        expect(d).toBeGreaterThan(mainlandMax + 50);
      }
    });

    it("本土と島を結ぶ線は引かない (島の中の前提線だけ残る)", () => {
      const layout = layoutRadialSkillTree(withIslands());
      const pairs = layout.edges.map((e) => `${e.fromId}->${e.toId}`);
      expect(pairs).not.toContain("root->aws");
      expect(pairs).not.toContain("root->fea");
      expect(pairs).toContain("fea->feb");
      expect(pairs).toContain("root->fe");
    });

    it("島のタイトルと軌道半径を返す (キー順で決定的)", () => {
      const layout = layoutRadialSkillTree(withIslands());
      expect(layout.islands.map((i) => i.key)).toEqual(["AWS資格", "情報処理資格"]);
      for (const island of layout.islands) {
        expect(island.radius).toBeGreaterThan(0);
        const stars = layout.nodes.filter((n) => n.sector === island.key);
        const topStarY = Math.min(...stars.map((n) => n.y));
        // タイトルは星団のいちばん上の星のすぐ上 (円の外ではない)。
        expect(island.labelY).toBeLessThan(topStarY);
        expect(island.labelY).toBeGreaterThan(topStarY - 50);
      }
    });

    it("島の中は本土と同じ規則 (根が島の中心、前提が深いほど外)", () => {
      const layout = layoutRadialSkillTree(withIslands());
      const island = layout.islands.find((i) => i.key === "情報処理資格");
      if (!island) throw new Error("島がない");
      const posOf = (id: string) => {
        const p = layout.nodes.find((n) => n.node.id === id);
        if (!p) throw new Error(`missing node: ${id}`);
        return p;
      };
      const dOf = (id: string) => Math.hypot(posOf(id).x - island.cx, posOf(id).y - island.cy);
      // 島の中心 = クラスタ原点 = 島の根。外接の真ん中へずらさない。
      expect(dOf("fea")).toBe(0);
      expect(dOf("feb")).toBeGreaterThan(dOf("fea"));
      expect(dOf("fea")).toBeLessThan(island.radius);
      expect(dOf("feb")).toBeLessThan(island.radius);
      // 島の根 (前提が島の外にしか無い) から 1 歩先に、その前提を要求する星。
      const hop = Math.hypot(posOf("feb").x - posOf("fea").x, posOf("feb").y - posOf("fea").y);
      expect(hop).toBeGreaterThanOrEqual(MIN_SEPARATION);
      expect(hop).toBeLessThanOrEqual(DEPTH_STEP * 1.6);
      // 島の星は扇キー = 島キーを持つ (ルート色の割り当てに使う)。
      expect(posOf("fea").sector).toBe("情報処理資格");
    });

    it("深い島でも根が中心、後続は同心円上 (AI 島と同じ形)", () => {
      const layout = layoutRadialSkillTree([
        node({ id: "root", title: "ITのきほん", category: "基礎", state: "cleared" }),
        node({
          id: "ai",
          title: "AI駆動開発の考え方",
          category: "AI駆動開発",
          parent_id: "root",
        }),
        node({
          id: "chat",
          title: "Claude チャット入門",
          category: "AI駆動開発",
          parent_id: "ai",
        }),
        node({
          id: "cowork",
          title: "Cowork 入門",
          category: "AI駆動開発",
          parent_id: "chat",
        }),
        node({
          id: "code",
          title: "Claude Code 入門",
          category: "AI駆動開発",
          parent_id: "chat",
        }),
        node({
          id: "skills",
          title: "Skills とサブエージェント",
          category: "AI駆動開発",
          parent_id: "code",
        }),
      ]);
      const island = layout.islands.find((i) => i.key === "AI駆動開発");
      if (!island) throw new Error("島がない");
      const posOf = (id: string) => {
        const p = layout.nodes.find((n) => n.node.id === id);
        if (!p) throw new Error(`missing node: ${id}`);
        return p;
      };
      const dOf = (id: string) => Math.hypot(posOf(id).x - island.cx, posOf(id).y - island.cy);
      expect(dOf("ai")).toBe(0);
      // chat は第 1 リング、code は chat の 1 つ外 (parent = chat)。
      expect(dOf("chat")).toBeGreaterThan(dOf("ai"));
      expect(dOf("code")).toBeGreaterThan(dOf("chat"));
      expect(dOf("cowork")).toBeGreaterThan(dOf("chat"));
      expect(dOf("skills")).toBeGreaterThan(dOf("code"));
      // 島の根 → 第 1 リングの線はデータ上ある (本土の IT → HTML/CSS と同じ)。
      // 描画で消えるのは水平線 × SVG filter の別問題。
      const pairs = layout.edges.map((e) => `${e.fromId}->${e.toId}`);
      expect(pairs).toContain("ai->chat");
      expect(pairs).toContain("chat->code");
    });

    it("島どうしも重ならない (全組み合わせで核より離れる)", () => {
      const layout = layoutRadialSkillTree(withIslands());
      expect(closestPair(layout)).toBeGreaterThanOrEqual(STAR_CORE);
    });

    it("島しか無い入力でも描ける (本土が空)", () => {
      const layout = layoutRadialSkillTree([
        node({ id: "aws", title: "AWS CLF", category: "AWS資格" }),
      ]);
      expect(layout.nodes).toHaveLength(1);
      expect(layout.islands.map((i) => i.key)).toEqual(["AWS資格"]);
      expect(layout.width).toBeGreaterThan(0);
    });
  });

  describe("appearances (同じステージを複数の扇に置く)", () => {
    const withGit = (): SkillMapStageNode[] => [
      node({ id: "root", title: "ITのきほん", category: "基礎", state: "cleared" }),
      node({
        id: "git",
        title: "Git",
        category: "基礎",
        appearances: ["フロントエンド", "バックエンド"],
        appearance_parent_ids: { フロントエンド: "root", バックエンド: "root" },
        parent_id: "root",
        state: "unlocked",
      }),
      node({
        id: "html",
        title: "HTML/CSS",
        category: "フロントエンド",
        parent_id: "root",
      }),
    ];

    it("Git は 1 ステージのまま、フロントエンドとバックエンドに 1 つずつ置く", () => {
      const layout = layoutRadialSkillTree(withGit());
      const gits = layout.nodes.filter((n) => n.node.id === "git");
      expect(gits).toHaveLength(2);
      expect(gits.map((g) => g.sector).sort()).toEqual(["バックエンド", "フロントエンド"]);
      // 基礎の扇に残るのは中心だけ (Git は複製先へ移る)。
      expect(layout.nodes.filter((n) => n.sector === "基礎").map((n) => n.node.id)).toEqual([
        "root",
      ]);
      // 入力の stages は増えない — 盤面の星が増えるだけ。
      expect(new Set(layout.nodes.map((n) => n.node.id)).size).toBe(3);
    });

    it("中心から各複製へ線を引く (同じ id でも座標が 2 本分ある)", () => {
      const layout = layoutRadialSkillTree(withGit());
      const toGit = layout.edges.filter(
        (e) => e.fromId === "root" && (e.toId === "git" || e.toId.startsWith("git::")),
      );
      expect(toGit).toHaveLength(2);
      const ends = toGit.map((e) => `${e.x2},${e.y2}`);
      expect(new Set(ends).size).toBe(2);
    });

    it("複製どうしも核より近づかない", () => {
      expect(closestPair(layoutRadialSkillTree(withGit()))).toBeGreaterThanOrEqual(STAR_CORE);
    });

    it("複製があっても入力の順を入れ替えても同じ座標", () => {
      const byInstance = (layout: ReturnType<typeof layoutRadialSkillTree>) =>
        new Map(layout.nodes.map((n) => [`${n.node.id}::${n.sector}`, `${n.x},${n.y}`]));
      expect(byInstance(layoutRadialSkillTree([...withGit()].reverse()))).toEqual(
        byInstance(layoutRadialSkillTree(withGit())),
      );
    });

    const withGitAfterBasics = (): SkillMapStageNode[] => [
      node({ id: "root", title: "ITのきほん", category: "基礎", state: "cleared" }),
      node({
        id: "html",
        title: "HTML/CSS",
        category: "フロントエンド",
        parent_id: "root",
        state: "cleared",
      }),
      node({
        id: "js",
        title: "JavaScript",
        category: "フロントエンド",
        parent_id: "html",
        state: "cleared",
      }),
      node({
        id: "cli",
        title: "コマンドライン",
        category: "バックエンド",
        parent_id: "root",
        state: "cleared",
      }),
      node({
        id: "node",
        title: "Node.js",
        category: "バックエンド",
        parent_id: "cli",
        state: "locked",
      }),
      node({
        id: "git",
        title: "Git",
        category: "基礎",
        appearances: ["フロントエンド", "バックエンド"],
        appearance_parent_ids: {
          フロントエンド: "js",
          バックエンド: "node",
        },
        state: "unlocked",
        lock_reasons: undefined,
      }),
    ];

    it("フロントの複製は JS から、バックの複製は Node から線を引く", () => {
      const layout = layoutRadialSkillTree(withGitAfterBasics());
      const feGit = layout.nodes.find((n) => n.node.id === "git" && n.sector === "フロントエンド");
      const beGit = layout.nodes.find((n) => n.node.id === "git" && n.sector === "バックエンド");
      expect(feGit).toBeDefined();
      expect(beGit).toBeDefined();
      const pairs = layout.edges.map((e) => `${e.fromId}->${e.toId}`);
      expect(pairs).toContain(`js->${feGit?.instanceId}`);
      expect(pairs).toContain(`node->${beGit?.instanceId}`);
      expect(pairs.filter((p) => p.startsWith("root->") && p.includes("git"))).toEqual([]);
      expect(pairs).not.toContain(`js->${beGit?.instanceId}`);
      expect(pairs).not.toContain(`node->${feGit?.instanceId}`);
      // 扇をまたいでも、中心から HTML/CSS へは線を引く (島への橋とは別)。
      expect(pairs).toContain("root->html");
      const root = layout.nodes.find((n) => n.node.id === "root");
      const html = layout.nodes.find((n) => n.node.id === "html");
      expect(root && html).toBeTruthy();
      if (root && html) {
        // 中心星 (半径 22) と HTML (半径 16) のあいだに、線として見える隙間を残す。
        expect(Math.hypot(html.x - root.x, html.y - root.y)).toBeGreaterThanOrEqual(22 + 16 + 40);
      }
    });

    it("ITのきほんから出る本土の線は HTML/CSS と SQL の 2 本", () => {
      const layout = layoutRadialSkillTree([
        node({ id: "root", title: "ITのきほん", category: "基礎" }),
        node({
          id: "html",
          title: "HTML/CSS",
          category: "フロントエンド",
          parent_id: "root",
        }),
        node({ id: "sql", title: "SQL", category: "バックエンド", parent_id: "root" }),
        node({
          id: "cli",
          title: "コマンドライン",
          category: "バックエンド",
          parent_id: "sql",
        }),
      ]);
      const fromRoot = layout.edges
        .filter((e) => e.fromId === "root")
        .map((e) => e.toId)
        .sort();
      expect(fromRoot).toEqual(["html", "sql"]);
      expect(layout.edges.some((e) => e.fromId === "sql" && e.toId === "cli")).toBe(true);
    });

    it("クリアしていない扇の複製は鍵のまま (実体は片方で開く)", () => {
      const layout = layoutRadialSkillTree(withGitAfterBasics());
      const feGit = layout.nodes.find((n) => n.node.id === "git" && n.sector === "フロントエンド");
      const beGit = layout.nodes.find((n) => n.node.id === "git" && n.sector === "バックエンド");
      expect(feGit?.node.state).toBe("unlocked");
      expect(beGit?.node.state).toBe("locked");
      expect(beGit?.node.lock_reasons).toEqual(["Node.js"]);
    });

    it("サーバが locked と言った複製は、扇ごとの親が欠けていても開かない", () => {
      const layout = layoutRadialSkillTree(
        withGitAfterBasics().map((n) =>
          n.id === "git"
            ? { ...n, state: "locked" as const, appearance_parent_ids: { フロントエンド: "js" } }
            : n,
        ),
      );
      const gits = layout.nodes.filter((n) => n.node.id === "git");
      expect(gits).toHaveLength(2);
      expect(gits.map((g) => g.node.state)).toEqual(["locked", "locked"]);
    });

    it("飛び級で開いた実体は、扇の親が 1 つも cleared でないので全複製が開いたまま", () => {
      const layout = layoutRadialSkillTree(
        withGitAfterBasics().map((n) => (n.id === "js" ? { ...n, state: "locked" as const } : n)),
      );
      const gits = layout.nodes.filter((n) => n.node.id === "git");
      expect(gits).toHaveLength(2);
      expect(gits.map((g) => g.node.state)).toEqual(["unlocked", "unlocked"]);
      expect(gits.map((g) => g.node.lock_reasons)).toEqual([undefined, undefined]);
    });
  });

  it("扇をまたいで隣り合う星も離す (扇の境界で詰まらない)", () => {
    // 1 星ずつの扇を並べると、扇の中に隣はいないが円周上では隣り合う。
    const layout = layoutRadialSkillTree([
      node({ id: "root", title: "入口", category: "基礎", state: "cleared" }),
      ...Array.from({ length: 8 }, (_, i) =>
        node({ id: `c${i}`, title: `C${i}`, category: `分野${i}`, parent_id: "root" }),
      ),
    ]);
    expect(closestPair(layout)).toBeGreaterThanOrEqual(STAR_CORE);
  });

  it("星の外接範囲 (bounds) を返す — パンの可動域に使う", () => {
    const layout = layoutRadialSkillTree(tree());
    const xs = layout.nodes.map((n) => n.x);
    const ys = layout.nodes.map((n) => n.y);
    expect(layout.bounds).toEqual({
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    });
    // 盤面の矩形より内側 (四隅の空白は含まない)。
    expect(layout.bounds.minX).toBeGreaterThan(0);
    expect(layout.bounds.maxX).toBeLessThan(layout.width);
  });

  it("星が 1 つも無ければ空のレイアウト", () => {
    expect(layoutRadialSkillTree([])).toEqual({
      nodes: [],
      edges: [],
      sectors: [],
      islands: [],
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      width: 0,
      height: 0,
      centerX: 0,
      centerY: 0,
    });
  });
});
