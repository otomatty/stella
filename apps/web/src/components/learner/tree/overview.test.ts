import { describe, expect, it } from "vitest";

import type { SkillMapStageNode } from "@/lib/skill-map-api";

import { placeOverviewCards, summarizeRegions, type OverviewCard } from "./overview";
import type { RadialLayout, RadialNode } from "./radial-layout";

function star(
  id: string,
  sector: string,
  overrides: Partial<SkillMapStageNode> = {},
  x = 100,
  y = 200,
): RadialNode {
  return {
    instanceId: id,
    node: { id, title: id, state: "locked", visibility: "full", ...overrides },
    sector,
    x,
    y,
    ring: 0,
  };
}

function layout(nodes: RadialNode[]): RadialLayout {
  return {
    nodes,
    edges: [],
    sectors: ["基礎", "フロントエンド"].map((key) => ({ key, labelX: 0, labelY: 0 })),
    islands: ["Python", "DevOps"].map((key) => ({
      key,
      cx: 0,
      cy: 0,
      radius: 100,
      labelX: 0,
      labelY: 0,
      bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    })),
    bounds: { minX: 0, minY: 0, maxX: 1000, maxY: 1000 },
    mainlandBounds: null,
    width: 1000,
    height: 1000,
    centerX: 500,
    centerY: 500,
  };
}

describe("summarizeRegions", () => {
  it("幽霊を数えず、外接にも含めず、空の区域も出さない", () => {
    const result = summarizeRegions(
      layout([
        star("visible", "基礎"),
        star("ghost", "基礎", { visibility: "edge" }, 900, 900),
        star("hidden", "Python", { visibility: "hidden" }),
      ]),
      null,
      false,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      locked: 1,
      bounds: { minX: 40, minY: 140, maxX: 160, maxY: 260 },
      cx: 100,
      cy: 200,
    });
  });

  it("ルートを sectors 順、その後に星雲を islands 順で出す", () => {
    const result = summarizeRegions(
      layout([
        star("d", "DevOps"),
        star("f", "フロントエンド"),
        star("p", "Python"),
        star("b", "基礎"),
      ]),
      null,
      false,
    );
    expect(result.map(({ key, kind }) => [key, kind])).toEqual([
      ["基礎", "route"],
      ["フロントエンド", "route"],
      ["Python", "nebula"],
      ["DevOps", "nebula"],
    ]);
  });

  it("クリア・受講中・始められる・ロックを数え、進行中の区域と外接の中心を返す", () => {
    const result = summarizeRegions(
      layout([
        star("cleared", "基礎", { state: "cleared" }),
        star("active", "基礎", { state: "unlocked", title: "進行中の星" }, 300, 400),
        star("startable", "基礎", { state: "unlocked" }),
        star("locked", "基礎"),
        star("other", "Python"),
      ]),
      "active",
      false,
    );
    expect(result[0]).toMatchObject({
      cleared: 1,
      active: 1,
      startable: 1,
      locked: 1,
      activeTitle: "進行中の星",
      bounds: { minX: 40, minY: 140, maxX: 360, maxY: 460 },
      cx: 200,
      cy: 300,
    });
    expect(result[1]?.activeTitle).toBeNull();
    expect(result[1]?.active).toBe(0);
  });

  it("扇の見出しがない入口も、描いていればルートとして残す", () => {
    const data = layout([star("entry", "基礎"), star("python", "Python")]);
    data.sectors = [];
    expect(summarizeRegions(data, null, false).map(({ key, kind }) => [key, kind])).toEqual([
      ["基礎", "route"],
      ["Python", "nebula"],
    ]);
  });

  it("現在地でもクリア済みなら受講中に数えない", () => {
    const [region] = summarizeRegions(
      layout([star("done", "基礎", { state: "cleared" })]),
      "done",
      false,
    );
    expect(region).toMatchObject({ cleared: 1, active: 0, activeTitle: null });
  });

  it("開発者表示では、描画する幽霊や hidden の星も集計する", () => {
    const data = layout([
      star("edge", "基礎", { visibility: "edge" }),
      star("hidden", "Python", { visibility: "hidden" }),
    ]);
    expect(summarizeRegions(data, null, false)).toEqual([]);
    expect(summarizeRegions(data, null, true).map(({ locked }) => locked)).toEqual([1, 1]);
  });
});

