/**
 * 集中ボーナス — 「1 つの星に絞って続けた日数」の純関数 (Phase 2)。I/O を持たない。
 *
 * ## これは何か
 *
 * ホームの HUD に出す **表示専用の係数**。XP の保存値には一切触らない (`xp.ts` の
 * 計算式も変えない)。「あちこち手を出すより 1 つ登り切る方が早い」という設計上の
 * 主張を、受講者に見える形で置いているだけのもの。したがって:
 *
 *   - 係数を掛けた XP を「合計」として出さない (保存値と食い違う数字を作らない)。
 *     出すのは倍率そのもの (「集中ボーナス ×1.25」) と次の段まであと何日か
 *   - 係数が落ちても失うものは無い。ペナルティではなく、続いている間だけ光る印
 *
 * ## 連続日数の導出仕様
 *
 * 材料は **完了したレッスン** の日付とステージ (`lesson_progress` の completed 行を
 * `updated_at` で日付に落としたもの)。1 日ぶんを次のように判定する:
 *
 *   - その日に完了が **1 件も無ければ** 連続は途切れる (視聴だけの日は伸ばさない)。
 *     「進めた日」を数えたいのであって、開いた日を数えたいのではないため
 *   - その日の完了が **すべてアクティブステージのもの** なら 1 日ぶん数える
 *   - 他のステージの完了が **1 件でも混ざれば** その日で途切れる。「集中」なので、
 *     アクティブの合間に別の星を 1 本進めた日は集中していない日として扱う
 *
 * 起点は今日。ただし **今日まだ完了していないだけでは落とさない** — 起点を昨日に
 * ずらして数える (🔥 の連続学習日数 `computeStreaks` と同じ流儀)。朝に開いた画面で
 * 昨日までのボーナスが消えて見えると、その日の意欲を削ぐため。
 *
 * `updated_at` は完了時刻そのものではなく行の最終更新時刻なので、完了後に同じ
 * レッスンを開き直すと日付が動きうる。動く先は必ず「より新しい日」で、連続を
 * 水増しする方向にしか効かない (表示専用の係数なので許容する)。
 */

import { addStudyDays } from "../study/activity.js";

/** 完了したレッスン 1 件 (日付とステージだけ)。 */
export interface FocusCompletion {
  /** アプリ基準 TZ の `YYYY-MM-DD`。 */
  date: string;
  stageId: string;
}

/**
 * 集中ボーナスの段。**降順** (厚い段が先) で持ち、最初に届いた段を採る。
 *
 * 段を増やすときはここだけを直す。画面側は倍率と `nextTierDays` を読むだけで、
 * しきい値を知らない。
 */
export const FOCUS_BONUS_TIERS: readonly { days: number; multiplier: number }[] = [
  { days: 5, multiplier: 1.5 },
  { days: 2, multiplier: 1.25 },
];

export interface FocusBonus {
  /** アクティブステージだけを完了し続けた連続日数。 */
  streakDays: number;
  /** 表示用の倍率。段に届いていなければ 1。 */
  multiplier: number;
  /** 次の段に必要な日数。最上段に達していれば null。 */
  nextTierDays: number | null;
  /** 次の段の倍率。最上段に達していれば null。 */
  nextMultiplier: number | null;
}

const NO_BONUS: FocusBonus = {
  streakDays: 0,
  multiplier: 1,
  nextTierDays: FOCUS_BONUS_TIERS.at(-1)?.days ?? null,
  nextMultiplier: FOCUS_BONUS_TIERS.at(-1)?.multiplier ?? null,
};

/** 連続日数から段を引く (表示用の倍率と次の段)。 */
export function focusBonusOf(streakDays: number): FocusBonus {
  const tier = FOCUS_BONUS_TIERS.find((t) => streakDays >= t.days);
  const next = [...FOCUS_BONUS_TIERS].reverse().find((t) => streakDays < t.days);
  return {
    streakDays,
    multiplier: tier?.multiplier ?? 1,
    nextTierDays: next?.days ?? null,
    nextMultiplier: next?.multiplier ?? null,
  };
}

/**
 * 完了履歴からアクティブステージの集中連続日数を数え、表示用の倍率にする。
 *
 * アクティブステージが決まっていない受講者はボーナス無し (数えるべき「1 つ」が無い)。
 */
export function computeFocusBonus(
  completions: readonly FocusCompletion[],
  activeStageId: string | null | undefined,
  today: string,
): FocusBonus {
  if (!activeStageId) return NO_BONUS;

  /** 日付 → その日の完了が全部アクティブステージのものか。 */
  const focusedByDate = new Map<string, boolean>();
  for (const c of completions) {
    const focused = c.stageId === activeStageId;
    focusedByDate.set(c.date, (focusedByDate.get(c.date) ?? true) && focused);
  }

  // 今日まだ完了していないだけでは落とさない (起点を昨日にずらす)。
  let cursor = focusedByDate.has(today) ? today : addStudyDays(today, -1);
  let streak = 0;
  while (focusedByDate.get(cursor) === true) {
    streak += 1;
    cursor = addStudyDays(cursor, -1);
  }
  return focusBonusOf(streak);
}
