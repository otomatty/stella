import { SKILL_MAP_ISLAND_CATEGORIES } from "@stella/shared/skill-map/islands";

import type { SkillMapStageNode } from "@/lib/skill-map-api";

import { showsStar } from "./fog-display";

export interface Lane {
  key: string;
  kind: "route" | "nebula";
  stars: SkillMapStageNode[];
  hasMore: boolean;
}

/** サーバーから届いた星だけを、親の深さ順でルート・星雲の行に並べる。 */
export function buildLanes(nodes: readonly SkillMapStageNode[], revealDev: boolean): Lane[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const depths = new Map<string, number>();
  for (const node of nodes) {
    const visited = new Set([node.id]);
    let current = node;
    let depth = 0;
    while (current.parent_id) {
      const parent = byId.get(current.parent_id);
      if (!parent || visited.has(parent.id)) break;
      visited.add(parent.id);
      depth++;
      current = parent;
    }
    depths.set(node.id, depth);
  }
  const depthOf = (node: SkillMapStageNode) => depths.get(node.id) ?? 0;
  const keyOf = (node: SkillMapStageNode) => node.category ?? node.theme ?? "その他";
  const moreKeys = new Set(nodes.filter((node) => node.visibility === "edge").map(keyOf));
  const lanes = new Map<string, Lane>();
  for (const node of nodes) {
    if (!showsStar(node.visibility, revealDev)) continue;
    const key = keyOf(node);
    let lane = lanes.get(key);
    if (!lane) {
      lane = {
        key,
        kind: SKILL_MAP_ISLAND_CATEGORIES.has(key) ? "nebula" : "route",
        stars: [],
        hasMore: moreKeys.has(key),
      };
      lanes.set(key, lane);
    }
    lane.stars.push(node);
  }
  for (const lane of lanes.values()) {
    lane.stars.sort(
      (a, b) =>
        depthOf(a) - depthOf(b) ||
        (a.title ?? a.theme ?? "").localeCompare(b.title ?? b.theme ?? "") ||
        a.id.localeCompare(b.id),
    );
  }
  const minDepth = (lane: Lane) => Math.min(...lane.stars.map(depthOf));
  return [...lanes.values()].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "route" ? -1 : 1;
    return (a.kind === "route" ? minDepth(a) - minDepth(b) : 0) || a.key.localeCompare(b.key);
  });
}