const card = (key: string, overrides: Partial<OverviewCard> = {}): OverviewCard => ({
  key,
  cx: 300,
  cy: 250,
  width: 160,
  height: 56,
  regionTop: 200,
  regionBottom: 300,
  ...overrides,
});

describe("placeOverviewCards", () => {
  const view = { width: 1440, height: 843 };

  it("重ならない 2 枚は区域の中心に置く", () => {
    const cards = [card("route"), card("nebula", { cx: 700 })];
    expect(placeOverviewCards(cards, [], view).map(({ left, top }) => [left, top])).toEqual([
      [300, 250],
      [700, 250],
    ]);
  });

  it("重なる 2 枚の 2 枚目は区域の下端のすぐ下に置く", () => {
    const cards = [card("frontend"), card("basics")];
    const placed = placeOverviewCards(cards, [], view);
    expect(placed.map(({ key }) => key)).toEqual(["frontend", "basics"]);
    expect(placed[0]?.top).toBe(250);
    expect(placed[1]?.top).toBe(300 + 8 + 56 / 2);
  });

  it("中心が障害物に重なれば区域の下へ逃げる", () => {
    const [placed] = placeOverviewCards(
      [card("route")],
      [{ left: 200, top: 200, width: 200, height: 100 }],
      view,
    );
    expect(placed?.top).toBe(336);
  });

  it("中心と下が塞がっていれば区域の上へ逃げる", () => {
    const [placed] = placeOverviewCards(
      [card("route")],
      [{ left: 200, top: 220, width: 200, height: 150 }],
      view,
    );
    expect(placed?.top).toBe(164);
  });

  it("区域の上下が塞がっていれば高さ + 8px 刻みの候補を試す", () => {
    const [placed] = placeOverviewCards(
      [card("route")],
      [{ left: 200, top: 150, width: 200, height: 225 }],
      view,
    );
    expect(placed?.top).toBe(250 + 3 * 64);
  });

  it("画面端の札は内側 8px に収める", () => {
    const cards = [
      card("left-top", { cx: 0, cy: 0 }),
      card("right-bottom", { cx: view.width, cy: view.height }),
    ];
    for (const placed of placeOverviewCards(cards, [], view)) {
      expect(placed.left - placed.width / 2).toBeGreaterThanOrEqual(8);
      expect(placed.top - placed.height / 2).toBeGreaterThanOrEqual(8);
      expect(placed.left + placed.width / 2).toBeLessThanOrEqual(view.width - 8);
      expect(placed.top + placed.height / 2).toBeLessThanOrEqual(view.height - 8);
    }
  });

  it("候補がすべて塞がっていれば中心に戻す", () => {
    const [placed] = placeOverviewCards([card("route")], [{ left: 0, top: 0, ...view }], view);
    expect(placed).toMatchObject({ left: 300, top: 250 });
  });

  it("入口を含む 2 ルートと 2 星雲を互いに重ねず配置する", () => {
    // 呼び出し側が現在地のフロントエンドを先頭にし、その中心を優先する。
    const placed = placeOverviewCards(
      [
        card("frontend", { width: 220, height: 78, regionTop: 150, regionBottom: 400 }),
        card("basics", { cy: 270, regionTop: 240, regionBottom: 300 }),
        card("python", { cx: 900, cy: 450 }),
        card("devops", { cx: 940, cy: 460, regionBottom: 510 }),
      ],
      [{ left: 900, top: 8, width: 532, height: 120 }],
      view,
    );
    expect(placed[0]).toMatchObject({ left: 300, top: 250 });
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        expect(
          Math.abs(a.left - b.left) >= (a.width + b.width) / 2 ||
            Math.abs(a.top - b.top) >= (a.height + b.height) / 2,
        ).toBe(true);
      }
    }
  });
});
