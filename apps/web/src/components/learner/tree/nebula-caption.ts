import { SKILL_MAP_ISLANDS } from "@stella/shared/skill-map/islands";

import type { SkillMapStageNode } from "@/lib/skill-map-api";

export function nebulaCaption(key: string, nodes: readonly SkillMapStageNode[]): string | null {
  const island = SKILL_MAP_ISLANDS.find((island) => island.category === key);
  if (!island) return null;
  if (island.requires.length === 0) return "割り当てで現れた";

  const names = island.requires.map((slug) =>
    slug === "dev-env-basics" ? "入口" : nodes.find((node) => node.slug === slug)?.title,
  );
  if (names.some((name) => !name)) return "前提のクリアで現れた";
  return `${names.join("・")}のクリアで現れた`;
}
