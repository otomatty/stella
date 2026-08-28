/**
 * 経験値とレベル — 純関数。I/O を持たない。
 *
 * ## XP の式
 *
 * ```
 * xp = 10 × 完了レッスン数 + 30 × 合格クイズ数 + 200 × クリアしたステージ数
 *    + 30 × 合格した発見教材数
 * ```
 *
 * 単位を「レッスン 10」に取り、クイズはその 3 倍、ステージ 1 本のクリアは 20 レッスンぶんの
 * 重みにしてある。数字はチューニング前提の初期値で、内訳 (`XpBreakdown`) を返すので
 * 係数を変えても画面側は壊れない。
 *
 * 発見教材 (Phase 4) は小テストと同じ 30。設問数も採点規則も小テスト相当なので、
 * 「AI 生成だから安い / 高い」とは扱わない。**同じ教材に何度合格しても 1 回ぶん**
 * (集計側が教材 id で重複を落とす)。
 *
 * ## レベル曲線
 *
 * Lv n → Lv n+1 に必要な XP は `50n + 50` (100, 150, 200, 250 …) の等差。累積すると
 *
 * ```
 * xpForLevel(n) = Σ[k=1..n-1] (50k + 50) = (n - 1) × (25n + 50)
 * ```
 *
 * で、Lv1 = 0 / Lv2 = 100 / Lv3 = 250 / Lv4 = 450 の素直な二次曲線になる。逆関数は
 *
 * ```
 * levelFromXp(xp) = floor((-25 + √(5625 + 100 × xp)) / 50)
 * ```
 *
 * (`25n² + 25n - 50 ≤ xp` を解いたもの)。境界の XP がちょうど整数になるので、平方根の
 * 丸め誤差で 1 段ずれないよう `xpForLevel` と突き合わせて補正する。
 */

/** XP の内訳。係数を変えても画面が壊れないように、素の件数も一緒に返す。 */
export interface XpBreakdown {
  completedLessons: number;
  passedQuizzes: number;
  clearedStages: number;
  /** 合格した発見教材の数 (Phase 4)。 */
  passedDiscoveries: number;
  fromLessons: number;
  fromQuizzes: number;
  fromStages: number;
  fromDiscoveries: number;
  total: number;
}

export const XP_PER_LESSON = 10;
export const XP_PER_QUIZ = 30;
export const XP_PER_STAGE = 200;
/** 発見教材 1 つの合格 (小テストと同じ重み)。 */
export const XP_PER_DISCOVERY = 30;

function nonNegativeInt(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

/**
 * 完了レッスン / 合格クイズ / クリアステージ / 合格した発見教材の数から XP を出す。
 *
 * `passedDiscoveries` は **省略可**。Phase 4 より前に書かれた呼び出し
 * (テストや将来の別集計) を壊さないため、未指定は 0 とみなす。
 */
export function computeXp(input: {
  completedLessons: number;
  passedQuizzes: number;
  clearedStages: number;
  passedDiscoveries?: number;
}): XpBreakdown {
  const completedLessons = nonNegativeInt(input.completedLessons);
  const passedQuizzes = nonNegativeInt(input.passedQuizzes);
  const clearedStages = nonNegativeInt(input.clearedStages);
  const passedDiscoveries = nonNegativeInt(input.passedDiscoveries ?? 0);
  const fromLessons = completedLessons * XP_PER_LESSON;
  const fromQuizzes = passedQuizzes * XP_PER_QUIZ;
  const fromStages = clearedStages * XP_PER_STAGE;
  const fromDiscoveries = passedDiscoveries * XP_PER_DISCOVERY;
  return {
    completedLessons,
    passedQuizzes,
    clearedStages,
    passedDiscoveries,
    fromLessons,
    fromQuizzes,
    fromStages,
    fromDiscoveries,
    total: fromLessons + fromQuizzes + fromStages + fromDiscoveries,
  };
}

/**
 * そのレベルに到達するのに必要な累積 XP。`xpForLevel(1) === 0`。
 *
 * `levelFromXp` の逆関数: `levelFromXp(xpForLevel(n)) === n` が全ての n ≥ 1 で成り立つ。
 */
export function xpForLevel(level: number): number {
  const n = Math.max(1, Math.floor(level));
  return (n - 1) * (25 * n + 50);
}

/** 累積 XP からレベルを出す (単調非減少、最低 Lv1)。 */
export function levelFromXp(xp: number): number {
  const total = nonNegativeInt(xp);
  let level = Math.max(1, Math.floor((-25 + Math.sqrt(5625 + 100 * total)) / 50));
  // 平方根の丸めで 1 段ずれることがあるので、境界の実値で詰める。
  while (xpForLevel(level + 1) <= total) level++;
  while (level > 1 && xpForLevel(level) > total) level--;
  return level;
}

/** レベルと、次のレベルまでの進み具合。進捗バー用。 */
export interface LevelProgress {
  level: number;
  /** 現在のレベルに入ってから稼いだ XP。 */
  xpIntoLevel: number;
  /** 現在のレベルから次のレベルまでに必要な XP。 */
  xpToNextLevel: number;
  /** 次のレベルに到達する累積 XP。 */
  nextLevelAt: number;
}

export function levelProgress(xp: number): LevelProgress {
  const total = nonNegativeInt(xp);
  const level = levelFromXp(total);
  const base = xpForLevel(level);
  const nextLevelAt = xpForLevel(level + 1);
  return {
    level,
    xpIntoLevel: total - base,
    xpToNextLevel: nextLevelAt - base,
    nextLevelAt,
  };
}
