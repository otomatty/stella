/**
 * デイリー復習 (SRS) のデータアクセス層
 * (docs/superpowers/specs/2026-08-20-daily-srs-review-design.md §4)。
 * 採点はサーバ側で行い、 正解・解説は解答後にのみ受け取る。
 */

import type { SrsAnswerResult, SrsTodaySummary } from "@falcon/shared/srs/types";

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
