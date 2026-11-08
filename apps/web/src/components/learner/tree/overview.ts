import { showsStar } from "./fog-display";
import type { RadialBounds, RadialLayout } from "./radial-layout";

export interface RegionSummary {
  key: string;
  kind: "route" | "nebula";
  cleared: number;
  active: number;
  startable: number;
  locked: number;
  bounds: RadialBounds;
  cx: number;
  cy: number;
  activeTitle: string | null;
}

/** 盤面に描く星だけを区域ごとに集計する。幽霊ノードの座標も外接に含めない。 */
export function summarizeRegions(
  layout: RadialLayout,
  activeStageId: string | null,
  revealDev: boolean,
): RegionSummary[] {
  const islandKeys = new Set(layout.islands.map((island) => island.key));
  const regions = new Map<string, RegionSummary>();
  for (const placed of layout.nodes) {
    if (!showsStar(placed.node.visibility, revealDev)) continue;
    const { node, sector, x, y } = placed;
    let region = regions.get(sector);
    if (!region) {
      region = {
        key: sector,
        kind: islandKeys.has(sector) ? "nebula" : "route",
        cleared: 0,
        active: 0,
        startable: 0,
        locked: 0,
        bounds: { minX: x - 60, minY: y - 60, maxX: x + 60, maxY: y + 60 },
        cx: x,
        cy: y,
        activeTitle: null,
      };
      regions.set(sector, region);
    }
    if (node.state === "cleared") region.cleared += 1;
    else if (node.id === activeStageId) {
      region.active += 1;
      region.activeTitle = node.title ?? null;
    } else if (node.state === "unlocked") region.startable += 1;
    if (node.state === "locked") region.locked += 1;
    region.bounds.minX = Math.min(region.bounds.minX, x - 60);
    region.bounds.minY = Math.min(region.bounds.minY, y - 60);
    region.bounds.maxX = Math.max(region.bounds.maxX, x + 60);
    region.bounds.maxY = Math.max(region.bounds.maxY, y + 60);
    region.cx = (region.bounds.minX + region.bounds.maxX) / 2;
    region.cy = (region.bounds.minY + region.bounds.maxY) / 2;
  }
  // 入口など扇の見出しに含まれない区域も、ルートの末尾に残す。
  const routeKeys = new Set([
    ...layout.sectors.map((sector) => sector.key),
    ...[...regions.keys()].filter((key) => !islandKeys.has(key)),
  ]);
  return [...routeKeys, ...layout.islands.map((island) => island.key)].flatMap((key) => {
    const region = regions.get(key);
    return region ? [region] : [];
  });
}

export interface OverviewCard {
  key: string;
  cx: number;
  cy: number;
  width: number;
  height: number;
  regionTop: number;
  regionBottom: number;
}

export interface OverviewObstacle {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 入力順に配置する。現在地の区域の優先順位は呼び出し側で先頭にする。left/top は札の中心。 */
export function placeOverviewCards<T extends OverviewCard>(
  cards: readonly T[],
  obstacles: readonly OverviewObstacle[],
  view: { width: number; height: number },
): (T & { left: number; top: number })[] {
  const occupied = [...obstacles];
  return cards.map((card) => {
    const clamp = (value: number, size: number, extent: number) =>
      Math.max(8 + size / 2, Math.min(extent - 8 - size / 2, value));
    const left = clamp(card.cx, card.width, view.width);
    const center = clamp(card.cy, card.height, view.height);
    const candidates = [
      center,
      card.regionBottom + 8 + card.height / 2,
      card.regionTop - 8 - card.height / 2,
      ...Array.from({ length: 6 }, (_, i) => center + (i + 1) * (card.height + 8)),
      ...Array.from({ length: 6 }, (_, i) => center - (i + 1) * (card.height + 8)),
    ];
    const top =
      candidates.find((y) => {
        const rect = {
          left: left - card.width / 2,
          top: y - card.height / 2,
          width: card.width,
          height: card.height,
        };
        return (
          rect.left >= 8 &&
          rect.left + rect.width <= view.width - 8 &&
          rect.top >= 8 &&
          rect.top + rect.height <= view.height - 8 &&
          occupied.every(
            (other) =>
              rect.left + rect.width <= other.left ||
              rect.left >= other.left + other.width ||
              rect.top + rect.height <= other.top ||
              rect.top >= other.top + other.height,
          )
        );
      }) ?? center;
    occupied.push({
      left: left - card.width / 2,
      top: top - card.height / 2,
      width: card.width,
      height: card.height,
    });
    return { ...card, left, top };
  });
}
