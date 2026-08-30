/**
 * 視界の中にあるルート (扇) のタイトル置き場 — 純関数。
 *
 * 扇見出しは盤面の外周に固定すると、枝の途中へ寄ったときに画面外へ消える。
 * いま見えている星の外接のすぐ上を優先し、星・名前札・HUD にかぶる / 画面から
 * 食み出すときは左 → 右 → 下へ逃げる。座標は画面 (箱の左上が原点)。
 */

import type { ViewState } from "./offscreen";

export interface SectorStar {
  sector: string;
  /** 盤面座標。 */
  x: number;
  y: number;
  radius: number;
}

export interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface SectorLabelPlacement {
  key: string;
  /** 画面座標。ラベルの中心 (`-translate-x-1/2 -translate-y-1/2`)。 */
  left: number;
  top: number;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** 星の名前札 (`SkillTree.tsx` の `w-[4.5rem]` / 8px 2 行)。盤面 px。 */
const STAR_LABEL_W = 72;
const STAR_LABEL_H = 22;
const STAR_LABEL_GAP = 2;
/** ルート名の高さ (画面 px)。島タイトルの 11px に合わせる。 */
const LABEL_H = 20;
/** 1 文字あたりの幅の見積 (画面 px)。太字 + tracking。 */
const LABEL_CHAR_W = 12;
const LABEL_PAD_X = 12;
/** 画面の縁から空ける余白。 */
const INSET = 16;
/** 星の外接 / 障害物との隙間。 */
const GAP = 10;

function labelSize(key: string): { w: number; h: number } {
  return { w: Math.max(48, key.length * LABEL_CHAR_W + LABEL_PAD_X), h: LABEL_H };
}

function toScreen(x: number, y: number, view: ViewState): { sx: number; sy: number } {
  return { sx: x * view.scale + view.x, sy: y * view.scale + view.y };
}

function starInView(star: SectorStar, view: ViewState): boolean {
  const { sx, sy } = toScreen(star.x, star.y, view);
  const r = star.radius * view.scale;
  return sx + r >= 0 && sx - r <= view.width && sy + r >= 0 && sy - r <= view.height;
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function circleHitsRect(cx: number, cy: number, r: number, rect: Rect): boolean {
  const nx = Math.max(rect.left, Math.min(cx, rect.right));
  const ny = Math.max(rect.top, Math.min(cy, rect.bottom));
  return Math.hypot(cx - nx, cy - ny) < r;
}

function labelRect(cx: number, cy: number, w: number, h: number): Rect {
  return { left: cx - w / 2, top: cy - h / 2, right: cx + w / 2, bottom: cy + h / 2 };
}

function screenRectToRect(r: ScreenRect): Rect {
  return { left: r.left, top: r.top, right: r.left + r.width, bottom: r.top + r.height };
}

function fitsInView(rect: Rect, view: ViewState): boolean {
  return (
    rect.left >= INSET &&
    rect.top >= INSET &&
    rect.right <= view.width - INSET &&
    rect.bottom <= view.height - INSET
  );
}

/**
 * いま画面内にあるルートのタイトル位置。星が 1 つも見えていないルートは出さない。
 */
export function sectorLabelsInView(
  stars: readonly SectorStar[],
  view: ViewState,
  obstacles: readonly ScreenRect[] = [],
): SectorLabelPlacement[] {
  if (view.width <= 0 || view.height <= 0) return [];

  const visible = stars.filter((s) => starInView(s, view));
  if (visible.length === 0) return [];

  const bySector = new Map<string, SectorStar[]>();
  for (const star of visible) {
    const list = bySector.get(star.sector);
    if (list) list.push(star);
    else bySector.set(star.sector, [star]);
  }

  const obstacleRects = obstacles.map(screenRectToRect);
  const placedRects: Rect[] = [];
  const out: SectorLabelPlacement[] = [];

  const keys = [...bySector.keys()].sort((a, b) => a.localeCompare(b, "ja"));
  for (const key of keys) {
    const group = bySector.get(key);
    if (!group || group.length === 0) continue;
    const size = labelSize(key);
    const placement = placeLabel(key, group, visible, view, size, [
      ...obstacleRects,
      ...placedRects,
    ]);
    if (!placement) continue;
    out.push(placement);
    placedRects.push(labelRect(placement.left, placement.top, size.w, size.h));
  }
  return out;
}

function placeLabel(
  key: string,
  group: readonly SectorStar[],
  allVisible: readonly SectorStar[],
  view: ViewState,
  size: { w: number; h: number },
  extraRects: readonly Rect[],
): SectorLabelPlacement | undefined {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const star of group) {
    const { sx, sy } = toScreen(star.x, star.y, view);
    const r = star.radius * view.scale;
    minX = Math.min(minX, sx - r);
    maxX = Math.max(maxX, sx + r);
    minY = Math.min(minY, sy - r);
    maxY = Math.max(maxY, sy + r);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const candidates: { left: number; top: number }[] = [
    { left: cx, top: minY - GAP - size.h / 2 },
    { left: minX - GAP - size.w / 2, top: cy },
    { left: maxX + GAP + size.w / 2, top: cy },
    { left: cx, top: maxY + GAP + size.h / 2 },
  ];

  for (const cand of candidates) {
    const rect = labelRect(cand.left, cand.top, size.w, size.h);
    if (!fitsInView(rect, view)) continue;
    if (blocked(rect, allVisible, view, extraRects)) continue;
    return { key, left: cand.left, top: cand.top };
  }

  // 四辺が塞がっているときは、画面内の空きを粗く探して星に一番近い所へ。
  return scanPlacement(key, cx, cy, size, allVisible, view, extraRects);
}

function scanPlacement(
  key: string,
  cx: number,
  cy: number,
  size: { w: number; h: number },
  stars: readonly SectorStar[],
  view: ViewState,
  extraRects: readonly Rect[],
): SectorLabelPlacement | undefined {
  const x0 = INSET + size.w / 2;
  const x1 = view.width - INSET - size.w / 2;
  const y0 = INSET + size.h / 2;
  const y1 = view.height - INSET - size.h / 2;
  if (x1 < x0 || y1 < y0) return undefined;

  const stepX = Math.max(24, size.w / 2);
  const stepY = Math.max(16, size.h);
  let best: { left: number; top: number; dist: number } | undefined;
  for (let y = y0; y <= y1; y += stepY) {
    for (let x = x0; x <= x1; x += stepX) {
      const rect = labelRect(x, y, size.w, size.h);
      if (blocked(rect, stars, view, extraRects)) continue;
      const dist = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (!best || dist < best.dist) best = { left: x, top: y, dist };
    }
  }
  if (best) return { key, left: best.left, top: best.top };

  // 空きが無ければ画面内へクランプして出す (消すよりマシ)。
  return {
    key,
    left: clamp(cx, x0, x1),
    top: clamp(cy, y0, y1),
  };
}

function blocked(
  rect: Rect,
  stars: readonly SectorStar[],
  view: ViewState,
  extraRects: readonly Rect[],
): boolean {
  for (const extra of extraRects) {
    if (rectsOverlap(rect, extra)) return true;
  }
  for (const star of stars) {
    const { sx, sy } = toScreen(star.x, star.y, view);
    const r = star.radius * view.scale;
    if (circleHitsRect(sx, sy, r + 2, rect)) return true;
    const name: Rect = {
      left: sx - (STAR_LABEL_W * view.scale) / 2,
      top: sy + r + STAR_LABEL_GAP * view.scale,
      right: sx + (STAR_LABEL_W * view.scale) / 2,
      bottom: sy + r + (STAR_LABEL_GAP + STAR_LABEL_H) * view.scale,
    };
    if (rectsOverlap(rect, name)) return true;
  }
  return false;
}

function clamp(n: number, lo: number, hi: number): number {
  if (hi < lo) return (lo + hi) / 2;
  return Math.min(hi, Math.max(lo, n));
}
