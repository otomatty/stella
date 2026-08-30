import type { SkillMapVisibility } from "@/lib/skill-map-api";

/**
 * 霧の星の名前をぼかすか。
 *
 * 開発者モードではぼかさない — 先のスキルの配置を確認するため。解放 (開始 /
 * 腕試し) はサーバが visibility=fog のまま断るので、見えるだけで開かない。
 */
export function fogObscured(visibility: SkillMapVisibility, revealDev: boolean): boolean {
  return visibility === "fog" && !revealDev;
}
