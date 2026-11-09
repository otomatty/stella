import { isStarVisible } from "@stella/shared/skill-map/evaluate";

import type { SkillMapStageNode, SkillMapVisibility } from "@/lib/skill-map-api";

/** 名前は full 以外と、1 歩先の locked でぼかす。開発者表示では外す。 */
export function nameObscured(
  node: Pick<SkillMapStageNode, "visibility" | "state">,
  revealDev: boolean,
): boolean {
  return !revealDev && (node.visibility !== "full" || node.state === "locked");
}

/**
 * 盤面に星を描くか。
 *
 * `edge` (2 歩先) は**線の終点になる幽霊ノード**で、星は描かない。座標はレイアウトが
 * 持っている (線を引く先が要る) ので、描画側だけがここで落とす。開発者モードでは
 * 段を素通しするので、幽霊も普通の星として描く。
 */
export function showsStar(visibility: SkillMapVisibility, revealDev: boolean): boolean {
  return revealDev || isStarVisible(visibility);
}
