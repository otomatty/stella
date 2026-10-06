/**
 * デイリー復習 (SRS) のデータアクセス層。
 * 採点はサーバ側で行い、 正解・解説は解答後にのみ受け取る。
 */

import type { SrsAnswerResult, SrsTodaySummary } from "@stella/shared/srs/types";
import type { TodayVariantReview } from "@stella/shared/tasks/variants";

import { apiFetch } from "./api-client";

/** 今日の復習キューを取得する。 */
export async function getSrsToday(): Promise<SrsTodaySummary | null> {
  const { review } = await apiFetch<{ review: SrsTodaySummary | null }>("/api/srs/today");
  return review ?? null;
}

/** 復習 1 問を送信してサーバ採点する。 */
export async function submitSrsAnswer(
  questionId: string,
  selectedOptionIds: string[],
): Promise<SrsAnswerResult> {
  const { result } = await apiFetch<{ result: SrsAnswerResult }>("/api/srs/answer", {
    method: "POST",
    body: { question_id: questionId, selected_option_ids: selectedOptionIds },
  });
  if (!result) throw new Error("採点結果が空でした");
  return result;
}

/**
 * 今日の類題 (コードの復習、#39)。同じ実装パターンの別の問題を時間を空けて 1 問出す。
 * 無ければ null。類題そのものは「VS Code で開く」から拡張が受け取る。
 */
export async function getTodayVariant(): Promise<TodayVariantReview | null> {
  const { variant } = await apiFetch<{ variant: TodayVariantReview | null }>(
    "/api/variant-reviews/today",
  );
  return variant ?? null;
}
