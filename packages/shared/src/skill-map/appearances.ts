/**
 * スキルツリーの「見た目の複製」— 1 つのステージを複数の扇に置く。
 *
 * ## 実体は 1 行のまま
 *
 * D1 のステージは slug につき 1 行。クリアも受講登録も 1 つ。画面だけ、指定した
 * 扇に同じ星を置く。クリックはどの複製でも同じステージを開く。
 *
 * ## 扇ごとの前提
 *
 * 複製した星の前提は扇で分けられる (Git はフロントが JS のあと、バックが Node のあと)。
 * 実体のロックは **どれか 1 組を満たせば開く** (OR)。片方のルートだけ進む受講者を
 * もう片方の講座まで待たせないため。D1 の `prerequisites` は組の和集合 (グラフ検査・
 * seed 用) で、開く条件の正本はこのモジュール。
 *
 * 島 (`islands.ts`) と同じく、実行時の正本はこのモジュール。教材の
 * `course.json` にも同じ配列を書いてドキュメントとし、ずれは content 側の
 * テストで止める。
 *
 * 未知 slug は複製しない (扇は `category` のまま 1 つ)。
 */

/** slug → 置く扇の名前 (category と同じ語彙)。 */
export const SKILL_MAP_APPEARANCES: Readonly<Record<string, readonly string[]>> = {
  "git-basics": ["フロントエンド", "バックエンド"],
};

/**
 * slug → 扇名 → その複製を開く前提 slug。
 * キーは `SKILL_MAP_APPEARANCES` と同じ。値のキーはその扇の並びと一致させる。
 *
 * **各扇はちょうど 1 つ**。その扇での表示上の親 (線の元) だからで、`evaluate.ts` も
 * API も `[0]` を採る — 2 つ目を足すと並び順で親が決まる曖昧な値になる。
 */
export const SKILL_MAP_APPEARANCE_PREREQUISITES: Readonly<
  Record<string, Readonly<Record<string, readonly string[]>>>
> = {
  "git-basics": {
    フロントエンド: ["javascript-basics"],
    バックエンド: ["node-basics"],
  },
};

/** その slug を複数の扇に置くときの扇名。無ければ `undefined` (複製しない)。 */
export function appearancesOf(slug: string): readonly string[] | undefined {
  return SKILL_MAP_APPEARANCES[slug];
}

/** 扇ごとの前提。無ければ `undefined` (D1 の `prerequisites` を AND で使う)。 */
export function appearancePrerequisitesOf(
  slug: string,
): Readonly<Record<string, readonly string[]>> | undefined {
  return SKILL_MAP_APPEARANCE_PREREQUISITES[slug];
}
