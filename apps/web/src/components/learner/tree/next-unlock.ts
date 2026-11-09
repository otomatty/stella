import type { SkillMapStageNode } from "@/lib/skill-map-api";

/** サーバーが返した未達の前提名だけを照合する。 */
export function nextUnlockIds(
  nodes: readonly SkillMapStageNode[],
  activeStageId: string | null,
): Set<string> {
  const active = nodes.find(
    (node) =>
      node.id === activeStageId &&
      node.visibility === "full" &&
      node.state !== "cleared" &&
      node.title,
  );
  if (!active) return new Set();
  return new Set(
    nodes
      .filter(
        (node) =>
          node.state === "locked" &&
          node.visibility === "full" &&
          node.lock_reasons?.length === 1 &&
          node.lock_reasons[0] === active.title,
      )
      .map((node) => node.id),
  );
}
