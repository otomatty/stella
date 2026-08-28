/**
 * 発見教材 (✦) の受験ダイアログ (Phase 4)。
 *
 * 道の脇に灯った教材を開いて解く。作りは腕試し (`SkillCheckDialog`) の流儀をそのまま
 * 流用している — 出題も採点もサーバ、**正答・解説は応答に入っていない** ので、
 * この画面は「どの問題を間違えたか」を出さない。出すのは得点と合否だけ。
 *
 * `SkillCheckDialog` を共通化しなかったのは、腕試しが「星を開ける (飛び級)」判定を
 * 抱えていて、受験回数の上限・到達説明・解放の失敗といった発見教材には無い概念が
 * 画面の分岐として入り込んでいるため。混ぜると両方が読みにくくなる。
 *
 * ## 出自を必ず出す
 *
 * 「AI 生成 ✦・講師確認済み」を見出しの下に出す。既存の確認テストから複製した
 * 下書き (`generator: "heuristic"`) はそう書く — **AI が書いたものと、既存教材の
 * 詰め合わせを混同させない**。
 */

import { useCallback, useEffect, useState } from "react";

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
import { CheckCircle, Loader2, Sparkles, X } from "@/lib/icons";
import {
  getDiscovery,
  submitDiscovery,
  type DiscoveryPaper,
  type DiscoveryPaperQuestion,
  type DiscoveryResult,
} from "@/lib/discovery-api";
import { cn } from "@/lib/utils";

interface DiscoveryDialogProps {
  /** 開く教材。null なら閉じている。 */
  discoveryId: string | null;
  /** 読み込み中の見出しに使う表示名。 */
  discoveryTitle: string;
  onClose: () => void;
  /** 採点が終わったときの通知 (呼び出し側はマップを引き直して印を更新する)。 */
  onFinished: (result: DiscoveryResult) => void;
}

/** 出自ラベル。承認済みのものしか受講者には届かないので「講師確認済み」を必ず添える。 */
function originLabel(paper: DiscoveryPaper | null): string {
  if (!paper) return "AI生成 ✦ 講師確認済み";
  return paper.generator === "heuristic"
    ? "✦ このステージの確認テストから作成 · 講師確認済み"
    : "✦ AI生成 · 講師確認済み";
}

export function DiscoveryDialog({
  discoveryId,
  discoveryTitle,
  onClose,
  onFinished,
}: DiscoveryDialogProps) {
  const [paper, setPaper] = useState<DiscoveryPaper | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** questionId -> 選んだ選択肢 id。 */
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DiscoveryResult | null>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setPaper(null);
    setResult(null);
    setAnswers({});
    try {
      setPaper(await getDiscovery(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "教材を読み込めませんでした");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!discoveryId) return;
    void load(discoveryId);
  }, [discoveryId, load]);

  const toggle = (question: DiscoveryPaperQuestion, optionId: string) => {
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
    if (!discoveryId) return;
    setSubmitting(true);
    setError(null);
    try {
      const graded = await submitDiscovery(
        discoveryId,
        questions.map((q) => ({ question_id: q.id, selected_option_ids: answers[q.id] ?? [] })),
      );
      setResult(graded);
      onFinished(graded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "採点に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const title = paper?.title ?? discoveryTitle;

  return (
    <Dialog open={discoveryId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[min(calc(100vw-2rem),720px)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={16} className="text-brand" />
            発見！ {title}
          </DialogTitle>
          <DialogDescription>
            {paper?.description ? `${paper.description} ` : ""}
            {originLabel(paper)}
            {paper ? ` · 合格ライン ${paper.pass_score}%` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {loading ? <SkeletonRows rows={4} /> : null}

          {error ? (
            <div className="rounded-md border border-danger bg-danger-soft px-3 py-2 text-[12.5px] text-danger">
              {error}
            </div>
          ) : null}

          {paper && !result && paper.history.passed ? (
            <div className="mb-4 rounded-md border border-border bg-sunken px-3 py-2 text-[11.5px] text-ink-3">
              この教材は合格済みです。解き直しても記録は残りますが、XP は増えません。
            </div>
          ) : null}

          {result ? (
            <ResultView result={result} />
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
          ) : questions.length > 0 ? (
            <>
              <span className="mr-auto self-center text-[11.5px] text-ink-3">
                {allAnswered ? "すべて回答済みです" : "すべての設問に回答してください"}
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
  question: DiscoveryPaperQuestion;
  index: number;
  selected: string[];
  onToggle: (question: DiscoveryPaperQuestion, optionId: string) => void;
}

/** 選択肢の行の共通クラス (`SkillCheckDialog` と同じ形)。 */
const optionRowClass = (active: boolean) =>
  cn(
    "flex w-full items-start gap-3 rounded-md border p-3 text-left text-[13px]",
    active ? "border-brand bg-brand-soft" : "border-border-2 hover:border-ink-3",
  );

/**
 * 設問 1 問。
 *
 * 単一選択は Radix の RadioGroup (矢印キーで選択肢を移れる)。複数選択はトグル
 * (`aria-pressed`) — チェックボックスの群は 1 つずつが独立した操作なので。
 */
const QuestionBlock = ({ question, index, selected, onToggle }: QuestionBlockProps) => {
  const multiple = question.kind === "multiple";

  return (
    <div className="mb-5 border-b border-border pb-5 last:mb-0 last:border-0 last:pb-0">
      <div className="mb-1 text-[11.5px] font-semibold text-ink-3">
        問題 {index + 1}
        {multiple ? " · 当てはまるものをすべて" : ""}
      </div>
      <div className="mb-3 text-[14px] font-semibold leading-snug">{question.prompt}</div>

      {multiple ? (
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
            const id = `dc-${question.id}-${option.id}`;
            return (
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

/** 採点結果 (得点と合否だけ。どの問題を間違えたかは出さない)。 */
const ResultView = ({ result }: { result: DiscoveryResult }) => (
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

    {result.record_error ? (
      <div className="mx-auto mt-3 max-w-[420px] rounded-lg border border-danger bg-danger-soft px-4 py-3 text-[13px] text-danger">
        {result.record_error}
      </div>
    ) : null}

    {!result.passed ? (
      <div className="mt-3 text-[11.5px] text-ink-3">
        何度でも解き直せます。もう一度ステージの教材を見てから挑戦してみましょう。
      </div>
    ) : null}
  </div>
);
