/**
 * 受講者向け小テスト出題 UI (Issue #23)。
 *
 * - `get_quiz_for_lesson` RPC でサニタイズ済み設問を取得 (正解は含まれない)。
 * - 単一選択 / 真偽 はラジオ、 複数選択 はチェックボックスで回答を収集する。
 * - 「採点する」 で `submit_quiz_attempt` RPC を呼び、 サーバ採点 + quiz_attempts 保存。
 * - 合格 (passed) で onComplete を呼び、 既存の進捗フローでレッスンを完了化する。
 *
 * バックエンド未設定 / quiz 未作成 / 非 uuid lessonId のときは空状態を表示する。
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, X, CheckCircle, Loader2, HelpCircle } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { isBackendConfigured } from "@/lib/backend";
import {
  fetchQuizForLearner,
  submitQuizAttempt,
} from "@/lib/quiz-attempts-api";
import type {
  LearnerQuiz,
  LearnerQuizQuestion,
  QuizGradeResult,
  QuizQuestionResult,
} from "@falcon/shared/cms/types";

interface QuizPlayerProps {
  lessonId: string;
  onComplete?: () => void;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const KIND_LABEL: Record<LearnerQuizQuestion["kind"], string> = {
  single: "単一選択",
  multiple: "複数選択",
  boolean: "真偽",
};

/** Fisher-Yates シャッフル (元配列は破壊しない)。 */
function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** quiz 設定に応じて設問・選択肢の表示順を (必要なら) シャッフルした新オブジェクトを返す。 */
function applyShuffle(quiz: LearnerQuiz): LearnerQuiz {
  let questions = quiz.quiz.shuffle_questions
    ? shuffled(quiz.questions)
    : quiz.questions;
  if (quiz.quiz.shuffle_options) {
    questions = questions.map((q) => ({ ...q, options: shuffled(q.options) }));
  }
  return { ...quiz, questions };
}

