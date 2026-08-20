/**
 * SM-2 間隔反復のコアロジック (デイリー復習 —
 * docs/superpowers/specs/2026-08-20-daily-srs-review-design.md)。
 *
 * 入力は 2 値 (正解 / 誤答)。 SM-2 の quality にマップすると 正解=5 / 誤答=2 で、
 * ease の増減 (+0.10 / -0.32) は式 EF' = EF + (0.1 - (5-q)(0.08 + (5-q)×0.02)) を
 * 定数化したもの。 I/O は持たず、 due 日付の算出は呼び出し側が行う
 * (`toStudyDate` + `addStudyDays`)。
 */

export interface SrsCardState {
  /** SM-2 の ease factor。 初期 2.5、 下限 1.3。 */
  ease: number;
  /** 次回出題までの日数。 */
  intervalDays: number;
  /** 連続正解数 (誤答で 0 に戻る)。 */
  reps: number;
}

export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;

/** 正解 (q=5) の ease 増分。 */
const EASE_GAIN = 0.1;
/** 誤答 (q=2) の ease 減分。 */
const EASE_LOSS = 0.32;

/** 浮動小数の蓄積誤差を抑えるため ease は小数第 2 位に丸めて持つ。 */
function roundEase(v: number): number {
  return Math.round(v * 100) / 100;
}

/** 解答 1 回ぶんカード状態を進める。 `prev` が null なら新規カード (初回解答)。 */
export function sm2Next(prev: SrsCardState | null, correct: boolean): SrsCardState {
  const ease = prev?.ease ?? INITIAL_EASE;
  if (!correct) {
    return { ease: Math.max(MIN_EASE, roundEase(ease - EASE_LOSS)), intervalDays: 1, reps: 0 };
  }
  const nextEase = roundEase(ease + EASE_GAIN);
  const reps = (prev?.reps ?? 0) + 1;
  const intervalDays =
    reps === 1 ? 1 : reps === 2 ? 6 : Math.round((prev?.intervalDays ?? 1) * nextEase);
  return { ease: nextEase, intervalDays, reps };
}
