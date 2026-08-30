import { describe, expect, it } from "vitest";

import { sectorLabelsInView } from "./sector-label";

const view = { x: 0, y: 0, scale: 1, width: 800, height: 600 };

describe("sectorLabelsInView", () => {
  it("画面内に星が無いルートは出さない", () => {
    const labels = sectorLabelsInView(
      [
        { sector: "バックエンド", x: 400, y: 300, radius: 16 },
        { sector: "フロントエンド", x: 5000, y: 300, radius: 16 },
      ],
      view,
    );
    expect(labels.map((l) => l.key)).toEqual(["バックエンド"]);
  });

  it("見えている星のすぐ上に置く", () => {
    const [lab] = sectorLabelsInView(
      [{ sector: "バックエンド", x: 400, y: 300, radius: 16 }],
      view,
    );
    expect(lab?.key).toBe("バックエンド");
    expect(lab?.left).toBeCloseTo(400);
    expect(lab?.top).toBeLessThan(300 - 16);
    expect(lab?.top).toBeGreaterThan(200);
  });

  it("両方見えていれば両方出す (位置は別)", () => {
    const labels = sectorLabelsInView(
      [
        { sector: "バックエンド", x: 200, y: 300, radius: 16 },
        { sector: "フロントエンド", x: 600, y: 300, radius: 16 },
      ],
      view,
    );
    expect(labels.map((l) => l.key).sort()).toEqual(["バックエンド", "フロントエンド"]);
    expect(labels[0]?.left).not.toBe(labels[1]?.left);
  });

  it("上が塞がっていれば横へ逃げる", () => {
    const [lab] = sectorLabelsInView(
      [{ sector: "バックエンド", x: 400, y: 300, radius: 16 }],
      view,
      [{ left: 250, top: 0, width: 300, height: 270 }],
    );
    expect(lab).toBeDefined();
    expect(Math.abs((lab?.left ?? 0) - 400)).toBeGreaterThan(20);
  });

  it("枝が画面端でもタイトルは画面内に収まる", () => {
    const [lab] = sectorLabelsInView([{ sector: "バックエンド", x: 20, y: 20, radius: 16 }], view);
    expect(lab).toBeDefined();
    expect(lab?.left).toBeGreaterThan(0);
    expect(lab?.left).toBeLessThan(800);
    expect(lab?.top).toBeGreaterThan(0);
    expect(lab?.top).toBeLessThan(600);
  });

  it("平行移動と倍率を通して判定する (盤面座標 → 画面座標)", () => {
    const inView = sectorLabelsInView([{ sector: "バックエンド", x: 1000, y: 300, radius: 16 }], {
      ...view,
      x: -300,
      scale: 0.5,
    });
    expect(inView).toHaveLength(1);
    expect(inView[0]?.left).toBeCloseTo(200);

    const out = sectorLabelsInView([{ sector: "バックエンド", x: 1000, y: 300, radius: 16 }], {
      ...view,
      x: -600,
      scale: 0.5,
    });
    expect(out).toEqual([]);
  });

  it("四辺が星で塞がっていても星にかぶせず画面内に出す", () => {
    const stars: { sector: string; x: number; y: number; radius: number }[] = [];
    for (let x = 40; x <= 760; x += 50) {
      stars.push({ sector: "フロントエンド", x, y: 40, radius: 16 });
      stars.push({ sector: "フロントエンド", x, y: 560, radius: 16 });
    }
    for (let y = 90; y <= 510; y += 50) {
      stars.push({ sector: "フロントエンド", x: 40, y, radius: 16 });
      stars.push({ sector: "フロントエンド", x: 760, y, radius: 16 });
    }
    const [lab] = sectorLabelsInView(stars, view);
    expect(lab).toBeDefined();
    expect(lab?.left).toBeGreaterThan(0);
    expect(lab?.left).toBeLessThan(800);
    expect(lab?.top).toBeGreaterThan(0);
    expect(lab?.top).toBeLessThan(600);
    for (const star of stars) {
      expect(Math.hypot((lab?.left ?? 0) - star.x, (lab?.top ?? 0) - star.y)).toBeGreaterThan(24);
    }
  });

  it("箱の大きさが 0 なら何も出さない (初回レンダー前)", () => {
    expect(
      sectorLabelsInView([{ sector: "バックエンド", x: 0, y: 0, radius: 16 }], {
        ...view,
        width: 0,
      }),
    ).toEqual([]);
  });
});
