/**
 * 受講者向けの小テスト出題 / 採点 API (Issue #23 — Neon / Hono API)。
 *
 * - 出題: `/api/quiz/for-lesson/:lessonId` でサニタイズ済み (is_correct を含まない) 設問を取得。
 * - 採点: `/api/quiz/:quizId/attempt` でサーバ採点し、 quiz_attempts に保存。
 *   正解・解説は提出後にのみ戻り値で受け取る (カンニング不可)。
 */

import type {
  LearnerQuiz,
  QuizAnswer,
  QuizGradeResult,
} from "@falcon/shared/cms/types";
import { apiFetch } from "@/lib/api-client";

/** 受講者向けの設問を取得する。 quiz 未作成 / 権限外なら null。 */
export async function fetchQuizForLearner(
  lessonId: string,
): Promise<LearnerQuiz | null> {
  const { quiz } = await apiFetch<{ quiz: LearnerQuiz | null }>(
    `/api/quiz/for-lesson/${encodeURIComponent(lessonId)}`,
  );
  return quiz ?? null;
}

/** 回答を送信してサーバ採点する。 結果 (点数 / 合否 / 各問正誤 / 解説) を返す。 */
export async function submitQuizAttempt(
  quizId: string,
  answers: QuizAnswer[],
): Promise<QuizGradeResult> {
  const { result } = await apiFetch<{ result: QuizGradeResult }>(
    `/api/quiz/${encodeURIComponent(quizId)}/attempt`,
    { method: "POST", body: { answers } },
  );
  if (!result) throw new Error("採点結果が空でした");
  return result;
}
