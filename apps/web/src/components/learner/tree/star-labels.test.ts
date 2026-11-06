import { describe, expect, it } from "vitest";

import { estimateStarLabelWidth, placeStarLabels } from "./star-labels";

const star = (id: string, x: number, y: number, label = "星の名前") => ({ id, x, y, r: 12, label });

const crowded = [
  star("center", 0, 0, "中央の長い名前"),
  star("bottom", 0, 30),
  star("top", 0, -30),
  star("right", 30, 0),
  star("left", -30, 0),
];

describe("estimateStarLabelWidth", () => {
  it("全角は10px、半角英数は6px、空白は3pxに余白4pxを足す", () => {
    expect(estimateStarLabelWidth("星Aa1 ")).toBe(10 + 6 * 3 + 3 + 4);
  });
});

describe("placeStarLabels", () => {
  it("離れた星はすべて下に置く", () => {
    expect([...placeStarLabels([star("a", 0, 0), star("b", 200, 0)], 1).values()]).toEqual([
      "below",
      "below",
    ]);
  });

  it("札どうしが重なると次の星は別の側に置く", () => {
    const result = placeStarLabels([star("a", 0, 0), star("b", 35, 0)], 1);
    expect(result.get("a")).toBe("below");
    expect(result.get("b")).toBe("above");
  });

  it("核に囲まれて置けない名前は隠す", () => {
    expect(placeStarLabels(crowded, 1).get("center")).toBe("hidden");
  });

  it("見出しの障害物を避けて別の側に置く (障害物は拡縮しない画面座標)", () => {
    const stars = [star("a", 200, 100)];
    const obstacles = [{ x: 70, y: 65, w: 60, h: 34 }];
    expect(placeStarLabels(stars, 0.5).get("a")).toBe("below");
    expect(placeStarLabels(stars, 0.5, obstacles).get("a")).toBe("above");
  });

  it("障害物に囲まれて置けない名前は隠す", () => {
    const obstacles = [
      { x: -30, y: 15, w: 60, h: 34 },
      { x: -30, y: -49, w: 60, h: 34 },
      { x: 15, y: -10, w: 60, h: 20 },
      { x: -75, y: -10, w: 60, h: 20 },
    ];
    expect(placeStarLabels([star("a", 0, 0)], 1, obstacles).get("a")).toBe("hidden");
  });

  it("入力順を変えても配置は同じ", () => {
    expect(placeStarLabels(crowded, 1)).toEqual(placeStarLabels([...crowded].reverse(), 1));
  });

  it("拡大すると隠れる名前の数が減る", () => {
    const hidden = (scale: number) =>
      [...placeStarLabels(crowded, scale).values()].filter((side) => side === "hidden").length;
    expect(hidden(1)).toBeGreaterThan(0);
    expect(hidden(2)).toBeLessThan(hidden(1));
    expect(hidden(3)).toBeLessThanOrEqual(hidden(2));
  });

  it("半角英数と空白の幅で見積もり、長い名前から置く", () => {
    const result = placeStarLabels([star("a", 0, 0, "A A"), star("z", 25, 0, "全角の名前")], 1);
    expect(result.get("z")).toBe("below");
    expect(result.get("a")).toBe("above");
  });

  it("小さな札の高さも衝突判定に含める", () => {
    const stars = [star("a", 0, 0), star("b", 0, 48, "短")];
    expect(placeStarLabels(stars, 1).get("a")).toBe("below");
    expect(placeStarLabels([{ ...stars[0], extraHeight: 12 }, stars[1]], 1).get("a")).toBe("above");
  });
});