export function QuizPlayer({ lessonId, onComplete }: QuizPlayerProps) {
  const [quiz, setQuiz] = useState<LearnerQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  // questionId -> 選択した optionId 集合
  const [answers, setAnswers] = useState<Record<string, Set<string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizGradeResult | null>(null);

  const canLoad = isBackendConfigured() && UUID_RE.test(lessonId);

  useEffect(() => {
    if (!canLoad) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setQuiz(null);
    setResult(null);
    setAnswers({});
    (async () => {
      try {
        const data = await fetchQuizForLearner(lessonId);
        if (cancelled) return;
        setQuiz(data ? applyShuffle(data) : null);
      } catch (err) {
        if (!cancelled) {
          console.error("[QuizPlayer] fetch failed", err);
          toast.error("クイズの読み込みに失敗しました");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, canLoad]);

  const toggleOption = useCallback(
    (question: LearnerQuizQuestion, optionId: string) => {
      if (result) return; // 採点後は変更不可
      setAnswers((prev) => {
        const current = new Set(prev[question.id] ?? []);
        if (question.kind === "multiple") {
          if (current.has(optionId)) current.delete(optionId);
          else current.add(optionId);
        } else {
          // single / boolean は単一選択
          current.clear();
          current.add(optionId);
        }
        return { ...prev, [question.id]: current };
      });
    },
    [result],
  );

  const resultByQuestion = useMemo(() => {
    const map: Record<string, QuizQuestionResult> = {};
    for (const r of result?.results ?? []) map[r.question_id] = r;
    return map;
  }, [result]);

  const allAnswered = useMemo(() => {
    if (!quiz) return false;
    return quiz.questions.every((q) => (answers[q.id]?.size ?? 0) > 0);
  }, [quiz, answers]);

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    try {
      const payload = quiz.questions.map((q) => ({
        question_id: q.id,
        selected_option_ids: Array.from(answers[q.id] ?? []),
      }));
      const graded = await submitQuizAttempt(quiz.quiz.id, payload);
      setResult(graded);
      if (graded.passed) {
        toast.success(
          `合格しました！ ${graded.score} / ${graded.max_score} 点`,
        );
        onComplete?.();
      } else {
        toast.message(
          `不合格です (${graded.score} / ${graded.max_score} 点)。 再挑戦してください。`,
        );
      }
    } catch (err) {
      console.error("[QuizPlayer] submit failed", err);
      toast.error(
        err instanceof Error ? err.message : "採点に失敗しました",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setAnswers({});
    // 再挑戦時にも順序を入れ替え、 解答位置の暗記による不正を防ぐ。
    setQuiz((prev) => (prev ? applyShuffle(prev) : prev));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-3">
        <Loader2 size={16} className="animate-spin" /> クイズを読み込み中…
      </div>
    );
  }

  if (!quiz || quiz.questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-ink-3">
        <HelpCircle size={28} className="text-ink-4" />
        <div className="font-medium text-ink-2">クイズはまだ準備中です</div>
        <div className="text-[12.5px]">
          このレッスンの設問はまだ公開されていません。
        </div>
      </div>
    );
  }

  const totalPoints = quiz.questions.reduce((n, q) => n + q.points, 0);
  const scorePercent =
    result && result.max_score > 0
      ? Math.round((result.score * 100) / result.max_score)
      : 0;

  return (
    <div>
      {result ? (
        <Card
          className={cn(
            "mb-5",
            result.passed
              ? "border-success bg-success-soft"
              : "border-danger bg-danger-soft",
          )}
        >
          <CardContent className="flex items-center gap-3">
            {result.passed ? (
              <CheckCircle size={20} className="text-success" />
            ) : (
              <X size={20} className="text-danger" />
            )}
            <div className="flex-1">
              <div
                className={cn(
                  "text-[13px] font-semibold",
                  result.passed ? "text-success" : "text-danger",
                )}
              >
                {result.passed ? "合格です！" : "不合格です"}
              </div>
              <div className="text-[11.5px] text-ink-3">
                獲得点数: {result.score} / {result.max_score} ({scorePercent}%) ·
                合格ライン {quiz.quiz.pass_score}%
              </div>
            </div>
            {!result.passed ? (
              <Button variant="accent" onClick={handleRetry}>
                もう一度挑戦する
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center gap-3 mb-5 text-xs text-ink-3">
          <span>
            全 {quiz.questions.length} 問 · 配点 {totalPoints} 点
          </span>
          <span className="text-ink-4">·</span>
          <span>合格ライン {quiz.quiz.pass_score}%</span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {quiz.questions.map((q, idx) => {
          const qResult = resultByQuestion[q.id];
          const correctIds = new Set(qResult?.correct_option_ids ?? []);
          const selected = answers[q.id] ?? new Set<string>();
          return (
            <Card key={q.id} className="p-6">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[11.5px] text-ink-3 font-semibold">
                  問題 {idx + 1}
                </span>
                <Badge variant="accent">{KIND_LABEL[q.kind]}</Badge>
                <span className="text-[11.5px] text-ink-3">
                  配点 {q.points}点
                </span>
                {qResult ? (
                  qResult.correct ? (
                    <Badge variant="success" className="ml-auto">
                      正解
                    </Badge>
                  ) : (
                    <Badge variant="danger" className="ml-auto">
                      不正解
                    </Badge>
                  )
                ) : null}
              </div>
              <div className="text-base font-semibold tracking-tight leading-snug mb-1.5">
                {q.prompt}
              </div>
              <div className="text-xs text-ink-3 mb-4">
                {q.kind === "multiple"
                  ? "当てはまるものをすべて選んでください。"
                  : "最も適切なものを1つ選んでください。"}
              </div>

              {q.options.map((o, oi) => {
                const isSelected = selected.has(o.id);
                const showCorrect = Boolean(qResult) && correctIds.has(o.id);
                const showWrong =
                  Boolean(qResult) && isSelected && !correctIds.has(o.id);
                return (
                  <button
                    type="button"
                    key={o.id}
                    onClick={() => toggleOption(q, o.id)}
                    disabled={Boolean(result)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3.5 border rounded-md bg-card mb-2 transition-colors text-left",
                      result
                        ? "cursor-default"
                        : "cursor-pointer hover:border-ink-3",
                      isSelected && !result && "border-brand bg-brand-soft",
                      showCorrect && "border-success bg-success-soft",
                      showWrong && "border-danger bg-danger-soft",
                      !isSelected &&
                        !showCorrect &&
                        !showWrong &&
                        "border-border-2",
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 border-[1.5px] grid place-items-center shrink-0 mt-0.5 text-[11px] font-semibold",
                        q.kind === "multiple" ? "rounded-sm" : "rounded-full",
                        isSelected && !result && "border-brand bg-brand text-white",
                        showCorrect && "border-success bg-success text-white",
                        showWrong && "border-danger bg-danger text-white",
                        !isSelected &&
                          !showCorrect &&
                          !showWrong &&
                          "border-border-strong text-ink-3",
                      )}
                    >
                      {showCorrect ? (
                        <Check size={12} />
                      ) : showWrong ? (
                        <X size={12} />
                      ) : (
                        String.fromCharCode(65 + oi)
                      )}
                    </div>
                    <div className="flex-1 text-sm leading-relaxed">{o.label}</div>
                  </button>
                );
              })}

              {qResult?.explanation ? (
                <div className="mt-2 text-xs text-ink-2 pt-3 border-t border-dashed border-border">
                  <strong>解説:</strong> {qResult.explanation}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      {!result ? (
        <div className="flex gap-2.5 mt-5 pt-4 border-t border-border items-center">
          <span className="text-[11.5px] text-ink-3">
            {allAnswered
              ? "すべて回答済みです"
              : "すべての設問に回答してください"}
          </span>
          <div className="flex-1" />
          <Button
            variant="accent"
            disabled={!allAnswered || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : null}
            採点する
          </Button>
        </div>
      ) : null}
    </div>
  );
}
