/**
 * デイリー復習 (SRS) の API 型
 * (docs/superpowers/specs/2026-08-20-daily-srs-review-design.md §4)。
 * 設問は受講者向けサニタイズ済み (is_correct / explanation を含めない)。
 */

import type { LearnerQuizQuestion } from "../cms/types.js";

/** `GET /api/srs/today` の戻り値。 */
export interface SrsTodaySummary {
  /** 今日出題する設問 (due の古い順)。 上限 20 − answered_today、 下限 5 (前倒し補充)。 */
  questions: LearnerQuizQuestion[];
  /** 今日すでに復習で解答した数。 */
  answered_today: number;
  /** due (期日切れ) カードの総数 (上限適用前)。 */
  due_total: number;
  /** アプリ基準 TZ での今日 (`YYYY-MM-DD`)。 */
  today: string;
}

/** `POST /api/srs/answer` の戻り値 (1 問ごとの即時フィードバック)。 */
export interface SrsAnswerResult {
  question_id: string;
  correct: boolean;
  correct_option_ids: string[];
  explanation: string | null;
  /** 更新後カードの次回出題日 (`YYYY-MM-DD`)。 */
  due_date: string;
  interval_days: number;
}
