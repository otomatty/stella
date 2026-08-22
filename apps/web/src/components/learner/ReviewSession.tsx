/**
 * デイリー復習 (SRS) の解答セッション
 * (docs/superpowers/specs/2026-08-20-daily-srs-review-design.md §5)。
 *
 * QuizPlayer (一括提出 → 合否) と違い、 1 問ごとに採点 API を叩いて正誤と解説を
 * 即時表示する。 出題は GET /api/srs/today の due 順をベースに、 読み込み時に
 * 設問・選択肢をシャッフルする (セッション中は固定)。
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import type { LearnerQuizQuestion } from "@falcon/shared/cms/types";
import type { SrsAnswerResult, SrsTodaySummary } from "@falcon/shared/srs/types";
import { shuffleLearnerQuizQuestions } from "@falcon/shared/quiz/shuffle";
import { getSrsToday, submitSrsAnswer } from "@/lib/srs-api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ReviewSessionProps {
  currentUserId: string | null;
  backendEnabled: boolean;
}

export const ReviewSession = ({ currentUserId, backendEnabled }: ReviewSessionProps) => {
  const [session, setSession] = useState<SrsTodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<SrsAnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  // 初回のみ取得する (useSrsToday は使わない)。 セッション開始後は dep 変化での
  // 再フェッチが起きると出題が入れ替わってしまうため、 セッション中は固定にしたい。
  useEffect(() => {
    let cancelled = false;
    if (!backendEnabled || !currentUserId) {
      setLoading(false);
      return;
    }
    void getSrsToday()
      .then((review) => {
        if (!cancelled && review) {
          setSession({
            ...review,
            questions: shuffleLearnerQuizQuestions(review.questions),
          });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "fetch failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backendEnabled, currentUserId]);

  const questions = session?.questions ?? [];
  const question: LearnerQuizQuestion | undefined = questions[index];
  const done = !loading && questions.length > 0 && index >= questions.length;

  const toggle = useCallback(
    (optionId: string, multiple: boolean) => {
      if (feedback) return; // 解答後は変更不可。
      setSelected((prev) => {
        if (!multiple) return [optionId];
        return prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId];
      });
    },
    [feedback],
  );

  const submit = useCallback(async () => {
    // submitting 中の再入を止める (同一ティックの二重クリックで API が 2 回飛ぶ)。
    if (!question || feedback || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitSrsAnswer(question.id, selected);
      setFeedback(result);
      if (result.correct) setCorrectCount((n) => n + 1);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }, [question, feedback, selected, submitting]);

  const next = useCallback(() => {
    // feedback 表示中のみ進める (連打で未解答のまま 1 問飛ぶのを防ぐ)。
    if (!feedback) return;
    setIndex((i) => i + 1);
    setSelected([]);
    setFeedback(null);
    setSubmitError(null);
  }, [feedback]);

  return (
    <>
      <PageHeader
        title="今日の復習"
        sub={
          questions.length > 0 && !done ? (
            <>
              {Math.min(index + 1, questions.length)} / {questions.length} 問
            </>
          ) : (
            <>間隔反復で、 解いた問題を忘れる前に振り返ります</>
          )
        }
      />

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : loadError ? (
        <p className="text-sm text-destructive">今日の復習の取得に失敗しました: {loadError}</p>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground py-4">
              {session && session.answered_today > 0
                ? `今日の復習は完了しています (${session.answered_today} 問解答済み)。 また明日!`
                : "今日の復習はありません。 クイズを解くと、 その問題が数日おきにここへ再出題されます。"}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/">ダッシュボードへ戻る</Link>
            </Button>
          </CardContent>
        </Card>
      ) : done ? (
        <Card>
          <CardHeader>
            <CardTitle>今日の復習が完了しました</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {questions.length} 問中 {correctCount} 問正解。 間違えた問題は明日また出題されます。
            </p>
            <Button asChild variant="accent">
              <Link to="/">ダッシュボードへ戻る</Link>
            </Button>
          </CardContent>
        </Card>
      ) : question ? (
        <Card>
          <CardHeader>
            <CardTitle>{question.prompt}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress
              value={Math.round((index / questions.length) * 100)}
              className="mb-4"
              tone="brand"
            />
            {question.kind === "multiple" ? (
              <p className="text-xs text-muted-foreground mb-2">当てはまるものをすべて選択</p>
            ) : null}
            <fieldset className="flex flex-col gap-2 border-0 p-0 m-0" aria-label="選択肢">
              {question.options.map((o) => {
                const isSelected = selected.includes(o.id);
                const isCorrectOption = feedback?.correct_option_ids.includes(o.id) ?? false;
                return (
                  <button
                    key={o.id}
                    type="button"
                    disabled={feedback != null}
                    onClick={() => toggle(o.id, question.kind === "multiple")}
                    aria-pressed={isSelected}
                    className={cn(
                      "text-left text-sm rounded-md border border-border px-3 py-2 transition-colors",
                      !feedback && isSelected && "border-primary bg-primary/10",
                      feedback && isCorrectOption && "border-success bg-success/10",
                      feedback &&
                        isSelected &&
                        !isCorrectOption &&
                        "border-destructive bg-destructive/10",
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </fieldset>

            {feedback ? (
              <div className="mt-4">
                <p
                  className={cn(
                    "text-sm font-medium",
                    feedback.correct ? "text-success" : "text-destructive",
                  )}
                >
                  {feedback.correct ? "正解!" : "不正解"}
                </p>
                {feedback.explanation ? (
                  <p className="text-sm text-muted-foreground mt-1">{feedback.explanation}</p>
                ) : null}
                <Button variant="accent" className="mt-4" onClick={next}>
                  {index + 1 < questions.length ? "次の問題へ" : "結果を見る"}
                </Button>
              </div>
            ) : (
              <div className="mt-4">
                {submitError ? (
                  <p className="text-sm text-destructive mb-2">{submitError}</p>
                ) : null}
                <Button
                  variant="accent"
                  disabled={selected.length === 0 || submitting}
                  onClick={() => void submit()}
                >
                  回答する
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
};
