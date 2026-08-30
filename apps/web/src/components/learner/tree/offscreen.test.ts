import { describe, expect, it } from "vitest";

import { offscreenMarkers } from "./offscreen";

const view = { x: 0, y: 0, scale: 1, width: 800, height: 600 };

describe("offscreenMarkers", () => {
  it("視界の中にある目印には矢印を出さない", () => {
    expect(offscreenMarkers([{ key: "a", x: 400, y: 300 }], view)).toEqual([]);
  });

  it("真上の目印は上の縁の中央に、上向き (0deg) で出す", () => {
    const [m] = offscreenMarkers([{ key: "a", x: 400, y: -500 }], view, 32);
    expect(m).toMatchObject({ key: "a", angle: 0 });
    expect(m?.left).toBeCloseTo(400);
    expect(m?.top).toBeCloseTo(32);
  });

  it("右の目印は右の縁に、右向き (90deg) で出す", () => {
    const [m] = offscreenMarkers([{ key: "a", x: 2000, y: 300 }], view, 32);
    expect(m?.angle).toBeCloseTo(90);
    expect(m?.left).toBeCloseTo(800 - 32);
    expect(m?.top).toBeCloseTo(300);
  });

  it("斜めの目印は角の内側に収まり、向きは斜め", () => {
    const [m] = offscreenMarkers([{ key: "a", x: -1000, y: -1000 }], view, 32);
    expect(m?.left).toBeGreaterThanOrEqual(32);
    expect(m?.top).toBeGreaterThanOrEqual(32);
    expect(m?.angle).toBeLessThan(0);
    expect(m?.angle).toBeGreaterThan(-90);
  });

  it("平行移動と倍率を通して判定する (盤面座標 → 画面座標)", () => {
    // 盤面 (1000, 300) は 0.5× で画面 (500 + x, 150 + y)。x = -300 なら画面 (200, 150) = 中。
    expect(
      offscreenMarkers([{ key: "a", x: 1000, y: 300 }], { ...view, x: -300, scale: 0.5 }),
    ).toEqual([]);
    // x = -600 なら画面 (-100, 150) = 左の外。
    const [m] = offscreenMarkers([{ key: "a", x: 1000, y: 300 }], { ...view, x: -600, scale: 0.5 });
    expect(m?.angle).toBeLessThan(0);
  });

  it("箱の大きさが 0 なら何も出さない (初回レンダー前)", () => {
    expect(offscreenMarkers([{ key: "a", x: 0, y: 0 }], { ...view, width: 0 })).toEqual([]);
  });
});
