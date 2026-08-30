/**
 * スキルツリーの「島」— 本土 (ITのきほん〜フロントエンド / バックエンド) から
 * 離れた場所に浮かぶ独立の星団。資格や AI のように「目的別の入り口」になる
 * まとまりを、本土の扇ではなく別の島として描く。
 *
 * ## 島は「表示条件を満たした人」にだけ配信する
 *
 * 島のステージは、`requires` のステージを**全てクリア**した受講者にだけ返す。
 * 満たしていない間は霧ですらなく、**存在ごと応答から落とす** (盤面にも出ない)。
 * 伏せるのはサーバ側 (`loadSkillMapSource`) — 画面で隠すだけだと DevTools で
 * 全部読めてしまい、条件が演出でしかなくなる。
 *
 * 表示条件は前提 (`prerequisites`) とは別の軸:
 *   - 前提 = その星を「開ける」条件 (ハードロック。lock_reasons に出る)
 *   - 表示条件 = 島が「地図に現れる」条件 (満たすまで存在も見せない)
 *
 * 本土から島への橋線は引かない — 表示条件は複数になりうるので、線で表すと
 * 「どれか 1 本を満たせばよい」ようにも読めてしまう。島の解放条件は現れた
 * あとの各星のポップオーバー (lock_reasons) が語る。
 *
 * ## 設定の変え方
 *
 * 島を足す / 条件を変えるのはこの配列を編集するだけ。`category` は
 * `packages/content` の course.json の category (= D1 `stages.category`) と
 * 対で保つ。`requires` は同テナントのステージ slug。**未知の slug は「決して
 * 満たされない条件」になり、島は誰にも出ない** — 開きすぎより閉じすぎに倒す
 * (`parsePrerequisites` の番兵と同じ判断)。
 */

/** 1 つの島。 */
export interface SkillMapIsland {
  /** 島のキー = `stages.category` の値。画面の島タイトルにもなる。 */
  category: string;
  /** 表示条件: これらの slug を全てクリアした受講者にだけ島を配信する。 */
  requires: string[];
}

/** 島の一覧 (表示順ではなく定義。並びはレイアウト側がキー順に固定する)。 */
export const SKILL_MAP_ISLANDS: readonly SkillMapIsland[] = [
  { category: "AWS資格", requires: ["it-basics"] },
  { category: "情報処理資格", requires: ["it-basics"] },
  { category: "AI駆動開発", requires: ["it-basics"] },
];

/** 島になるカテゴリ (レイアウトが本土の扇から外すのに使う)。 */
export const SKILL_MAP_ISLAND_CATEGORIES: ReadonlySet<string> = new Set(
  SKILL_MAP_ISLANDS.map((island) => island.category),
);

/**
 * 島の表示条件を適用し、見せてよいステージだけ残す。
 *
 * `clearedStageIds` は id、`requires` は slug なので、渡された stages 全体から
 * slug → id を解いて突き合わせる。島に属さないステージ (本土) は常に残る。
 */
export function filterIslandStages<
  T extends { id: string; slug: string; category?: string | null },
>(stages: readonly T[], clearedStageIds: ReadonlySet<string>): T[] {
  const idBySlug = new Map(stages.map((stage) => [stage.slug, stage.id]));
  const cleared = (slug: string): boolean => {
    const id = idBySlug.get(slug);
    return id !== undefined && clearedStageIds.has(id);
  };
  const visibleIsland = new Map(
    SKILL_MAP_ISLANDS.map((island) => [island.category, island.requires.every(cleared)]),
  );
  return stages.filter((stage) => visibleIsland.get(stage.category ?? "") !== false);
}
