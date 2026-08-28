/**
 * 腕試し (SkillCheck) の受験ダイアログ (Phase 3a)。
 *
 * ステージ 1 つぶんのテストを出して採点する。用途は 2 つ:
 *   - 開放済み / クリア済みの星 … いまの力を測る
 *   - ロック星                  … 合格すれば飛び級でその星が開く
 *
 * ## クライアントで答え合わせをしない
 *
 * 出題にも採点結果にも **正答・解説は入っていない** (日を跨げば繰り返し受けられるので、
 * 返すと解答集が作れてしまう)。だからこの画面は「どの問題を間違えたか」を出さない。
 * 出すのは得点・合否・到達説明だけで、判断はすべてサーバの応答をそのまま写す。
 *
 * `QuizPlayer` を流用しないのは、あちらがレッスンの小テスト (`/api/quiz/...` と
 * 進捗の完了化) に結びついているため。腕試しはレッスン進捗を動かさない。
 */

import { useCallback, useEffect, useState } from "react";

import { SKILL_CHECK_DAILY_LIMIT } from "@falcon/shared/skill-map/skill-check";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SkeletonRows } from "@/components/ui/skeleton";
import { CheckCircle, Loader2, Lock, Sparkles, X } from "@/lib/icons";
import {
  getSkillCheck,
  submitSkillCheck,
  type SkillCheckPaper,
  type SkillCheckQuestion,
  type SkillCheckResult,
} from "@/lib/skill-check-api";
import { cn } from "@/lib/utils";

interface SkillCheckDialogProps {
  /** 開く星。null なら閉じている。 */
  stageId: string | null;
  /** 星の表示名 (読み込み中の見出しに使う)。 */
  stageTitle: string;
  onClose: () => void;
  /**
   * 受験が終わったときの通知。飛び級で星が開いたかを渡すので、呼び出し側は
   * スキルマップを引き直す (開いた星を描き直すのは応答の再取得に任せる)。
   */
  onFinished: (result: SkillCheckResult) => void;
}

