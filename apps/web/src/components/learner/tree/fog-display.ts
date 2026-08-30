import { isStarVisible } from "@falcon/shared/skill-map/evaluate";

import type { SkillMapVisibility } from "@/lib/skill-map-api";

/**
 * 星の名前をぼかすか。
 *
 * ぼかすのは `full` (0〜1 歩) より先の段すべて。実際に届くのは霧 (2 歩) の名前だけで、
 * `edge` / `hidden` はサーバがそもそも名前を返さないが、判定を「full 以外」に揃えて
 * おくと、段が増えたときに「ぼかし忘れた 1 段」が生まれない。
 *
 * 開発者モードではぼかさない — 先のスキルの配置を確認するため。解放 (開始 / 腕試し) は
 * サーバが `full` 以外を断るので、見えるだけで開かない。
 */
export function fogObscured(visibility: SkillMapVisibility, revealDev: boolean): boolean {
  return visibility !== "full" && !revealDev;
}

/**
 * 盤面に星を描くか。
 *
 * `edge` (3 歩先) は**線の終点になる幽霊ノード**で、星は描かない。座標はレイアウトが
 * 持っている (線を引く先が要る) ので、描画側だけがここで落とす。開発者モードでは
 * 段を素通しするので、幽霊も普通の星として描く。
 */
export function showsStar(visibility: SkillMapVisibility, revealDev: boolean): boolean {
  return revealDev || isStarVisible(visibility);
}
