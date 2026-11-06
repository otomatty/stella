export type StarLabelSide = "below" | "above" | "right" | "left" | "hidden";

interface LabelStar {
  id: string;
  x: number;
  y: number;
  /** 画面上の核の半径。 */
  r: number;
  label: string;
  extraHeight?: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** 名前札の画面上の幅を、文字種ごとの幅と余白 4px で見積もる。 */
export function estimateStarLabelWidth(label: string): number {
  return Array.from(label).reduce(
    (sum, char) => sum + (/\s/u.test(char) ? 3 : /[a-zA-Z0-9]/u.test(char) ? 6 : 10),
    4,
  );
}

/** パンに依存しない、画面座標での名前札の配置。 */
export function placeStarLabels(
  stars: readonly LabelStar[],
  scale: number,
  obstacles: readonly Rect[] = [],
): Map<string, StarLabelSide> {
  const measured = stars.map((star) => ({
    ...star,
    x: star.x * scale,
    y: star.y * scale,
    estimate: estimateStarLabelWidth(star.label),
  }));
  measured.sort((a, b) => b.estimate - a.estimate || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const cores = measured.map((star) => ({
    x: star.x - star.r,
    y: star.y - star.r,
    w: star.r * 2,
    h: star.r * 2,
  }));
  const placed: Rect[] = [];
  const result = new Map<string, StarLabelSide>();
  for (const star of measured) {
    const w = Math.min(90, star.estimate);
    const h = Math.min(2, Math.ceil(star.estimate / 90)) * 12.5 + (star.extraHeight ?? 0);
    const gap = star.r + 3;
    const candidates = [
      ["below", { x: star.x - w / 2, y: star.y + gap, w, h }],
      ["above", { x: star.x - w / 2, y: star.y - gap - h, w, h }],
      ["right", { x: star.x + gap, y: star.y - h / 2, w, h }],
      ["left", { x: star.x - gap - w, y: star.y - h / 2, w, h }],
    ] as const;
    result.set(star.id, "hidden");
    for (const [side, rect] of candidates) {
      if (
        cores.some((core) => overlaps(rect, core)) ||
        placed.some((label) => overlaps(rect, label)) ||
        obstacles.some((obstacle) => overlaps(rect, obstacle))
      ) {
        continue;
      }
      placed.push(rect);
      result.set(star.id, side);
      break;
    }
  }
  return result;
}
