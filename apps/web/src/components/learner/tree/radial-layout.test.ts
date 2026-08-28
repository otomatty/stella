import { describe, expect, it } from "vitest";

import type { SkillMapStageNode } from "@/lib/skill-map-api";

import { MIN_SEPARATION, layoutRadialSkillTree } from "./radial-layout";

/** 星のボタンの幅 (`SkillTree.tsx` の `w-[120px]`)。これより近いと札が重なる。 */
const BUTTON_WIDTH = 120;

/** 盤面の全組み合わせのうち、いちばん近い 2 星の距離。 */
function closestPair(layout: ReturnType<typeof layoutRadialSkillTree>): number {
  let min = Number.POSITIVE_INFINITY;
  for (const a of layout.nodes) {
    for (const b of layout.nodes) {
      if (a.node.id >= b.node.id) continue;
      min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y));
    }
  }
  return min;
}

const node = (over: Partial<SkillMapStageNode> & { id: string }): SkillMapStageNode => ({
  state: "locked",
  visibility: "full",
  category: "プログラミング",
  prerequisite_ids: [],
  ...over,
});

/** 中心 root → b → c の一本道 + 別カテゴリの x (root 直下)。 */
const tree = (): SkillMapStageNode[] => [
  node({ id: "root", title: "入口", category: "基礎", state: "cleared" }),
  node({ id: "b", title: "B", state: "unlocked", prerequisite_ids: ["root"] }),
  node({ id: "c", title: "C", state: "locked", prerequisite_ids: ["b"] }),
  node({ id: "x", title: "X", category: "資格対策", prerequisite_ids: ["root"] }),
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
    const layout = layoutRadialSkillTree([node({ id: "a", prerequisite_ids: ["missing"] })]);
    expect(layout.edges).toEqual([]);
    expect(layout.nodes).toHaveLength(1);
  });

  it("どの線にも触れていない霧の星は最外リングの先へ送る", () => {
    const layout = layoutRadialSkillTree([
      ...tree(),
      // 霧の星には prerequisite_ids が来ない (サーバが落としている)。
      { id: "fog", state: "locked", visibility: "fog", theme: "テーマZ" },
    ]);
    expect(distanceFromCenter(layout, "fog")).toBeGreaterThan(distanceFromCenter(layout, "c"));
    // カテゴリを持たない霧の星はテーマ名で扇になる。
    expect(layout.sectors.map((s) => s.key)).toContain("テーマZ");
  });

  it("見えている星の前提として参照された霧の星は、その線に従って置く", () => {
    const layout = layoutRadialSkillTree([
      node({ id: "a", title: "A", state: "cleared" }),
      { id: "fog", state: "locked", visibility: "fog", theme: "テーマZ" },
      node({ id: "b", title: "B", prerequisite_ids: ["a", "fog"] }),
    ]);
    expect(distanceFromCenter(layout, "fog")).toBeLessThan(distanceFromCenter(layout, "b"));
    expect(layout.edges.some((e) => e.fromId === "fog" && e.toId === "b")).toBe(true);
  });

  it("前提が循環していても止まらず何かを描く", () => {
    const layout = layoutRadialSkillTree([
      node({ id: "a", prerequisite_ids: ["b"] }),
      node({ id: "b", prerequisite_ids: ["a"] }),
    ]);
    expect(layout.nodes).toHaveLength(2);
    expect(layout.width).toBeGreaterThan(0);
  });

  it("同じリングに星が増えても重ならない (半径が広がる)", () => {
    // 入口 1 つ + 直下に 12 星。リング 1 が混む。
    const many = [
      node({ id: "root", title: "入口", category: "基礎", state: "cleared" }),
      ...Array.from({ length: 12 }, (_, i) =>
        node({ id: `n${i}`, title: `N${i}`, prerequisite_ids: ["root"] }),
      ),
    ];
    const layout = layoutRadialSkillTree(many);
    expect(layout.nodes.filter((n) => n.ring === 1)).toHaveLength(12);
    // 直線距離 (弦長) で見る。星は円弧ではなく直線で重なる。
    expect(closestPair(layout)).toBeGreaterThanOrEqual(MIN_SEPARATION);
  });

  /**
   * 本番のカテゴリ分布。星数の少ない扇 (資格対策 3 件) は扇の角度も狭いので、
   * 「扇の中の星数だけ」で半径を決めると隣とぶつかる。回帰の見張り役。
   */
  it("本番のカテゴリ分布でも、どの 2 星もボタン幅より近づかない", () => {
    const of = (category: string, count: number, prefix: string) =>
      Array.from({ length: count }, (_, i) =>
        node({ id: `${prefix}${i}`, title: `${prefix}${i}`, category, prerequisite_ids: ["root"] }),
      );
    const layout = layoutRadialSkillTree([
      node({ id: "root", title: "ITのきほん", category: "基礎", state: "unlocked" }),
      // it-basics 直下に開く 10 講座 (プログラミング 6 / 資格対策 3 / AI駆動開発 1)。
      ...of("プログラミング", 6, "prog"),
      ...of("資格対策", 3, "cert"),
      ...of("AI駆動開発", 1, "ai"),
    ]);
    expect(closestPair(layout)).toBeGreaterThanOrEqual(BUTTON_WIDTH);
  });

  it("扇をまたいで隣り合う星も離す (扇の境界で詰まらない)", () => {
    // 1 星ずつの扇を並べると、扇の中に隣はいないが円周上では隣り合う。
    const layout = layoutRadialSkillTree([
      node({ id: "root", title: "入口", category: "基礎", state: "cleared" }),
      ...Array.from({ length: 8 }, (_, i) =>
        node({ id: `c${i}`, title: `C${i}`, category: `分野${i}`, prerequisite_ids: ["root"] }),
      ),
    ]);
    expect(closestPair(layout)).toBeGreaterThanOrEqual(BUTTON_WIDTH);
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
      rings: [],
      sectors: [],
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      width: 0,
      height: 0,
      centerX: 0,
      centerY: 0,
    });
  });
});