export function SkillCheckDialog({
  stageId,
  stageTitle,
  onClose,
  onFinished,
}: SkillCheckDialogProps) {
  const [paper, setPaper] = useState<SkillCheckPaper | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** questionId -> 選んだ選択肢 id 集合。 */
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SkillCheckResult | null>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setPaper(null);
    setResult(null);
    setAnswers({});
    try {
      setPaper(await getSkillCheck(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "腕試しを読み込めませんでした");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!stageId) return;
    void load(stageId);
  }, [stageId, load]);

  const toggle = (question: SkillCheckQuestion, optionId: string) => {
    if (result) return;
    setAnswers((prev) => {
      const current = prev[question.id] ?? [];
      if (question.kind !== "multiple") return { ...prev, [question.id]: [optionId] };
      return {
        ...prev,
        [question.id]: current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      };
    });
  };

  const questions = paper?.questions ?? [];
  const allAnswered =
    questions.length > 0 && questions.every((q) => (answers[q.id] ?? []).length > 0);

  const submit = async () => {
    if (!stageId) return;
    setSubmitting(true);
    setError(null);
    try {
      const graded = await submitSkillCheck(
        stageId,
        questions.map((q) => ({ question_id: q.id, selected_option_ids: answers[q.id] ?? [] })),
        // いま画面に出ている受験票の版。別タブで先に提出されていたら、これが古くなって
        // 採点されない (見ていない問題で不正解が記録されるより、受け直す方がよい)。
        paper?.attempt,
      );
      setResult(graded);
      onFinished(graded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "採点に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const testOut = paper?.test_out ?? false;
  const title = paper?.title ?? stageTitle;
  const dailyLimit = paper?.daily_limit ?? SKILL_CHECK_DAILY_LIMIT;
  const remainingToday = paper?.remaining_today ?? null;
  /** 今日の上限に達している = 送っても 429。押す前に止める。 */
  const outOfAttempts = remainingToday !== null && remainingToday <= 0;

  return (
    <Dialog open={stageId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[min(calc(100vw-2rem),720px)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {testOut ? <Lock size={16} className="text-ink-3" /> : <Sparkles size={16} />}
            腕試し — {title}
          </DialogTitle>
          <DialogDescription>
            {testOut
              ? "合格すると、前提のステージを終えていなくてもこの星が開きます（飛び級）。"
              : "いまの力を測ります。結果はステージの進捗を変えません。"}
            {paper?.pass_score ? ` 最大 10 問・合格ライン ${paper.pass_score}%。` : ""}
            {paper?.supported ? ` 1 日 ${dailyLimit} 回まで受けられます。` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {loading ? <SkeletonRows rows={4} /> : null}

          {error ? (
            <div className="rounded-md border border-danger bg-danger-soft px-3 py-2 text-[12.5px] text-danger">
              {error}
            </div>
          ) : null}

          {/* 設問が足りないステージ。教材にクイズが揃うまでの過渡期なので、
              「まだ受けられない」とだけ伝えて行き止まりにしない。 */}
          {paper && !paper.supported ? (
            <div className="py-8 text-center text-[12.5px] text-ink-3">
              このステージの腕試しはまだ用意できていません。
              <div className="mt-1 text-ink-4">
                （確認テストの設問が {paper.min_questions ?? 5} 問以上そろうと受けられます）
              </div>
            </div>
          ) : null}

          {result ? (
            <ResultView result={result} dailyLimit={dailyLimit} />
          ) : outOfAttempts ? (
            /* 今日ぶんを使い切った星。出題は返ってきているが、答えても記録されない
               (429) ので、解かせる前に止める。 */
            <div className="py-8 text-center text-[12.5px] text-ink-3">
              本日の受験回数の上限に達しました。明日また挑戦できます。
              <div className="mt-1 text-ink-4">（同じ星の腕試しは 1 日 {dailyLimit} 回まで）</div>
            </div>
          ) : (
            questions.map((q, index) => (
              <QuestionBlock
                key={q.id}
                question={q}
                index={index}
                selected={answers[q.id] ?? []}
                onToggle={toggle}
              />
            ))
          )}
        </div>

        <DialogFooter>
          {result ? (
            <Button variant="accent" onClick={onClose}>
              閉じる
            </Button>
          ) : paper?.supported && !outOfAttempts ? (
            <>
              <span className="mr-auto self-center text-[11.5px] text-ink-3">
                {allAnswered ? "すべて回答済みです" : "すべての設問に回答してください"}
                {remainingToday !== null ? ` · 本日あと ${remainingToday} 回` : ""}
              </span>
              <Button variant="ghost" onClick={onClose}>
                やめる
              </Button>
              <Button variant="accent" disabled={!allAnswered || submitting} onClick={submit}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                採点する
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={onClose}>
              閉じる
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface QuestionBlockProps {
  question: SkillCheckQuestion;
  index: number;
  selected: string[];
  onToggle: (question: SkillCheckQuestion, optionId: string) => void;
}

/** 選択肢の行 (丸 / 四角の印 + ラベル) の共通クラス。 */
const optionRowClass = (active: boolean) =>
  cn(
    "flex w-full items-start gap-3 rounded-md border p-3 text-left text-[13px]",
    active ? "border-brand bg-brand-soft" : "border-border-2 hover:border-ink-3",
  );

/**
 * 設問 1 問。
 *
 * 単一選択 / 真偽は **Radix の RadioGroup**。素の button を並べて `role="radio"` を
 * 載せていたが、それでは roving tabindex が無く、矢印キーで選択肢を移れない
 * (radiogroup は「Tab で群に入り、矢印で選ぶ」が期待される形)。Radix の item を
 * `<label>` で包み、行全体をクリック領域にしつつ印だけを item に描かせる。
 *
 * 複数選択はトグル (button + `aria-pressed`) のまま — チェックボックスの群は
 * 1 つずつが独立した操作で、roving tabindex は入らない。
 */
const QuestionBlock = ({ question, index, selected, onToggle }: QuestionBlockProps) => {
  const multiple = question.kind === "multiple";

  return (
    <div className="mb-5 border-b border-border pb-5 last:mb-0 last:border-0 last:pb-0">
      <div className="mb-1 text-[11.5px] font-semibold text-ink-3">
        問題 {index + 1} · 配点 {question.points} 点{multiple ? " · 当てはまるものをすべて" : ""}
      </div>
      <div className="mb-3 text-[14px] font-semibold leading-snug">{question.prompt}</div>

      {multiple ? (
        // 複数選択の束ねは fieldset (div に role="group" を載せるより素直)。
        <fieldset aria-label={question.prompt} className="flex flex-col gap-2 border-0 p-0">
          {question.options.map((option) => {
            const active = selected.includes(option.id);
            return (
              <button
                type="button"
                key={option.id}
                aria-pressed={active}
                onClick={() => onToggle(question, option.id)}
                className={optionRowClass(active)}
              >
                <span
                  className={cn(
                    "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-sm border-[1.5px]",
                    active ? "border-brand bg-brand text-white" : "border-border-strong",
                  )}
                  aria-hidden="true"
                >
                  {active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                </span>
                {option.label}
              </button>
            );
          })}
        </fieldset>
      ) : (
        <RadioGroup
          aria-label={question.prompt}
          value={selected[0] ?? ""}
          onValueChange={(value) => onToggle(question, value)}
          className="flex flex-col gap-2"
        >
          {question.options.map((option) => {
            const active = selected.includes(option.id);
            const id = `sc-${question.id}-${option.id}`;
            return (
              // 行全体を `<label>` にして、印だけでなく文言をクリックしても選べる。
              <label
                key={option.id}
                htmlFor={id}
                className={cn(optionRowClass(active), "cursor-pointer")}
              >
                <RadioGroupItem id={id} value={option.id} className="mt-0.5 h-4 w-4 shrink-0" />
                {option.label}
              </label>
            );
          })}
        </RadioGroup>
      )}
    </div>
  );
};

/** 採点結果。合格なら「あなたは◯◯ができる状態です」を出す。 */
const ResultView = ({ result, dailyLimit }: { result: SkillCheckResult; dailyLimit: number }) => (
  <div className="py-4 text-center">
    <div
      className={cn(
        "mx-auto grid h-14 w-14 place-items-center rounded-full",
        result.passed ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
      )}
    >
      {result.passed ? <CheckCircle size={26} /> : <X size={26} />}
    </div>
    <div
      className={cn(
        "mt-3 text-[15px] font-semibold",
        result.passed ? "text-success" : "text-danger",
      )}
    >
      {result.passed ? "合格です！" : "まだ届きません"}
    </div>
    <div className="mt-1 text-[12.5px] text-ink-3 tabular-nums">
      {result.score} / {result.max_score} 点（{result.percent}%） · 合格ライン {result.pass_score}%
    </div>

    {result.passed && result.can_do ? (
      <div className="mx-auto mt-4 max-w-[420px] rounded-lg border border-border bg-sunken px-4 py-3 text-[13px]">
        あなたは <strong>{result.can_do}</strong> 状態です。
      </div>
    ) : null}

    {result.unlocked ? (
      // 解放と同時に自己開始の受講登録も作られるので、「ここから始められる」まで言える。
      <div className="mx-auto mt-3 flex max-w-[420px] items-center justify-center gap-2 rounded-lg border border-brand bg-brand-soft px-4 py-3 text-[13px] text-brand-ink">
        <Sparkles size={14} />
        新しい星が解放されました。ここから始められます — {result.title}
      </div>
    ) : null}

    {result.unlock_error ? (
      <div className="mx-auto mt-3 max-w-[420px] rounded-lg border border-danger bg-danger-soft px-4 py-3 text-[13px] text-danger">
        {result.unlock_error}
      </div>
    ) : null}

    {!result.passed ? (
      <div className="mt-3 text-[11.5px] text-ink-3">
        1 日 {dailyLimit} 回まで挑戦できます。出題は入れ替わることがあります。
      </div>
    ) : null}
  </div>
);
