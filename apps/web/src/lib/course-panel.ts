import type { SkillMapStageNode } from "@/lib/skill-map-api";

export function courseStagesOf(
  nodes: readonly SkillMapStageNode[],
  key: string,
): { open: SkillMapStageNode[]; lockedAhead: SkillMapStageNode[]; hasMoreAhead: boolean } {
  const course = nodes.filter((node) => node.category === key);
  const open = course.filter((node) => node.visibility === "full" && node.state !== "locked");
  const lockedAhead = course.filter(
    (node) => node.visibility === "full" && node.state === "locked",
  );
  const hasMoreAhead = course.some(
    (node) => node.state === "locked" || node.visibility === "fog" || node.visibility === "edge",
  );

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const depths = new Map(
    open.map((node) => {
      const visited = new Set([node.id]);
      let parentId = node.parent_id;
      while (parentId && byId.has(parentId) && !visited.has(parentId)) {
        visited.add(parentId);
        parentId = byId.get(parentId)?.parent_id;
      }
      return [node, visited.size - 1] as const;
    }),
  );
  // 同じ深さでは sort の安定性により API の順番が残る。
  open.sort((a, b) => (depths.get(a) ?? 0) - (depths.get(b) ?? 0));
  return { open, lockedAhead, hasMoreAhead };
}

export function courseStageStatus(
  node: SkillMapStageNode,
  activeStageId: string | null,
): "cleared" | "in-progress" | "startable" {
  if (node.state === "cleared") return "cleared";
  if (node.enrolled || node.id === activeStageId) return "in-progress";
  return "startable";
}

export type CourseStageButton =
  | { label: "課題に取り組む"; kind: "open-task" }
  | { label: "続きから"; kind: "resume" }
  | { label: "レッスン一覧"; kind: "lessons" }
  | { label: "始める"; kind: "start" };

/**
 * 行の主なボタン。盤面の星のカード・道のりと同じく、現在地の受講中で
 * 課題を開く処理があるときだけ「課題に取り組む」。
 */
export function courseStageButton(input: {
  status: "cleared" | "in-progress" | "startable";
  isActive: boolean;
  hasOpenTask: boolean;
}): CourseStageButton {
  if (input.status === "in-progress" && input.isActive && input.hasOpenTask) {
    return { label: "課題に取り組む", kind: "open-task" };
  }
  if (input.status === "cleared") return { label: "レッスン一覧", kind: "lessons" };
  if (input.status === "in-progress") return { label: "続きから", kind: "resume" };
  return { label: "始める", kind: "start" };
}
