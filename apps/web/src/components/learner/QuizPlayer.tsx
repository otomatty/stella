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
import { SkeletonRows } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { isBackendConfigured } from "@/lib/backend";
import { fetchQuizForLearner, submitQuizAttempt } from "@/lib/quiz-attempts-api";
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  let questions = quiz.quiz.shuffle_questions ? shuffled(quiz.questions) : quiz.questions;
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
  // 「もう一度挑戦する」を押したか。 押すまでは過去の受験結果を表示する。
  const [retaking, setRetaking] = useState(false);

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
    setRetaking(false);
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

  // 別端末で合格していた等でレッスン進捗が完了になっていない場合の取りこぼしを拾う。
  // `markComplete` は冪等なので、 既に完了ならストアは動かない。
  useEffect(() => {
    if (quiz?.history.passed) onComplete?.();
  }, [quiz?.history.passed, onComplete]);

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
      // 残り受験回数の判定に使うので、 再取得せずローカルの履歴も進めておく。
      setQuiz((prev) =>
        prev
          ? {
              ...prev,
              history: {
                attempt_count: prev.history.attempt_count + 1,
                passed: prev.history.passed || graded.passed,
                last_score: graded.score,
                last_max_score: graded.max_score,
                last_attempt_at: new Date().toISOString(),
              },
            }
          : prev,
      );
      if (graded.passed) {
        toast.success(`合格しました！ ${graded.score} / ${graded.max_score} 点`);
        onComplete?.();
      } else {
        toast.message(
          `不合格です (${graded.score} / ${graded.max_score} 点)。 再挑戦してください。`,
        );
      }
    } catch (err) {
      console.error("[QuizPlayer] submit failed", err);
      toast.error(err instanceof Error ? err.message : "採点に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setAnswers({});
    setRetaking(true);
    // 再挑戦時にも順序を入れ替え、 解答位置の暗記による不正を防ぐ。
    setQuiz((prev) => (prev ? applyShuffle(prev) : prev));
  };

  // 受験済みで、 まだこの表示で解き直していないなら、 白紙の設問ではなく前回の結果を出す。
  // (設問だけ出すと「合格済みなのにまた解かされる」ように見え、 進捗とも食い違う)
  const history = quiz?.history;
  const showPastAttempt = !result && !retaking && history != null && history.attempt_count > 0;
  const attemptsLeft =
    quiz?.quiz.max_attempts != null && history != null
      ? Math.max(quiz.quiz.max_attempts - history.attempt_count, 0)
      : null;
  const outOfAttempts = attemptsLeft === 0 && history != null && !history.passed;

  if (loading) {
    return <SkeletonRows rows={4} className="py-6" />;
  }

  if (!quiz || quiz.questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-ink-3">
        <HelpCircle size={28} className="text-ink-4" />
        <div className="font-medium text-ink-2">クイズはまだ準備中です</div>
        <div className="text-[12.5px]">このレッスンの設問はまだ公開されていません。</div>
      </div>
    );
  }

  const totalPoints = quiz.questions.reduce((n, q) => n + q.points, 0);
  const scorePercent =
    result && result.max_score > 0 ? Math.round((result.score * 100) / result.max_score) : 0;
  const submitHint = outOfAttempts
    ? "受験回数の上限に達しました"
    : allAnswered
      ? "すべて回答済みです"
      : "すべての設問に回答してください";

  // 前回までの受験結果。 設問は伏せたまま、 結果と再挑戦の導線だけ出す。
  if (showPastAttempt && history) {
    const pastPercent =
      history.last_max_score && history.last_max_score > 0
        ? Math.round(((history.last_score ?? 0) * 100) / history.last_max_score)
        : 0;
    return (
      <Card
        className={cn(
          history.passed ? "border-success bg-success-soft" : "border-danger bg-danger-soft",
        )}
      >
        <CardContent className="flex items-center gap-3">
          {history.passed ? (
            <CheckCircle size={20} className="text-success" />
          ) : (
            <X size={20} className="text-danger" />
          )}
          <div className="flex-1">
            <div
              className={cn(
                "text-[13px] font-semibold",
                history.passed ? "text-success" : "text-danger",
              )}
            >
              {history.passed ? "合格済みです" : "まだ合格していません"}
            </div>
            <div className="text-[11.5px] text-ink-3">
              直近の結果: {history.last_score} / {history.last_max_score} ({pastPercent}%) ·
              合格ライン {quiz.quiz.pass_score}% · 受験 {history.attempt_count} 回
              {attemptsLeft !== null ? ` (残り ${attemptsLeft} 回)` : ""}
            </div>
          </div>
          {outOfAttempts ? (
            <span className="text-[11.5px] text-ink-3">受験回数の上限に達しました</span>
          ) : (
            <Button variant="accent" onClick={handleRetry}>
              もう一度挑戦する
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    // 解答中の sm 未満は下部固定バーがコンテンツに被さるが、 その下余白は
    // ページ末尾のブロック (LessonPlayer の前後ナビ) がまとめて持つ。 ここで足すと
    // 本文と前後ナビの間だけが空いて、 バーに隠れるのは変わらない。
    <div>
      {result ? (
        <Card
          className={cn(
            "mb-5",
            result.passed ? "border-success bg-success-soft" : "border-danger bg-danger-soft",
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
                獲得点数: {result.score} / {result.max_score} ({scorePercent}%) · 合格ライン{" "}
                {quiz.quiz.pass_score}%{attemptsLeft !== null ? ` · 残り ${attemptsLeft} 回` : ""}
              </div>
            </div>
            {/* 上限に達したあとも再挑戦ボタンを出すと、 押した先の解答フォームで
                採点できず行き止まりになる。 上限時は理由を出してボタンを出さない。 */}
            {result.passed ? null : outOfAttempts ? (
              <span className="text-[11.5px] text-ink-3">受験回数の上限に達しました</span>
            ) : (
              <Button variant="accent" onClick={handleRetry}>
                もう一度挑戦する
              </Button>
            )}
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
                <span className="text-[11.5px] text-ink-3 font-semibold">問題 {idx + 1}</span>
                <Badge variant="accent">{KIND_LABEL[q.kind]}</Badge>
                <span className="text-[11.5px] text-ink-3">配点 {q.points}点</span>
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
                const showWrong = Boolean(qResult) && isSelected && !correctIds.has(o.id);
                return (
                  <button
                    type="button"
                    key={o.id}
                    onClick={() => toggleOption(q, o.id)}
                    disabled={Boolean(result)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3.5 border rounded-md bg-card mb-2 transition-colors text-left",
                      result ? "cursor-default" : "cursor-pointer hover:border-ink-3",
                      isSelected && !result && "border-brand bg-brand-soft",
                      showCorrect && "border-success bg-success-soft",
                      showWrong && "border-danger bg-danger-soft",
                      !isSelected && !showCorrect && !showWrong && "border-border-2",
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 border-[1.5px] grid place-items-center shrink-0 mt-0.5 text-[11px] font-semibold",
                        q.kind === "multiple" ? "rounded-sm" : "rounded-full",
                        isSelected && !result && "border-brand bg-brand text-white",
                        // ダークの success / danger は明るい方に寄せてあるので、
                        // 白抜きだとコントラストが 3:1 を切る。 面と反対の色を敷く。
                        showCorrect && "border-success bg-success text-card",
                        showWrong && "border-danger bg-danger text-card",
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
        <>
          {/* sm 以上: コンテンツ末尾のインライン行。 右下 FAB とはコンテンツ側の
              下余白 (LessonPlayer の pb) で離してある。 */}
          <div className="hidden sm:flex gap-2.5 mt-5 pt-4 border-t border-border items-center">
            <span className="text-[11.5px] text-ink-3">{submitHint}</span>
            <div className="flex-1" />
            <Button
              variant="accent"
              disabled={!allAnswered || submitting || outOfAttempts}
              onClick={handleSubmit}
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
              採点する
            </Button>
          </div>
          {/* sm 未満: 画面下部固定のアクションバー。 右端は AI FAB (right-6 + w-12 = 72px)
              の指定席なので、 誤タップ防止の間隔 16px を足した 88px を空けて左側いっぱいを使う。
              FAB は動かさず、 バーが FAB の台座に見えるよう背景は全幅に敷く。 */}
          <div className="fixed inset-x-0 bottom-0 z-[80] border-t border-border bg-card sm:hidden">
            <div className="pl-4 pr-[88px] pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
              <div className="mb-1.5 text-[11px] text-ink-3">{submitHint}</div>
              {/* 高さ 48px + 下 24px は FAB (h-12 / bottom-6) と同じ。 ボタン中心を
                  FAB 中心と揃えて 1 本の帯に見せる。 */}
              <div className="flex h-12 items-center">
                <Button
                  variant="accent"
                  className="w-full"
                  disabled={!allAnswered || submitting || outOfAttempts}
                  onClick={handleSubmit}
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                  採点する
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
