/**
 * スキルツリーの「島」— 本土 (ITのきほん〜フロントエンド / バックエンド) から
 * 離れた場所に浮かぶ独立の星団。資格・AI・特定ベンダーの案件トラックのように
 * 「目的別の入り口」になるまとまりを、本土の扇ではなく別の島として描く。
 *
 * 島の中身が `audience: granted` の講座だけなら、割り当てられていない受講者には
 * 星が 1 つも残らないので島ごと現れない (`Salesforce案件` がこの形)。
 *
 * ## 島は「表示条件を満たした人」にだけ配信する
 *
 * 島のステージは、`requires` のステージを**全てクリア**した受講者にだけ返す。
 * 満たしていない間は霧ですらなく、**存在ごと応答から落とす** (盤面にも出ない)。
 * 伏せるのはサーバ側 (`loadSkillMapSource`) — 画面で隠すだけだと DevTools で
 * 全部読めてしまい、条件が演出でしかなくなる。
 *
 * 表示条件は島ごとに変えられる。資格 / AI は ITのきほん、DevOps はバックエンドの
 * Python 入門、という具合に、本土のどこまで進んだ人にその島を見せるかを書く。
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
  { category: "DevOps", requires: ["python-basics"] },
  { category: "Salesforce案件", requires: ["it-basics"] },
];

/** 島になるカテゴリ (レイアウトが本土の扇から外すのに使う)。 */
export const SKILL_MAP_ISLAND_CATEGORIES: ReadonlySet<string> = new Set(
  SKILL_MAP_ISLANDS.map((island) => island.category),
);

/**
 * 島カテゴリ → それを**島として描ける**画面の `tiers` 下限。
 *
 * 載っていない島 (資格 / AI) は最初からあるので常に配る。載っている島は、申告が
 * 下限未満の画面には**存在ごと落とす**。旧 bundle の `SKILL_MAP_ISLAND_CATEGORIES`
 * に無いカテゴリは本土の扇に混ざり、親が本土だと橋線が引かれてしまう
 * (DevOps の親は `python-basics`)。`edge` と同じくクエリ引数 `tiers` で版を申告する
 * (ヘッダにしない — CORS 許可リストに無いと全呼び出しが落ちる)。
 */
export const SKILL_MAP_ISLAND_MIN_TIERS: Readonly<Record<string, number>> = {
  DevOps: 3,
};

/**
 * 画面が島として描けないカテゴリのステージを落とす。
 *
 * `declaredTiers` は `GET /api/skill-map/mine?tiers=` の値。申告なし / 非数は 0。
 */
export function dropIslandsUnknownToClient<T extends { category?: string | null }>(
  stages: readonly T[],
  declaredTiers: string | undefined,
): T[] {
  const parsed = Number.parseInt(declaredTiers ?? "", 10);
  const version = Number.isFinite(parsed) ? parsed : 0;
  return stages.filter((stage) => {
    const min = SKILL_MAP_ISLAND_MIN_TIERS[stage.category ?? ""];
    return min === undefined || version >= min;
  });
}

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
