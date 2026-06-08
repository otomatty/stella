/**
 * 受講者向けの小テスト出題 / 採点 API (Issue #23)。
 *
 * - 出題: `get_quiz_for_lesson` RPC でサニタイズ済み (is_correct を含まない) 設問を取得。
 * - 採点: `submit_quiz_attempt` RPC でサーバ採点し、 quiz_attempts に保存。
 *   正解・解説は提出後にのみ戻り値で受け取る (カンニング不可)。
 *
 * いずれも RLS / security definer 配下のため、 未認証や権限外では null / 例外になる。
 */

import type {
  LearnerQuiz,
  QuizAnswer,
  QuizGradeResult,
} from "@falcon/shared/cms/types";
import { getSupabase } from "@/lib/supabase";

/** 受講者向けの設問を取得する。 quiz 未作成 / 権限外なら null。 */
export async function fetchQuizForLearner(
  lessonId: string,
): Promise<LearnerQuiz | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_quiz_for_lesson", {
    p_lesson_id: lessonId,
  });
  if (error) throw new Error(error.message);
  return (data as LearnerQuiz | null) ?? null;
}

/** 回答を送信してサーバ採点する。 結果 (点数 / 合否 / 各問正誤 / 解説) を返す。 */
export async function submitQuizAttempt(
  quizId: string,
  answers: QuizAnswer[],
): Promise<QuizGradeResult> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("submit_quiz_attempt", {
    p_quiz_id: quizId,
    p_answers: answers,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("採点結果が空でした");
  return data as QuizGradeResult;
}
