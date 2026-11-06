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

  it("同じカテゴリが分かれているときは星の多いまとまりのそばに置く", () => {
    const stars = [
      { id: "a", parentId: "entrance", sector: "フロントエンド", x: 150, y: 300, radius: 16 },
      { id: "b", parentId: "a", sector: "フロントエンド", x: 210, y: 300, radius: 16 },
      { id: "c", parentId: "entrance", sector: "フロントエンド", x: 500, y: 300, radius: 16 },
      { id: "d", parentId: "c", sector: "フロントエンド", x: 560, y: 300, radius: 16 },
      { id: "e", parentId: "d", sector: "フロントエンド", x: 620, y: 300, radius: 16 },
    ];
    const [label] = sectorLabelsInView(stars, view);
    expect(label?.left).toBe(560);
    expect(label?.top).toBe(264);
    expect(sectorLabelsInView([...stars].reverse(), view)).toEqual([label]);
  });

  it("星の数が同じなら外接の面積が広いまとまりを選ぶ", () => {
    const [label] = sectorLabelsInView(
      [
        { id: "a", sector: "フロントエンド", x: 150, y: 300, radius: 16 },
        { id: "b", parentId: "a", sector: "フロントエンド", x: 210, y: 300, radius: 16 },
        { id: "c", sector: "フロントエンド", x: 500, y: 300, radius: 16 },
        { id: "d", parentId: "c", sector: "フロントエンド", x: 620, y: 300, radius: 16 },
      ],
      view,
    );
    expect(label?.left).toBe(560);
    expect(label?.top).toBe(264);
  });

  it("星の数と面積が同じなら成分内の最小 id で選ぶ", () => {
    const stars = [
      { id: "z", sector: "フロントエンド", x: 150, y: 300, radius: 16 },
      { id: "y", parentId: "z", sector: "フロントエンド", x: 210, y: 300, radius: 16 },
      { id: "b", sector: "フロントエンド", x: 500, y: 300, radius: 16 },
      { id: "a", parentId: "b", sector: "フロントエンド", x: 560, y: 300, radius: 16 },
    ];
    const [label] = sectorLabelsInView(stars, view);
    expect(label?.left).toBe(530);
    expect(sectorLabelsInView([...stars].reverse(), view)).toEqual([label]);
  });

  it("親情報がなければ id があっても従来どおり全星の外接を使う", () => {
    const [label] = sectorLabelsInView(
      [
        { id: "a", sector: "フロントエンド", x: 150, y: 300, radius: 16 },
        { id: "b", sector: "フロントエンド", x: 650, y: 300, radius: 16 },
      ],
      view,
    );
    expect(label?.left).toBe(400);
    expect(label?.top).toBe(264);
  });

  it("選んだまとまりの外の星も障害物として避ける", () => {
    const stars = [
      { id: "a", sector: "フロントエンド", x: 500, y: 300, radius: 16 },
      { id: "b", parentId: "a", sector: "フロントエンド", x: 560, y: 300, radius: 16 },
      { id: "c", parentId: "b", sector: "フロントエンド", x: 620, y: 300, radius: 16 },
      { id: "outside", sector: "フロントエンド", x: 560, y: 264, radius: 16 },
    ];
    const [label] = sectorLabelsInView(stars, view);
    expect(label).toBeDefined();
    expect(label?.left).toBeLessThan(500);
    expect(label?.top).toBe(300);
  });

  it("名前を出すカテゴリに含まれない入口の星も障害物になる", () => {
    const branch = { sector: "フルスタック", x: 400, y: 300, radius: 16 };
    const entrance = { sector: "基礎", x: 400, y: 264, radius: 22 };
    const sectors = new Set(["フルスタック"]);
    const [withoutEntrance] = sectorLabelsInView([branch], view, [], sectors);
    expect(withoutEntrance?.left).toBe(entrance.x);
    expect(withoutEntrance?.top).toBe(entrance.y);

    const labels = sectorLabelsInView([branch, entrance], view, [], sectors);
    expect(labels.map((label) => label.key)).toEqual(["フルスタック"]);
    const label = labels[0];
    expect(label).toBeDefined();
    if (!label) throw new Error("ルート名が配置されていない");
    const halfWidth = (branch.sector.length * 12 + 12) / 2;
    for (const star of [branch, entrance]) {
      const nearestX = Math.max(label.left - halfWidth, Math.min(star.x, label.left + halfWidth));
      const nearestY = Math.max(label.top - 10, Math.min(star.y, label.top + 10));
      expect(Math.hypot(star.x - nearestX, star.y - nearestY)).toBeGreaterThanOrEqual(
        star.radius + 2,
      );
    }
    expect(sectorLabelsInView([entrance], view, [], sectors)).toEqual([]);
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
