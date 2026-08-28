import { describe, expect, it } from "vitest";

import type { SkillMapStageNode } from "@/lib/skill-map-api";

import { layoutSkillTree } from "./layout";

const node = (over: Partial<SkillMapStageNode> & { id: string }): SkillMapStageNode => ({
  state: "locked",
  visibility: "full",
  category: "プログラミング",
  prerequisite_ids: [],
  ...over,
});

/** a → b → c の一本道 + 別カテゴリの x。 */
const line = (): SkillMapStageNode[] => [
  node({ id: "a", title: "A", state: "cleared", prerequisite_ids: [] }),
  node({ id: "b", title: "B", state: "unlocked", prerequisite_ids: ["a"] }),
  node({ id: "c", title: "C", state: "locked", prerequisite_ids: ["b"] }),
  node({ id: "x", title: "X", category: "インフラ", prerequisite_ids: ["a"] }),
];

describe("layoutSkillTree", () => {
  it("同じ入力なら常に同じ座標 (乱数を使わない)", () => {
    expect(layoutSkillTree(line())).toEqual(layoutSkillTree(line()));
  });

  it("星の並び順が入れ替わっても同じ座標になる", () => {
    const shuffled = [...line()].reverse();
    const byId = (layout: ReturnType<typeof layoutSkillTree>) =>
      new Map(layout.nodes.map((n) => [n.node.id, `${n.x},${n.y}`]));
    expect(byId(layoutSkillTree(shuffled))).toEqual(byId(layoutSkillTree(line())));
  });

  it("前提が深いほど下に置く (線が上下にねじれない)", () => {
    const layout = layoutSkillTree(line());
    const y = new Map(layout.nodes.map((n) => [n.node.id, n.y]));
    expect(y.get("a")).toBeLessThan(y.get("b") ?? 0);
    expect(y.get("b")).toBeLessThan(y.get("c") ?? 0);
    for (const edge of layout.edges) expect(edge.y1).toBeLessThan(edge.y2);
  });

  it("カテゴリごとに列を分ける", () => {
    const layout = layoutSkillTree(line());
    expect(layout.columns.map((col) => col.key)).toEqual(["インフラ", "プログラミング"]);
    const x = new Map(layout.nodes.map((n) => [n.node.id, n.x]));
    expect(x.get("a")).toBe(x.get("b"));
    expect(x.get("x")).not.toBe(x.get("a"));
  });

  it("前提の線は「前提の星がクリア済みか」で実線 / 破線を分ける", () => {
    const layout = layoutSkillTree(line());
    const edge = (from: string) => layout.edges.find((e) => e.fromId === from);
    // a はクリア済み → 充足。b は未クリア → 未充足。
    expect(edge("a")?.satisfied).toBe(true);
    expect(edge("b")?.satisfied).toBe(false);
  });

  it("応答に無い前提 id には線を引かない", () => {
    const layout = layoutSkillTree([node({ id: "a", prerequisite_ids: ["missing"] })]);
    expect(layout.edges).toEqual([]);
    expect(layout.nodes).toHaveLength(1);
  });

  it("どの線にも触れていない霧の星は最下段の先へ送る", () => {
    const layout = layoutSkillTree([
      ...line(),
      // 霧の星には prerequisite_ids が来ない (サーバが落としている)。
      { id: "fog", state: "locked", visibility: "fog", theme: "テーマZ" },
    ]);
    const y = new Map(layout.nodes.map((n) => [n.node.id, n.y]));
    expect(y.get("fog")).toBeGreaterThan(y.get("c") ?? 0);
    // カテゴリを持たない霧の星はテーマ名で列になる。
    expect(layout.columns.map((col) => col.key)).toContain("テーマZ");
  });

  it("見えている星の前提として参照された霧の星は、その線に従って置く", () => {
    const layout = layoutSkillTree([
      node({ id: "a", title: "A", state: "cleared" }),
      { id: "fog", state: "locked", visibility: "fog", theme: "テーマZ" },
      node({ id: "b", title: "B", prerequisite_ids: ["a", "fog"] }),
    ]);
    const y = new Map(layout.nodes.map((n) => [n.node.id, n.y]));
    expect(y.get("fog")).toBeLessThan(y.get("b") ?? 0);
    expect(layout.edges.some((e) => e.fromId === "fog" && e.toId === "b")).toBe(true);
  });

  it("前提が循環していても止まらず何かを描く", () => {
    const layout = layoutSkillTree([
      node({ id: "a", prerequisite_ids: ["b"] }),
      node({ id: "b", prerequisite_ids: ["a"] }),
    ]);
    expect(layout.nodes).toHaveLength(2);
    expect(layout.width).toBeGreaterThan(0);
  });

  it("同じマスに星が増えても重ならない (列幅が広がる)", () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      node({ id: `n${i}`, title: `N${i}`, prerequisite_ids: [] }),
    );
    const layout = layoutSkillTree(many);
    const xs = layout.nodes.map((n) => n.x).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) {
      expect((xs[i] ?? 0) - (xs[i - 1] ?? 0)).toBeGreaterThanOrEqual(100);
    }
    expect(layout.width).toBeGreaterThanOrEqual((xs.at(-1) ?? 0) - (xs[0] ?? 0));
  });

  it("星が 1 つも無ければ空のレイアウト", () => {
    expect(layoutSkillTree([])).toEqual({
      nodes: [],
      edges: [],
      width: 0,
      height: 0,
      columns: [],
    });
  });
});
