/**
 * 発見教材の下書きエディタ (Phase 4)。
 *
 * 生成された下書きを講師が **読んで直す** ための最小限のフォーム。凝った編集
 * (設問の並べ替え・画像・コード片) は持たない — ここで作るのは選択式の小問だけで、
 * 手の込んだ教材は正本 (`packages/content`) 側に書くものだから。
 *
 * ## 正答は必ず 1 つ以上
 *
 * 正答の無い設問は何を選んでも不正解になり、合格ラインに手が届かない教材になる。
 * サーバも承認を断る (400) が、**押す前に画面で分かる** ようにしておく — 断られて
 * から原因を探すことになると、下書きの山が滞る。
 *
 * ## 保存で消える設問は保存前に知らせる
 *
 * サーバは受け取った設問を正規化し、問題文が空 / 選択肢が 2 つ未満の設問を捨てる
 * (`normalizeDiscoveryQuestions`)。黙って消えると「書きかけの設問が保存の後に
 * 見当たらない」ことになるので、**保存を押す前に**どの設問が落ちるかを出す。
 *
 * ## 承認はこの画面からだけ
 *
 * 一覧に承認ボタンは無い。設問が目の前に出ているこの画面でだけ承認できる。承認済み
 * 教材の本文を直すとサーバが承認を外す (`approvalRevoked`) ので、その旨も伝える。
 */

import { useState } from "react";
import { toast } from "sonner";

import type { DiscoveryQuestion } from "@stella/shared/discovery/types";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2, Plus, Trash, X } from "@/lib/icons";
import { patchDiscoveryMaterial, type DiscoveryMaterialRow } from "@/lib/discovery-api";
import { cn } from "@/lib/utils";

interface Props {
  material: DiscoveryMaterialRow;
  onClose: () => void;
  onSaved: () => void;
}

/** 正答が 1 つも無い設問の番号 (1 始まり)。空なら承認できる。 */
function questionsMissingCorrect(questions: DiscoveryQuestion[]): number[] {
  return questions.flatMap((q, i) => (q.options.some((o) => o.correct) ? [] : [i + 1]));
}

/**
 * 保存すると **捨てられる** 設問の番号 (1 始まり)。
 *
 * 判定はサーバの正規化 (`normalizeDiscoveryQuestions`) と同じ条件 — 問題文が空、
 * または中身のある選択肢が 2 つ未満。ラベルが空の選択肢も向こうで落ちるので、
 * ここでも数に入れない。
 */
function questionsDroppedOnSave(questions: DiscoveryQuestion[]): number[] {
  return questions.flatMap((q, i) => {
    const usableOptions = q.options.filter((o) => o.label.trim() !== "").length;
    return q.prompt.trim() === "" || usableOptions < 2 ? [i + 1] : [];
  });
}

export function DiscoveryMaterialEditor({ material, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(material.title);
  const [description, setDescription] = useState(material.description);
  const [questions, setQuestions] = useState<DiscoveryQuestion[]>(material.questions);
  const [saving, setSaving] = useState(false);

  const missing = questionsMissingCorrect(questions);
  const dropped = questionsDroppedOnSave(questions);
  const canApprove = questions.length > 0 && missing.length === 0 && dropped.length === 0;
  /** 承認を押せない理由 (押せるときは空)。 */
  const approveBlockedReason =
    questions.length === 0
      ? "設問がありません。1 問以上追加してください"
      : missing.length > 0
        ? `問題 ${missing.join(" / ")} に正答がありません`
        : dropped.length > 0
          ? `問題 ${dropped.join(" / ")} は保存されません（問題文と選択肢 2 つが要ります）`
          : "";

  const patchQuestion = (index: number, next: Partial<DiscoveryQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...next } : q)));
  };

  const toggleCorrect = (qi: number, optionId: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qi
          ? {
              ...q,
              options: q.options.map((o) =>
                o.id === optionId ? { ...o, correct: !o.correct } : o,
              ),
            }
          : q,
      ),
    );
  };

  const save = async (status?: "approved" | "rejected") => {
    setSaving(true);
    try {
      const { approvalRevoked } = await patchDiscoveryMaterial(material.id, {
        title,
        description,
        questions,
        ...(status ? { review_status: status } : {}),
      });
      onSaved();
      if (approvalRevoked) {
        // 公開から外れたことを黙って済ませない。直したつもりの教材が受講者に届いて
        // いない、という状態に講師が気づけなくなる。
        toast.warning("内容を変更したため再承認が必要です");
      } else {
        toast.success(
          status === "approved"
            ? "公開しました"
            : status === "rejected"
              ? "却下しました"
              : "保存しました",
        );
      }
      if (status) onClose();
    } catch (err) {
      toast.error(`保存に失敗しました: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[min(calc(100vw-2rem),820px)]">
        <DialogHeader>
          <DialogTitle>発見教材の下書き</DialogTitle>
          <DialogDescription>
            {material.stage_title ?? material.stage_id} ·{" "}
            {material.generator === "heuristic"
              ? "既存の確認テストから複製した下書きです"
              : "AI (Claude) が生成した下書きです"}
            。 公開すると、このステージを進行中 / 修了した受講者のスキルマップに「✦
            発見」として並びます。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[62vh] overflow-y-auto px-6 py-5">
          <label className="mb-1 block text-[11.5px] font-semibold text-ink-3" htmlFor="dm-title">
            タイトル
          </label>
          <Input id="dm-title" value={title} onChange={(e) => setTitle(e.target.value)} />

          <label
            className="mt-4 mb-1 block text-[11.5px] font-semibold text-ink-3"
            htmlFor="dm-desc"
          >
            説明 (受講者に見えます)
          </label>
          <Textarea
            id="dm-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[60px]"
          />

          {material.review_status === "approved" ? (
            <div className="mt-4 rounded-md border border-border bg-sunken px-3 py-2 text-[12px] text-ink-2">
              この教材は公開中です。 内容を変更して保存すると公開から外れ、
              もう一度「承認して公開」が必要になります。
            </div>
          ) : null}

          {missing.length > 0 ? (
            <div className="mt-4 rounded-md border border-warning bg-warning-soft px-3 py-2 text-[12px] text-ink-2">
              問題 {missing.join(" / ")} に正答がありません。 承認するには各問に正答を 1
              つ以上つけてください。
            </div>
          ) : null}

          {/* 保存で黙って消える設問を、押す前に知らせる (サーバの正規化と同じ条件)。 */}
          {dropped.length > 0 ? (
            <div className="mt-4 rounded-md border border-warning bg-warning-soft px-3 py-2 text-[12px] text-ink-2">
              問題 {dropped.join(" / ")} は保存されません。
              選択肢が2つ未満・問題文が空の設問は保存されません。
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between">
            <div className="text-[11.5px] font-semibold text-ink-3">設問 ({questions.length})</div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setQuestions((prev) => [
                  ...prev,
                  {
                    id: `new-${prev.length + 1}-${Date.now()}`,
                    prompt: "",
                    options: [
                      { id: `new-${prev.length + 1}-o1-${Date.now()}`, label: "", correct: true },
                      { id: `new-${prev.length + 1}-o2-${Date.now()}`, label: "", correct: false },
                    ],
                  },
                ])
              }
            >
              <Plus size={12} />
              設問を追加
            </Button>
          </div>

          {questions.map((question, qi) => (
            <div key={question.id} className="mt-3 rounded-md border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11.5px] font-semibold text-ink-3">問題 {qi + 1}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`問題 ${qi + 1} を削除`}
                  onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))}
                >
                  <Trash size={12} />
                </Button>
              </div>
              <Textarea
                aria-label={`問題 ${qi + 1} の問題文`}
                value={question.prompt}
                onChange={(e) => patchQuestion(qi, { prompt: e.target.value })}
                className="min-h-[52px]"
              />

              <div className="mt-2 flex flex-col gap-1.5">
                {question.options.map((option) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-pressed={option.correct}
                      aria-label={`${option.label || "選択肢"} を正答にする`}
                      onClick={() => toggleCorrect(qi, option.id)}
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-sm border",
                        option.correct
                          ? "border-success bg-success-soft text-success"
                          : "border-border-strong text-ink-4",
                      )}
                    >
                      <Check size={12} />
                    </button>
                    <Input
                      aria-label={`問題 ${qi + 1} の選択肢`}
                      value={option.label}
                      onChange={(e) =>
                        patchQuestion(qi, {
                          options: question.options.map((o) =>
                            o.id === option.id ? { ...o, label: e.target.value } : o,
                          ),
                        })
                      }
                      className="h-8"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="選択肢を削除"
                      onClick={() =>
                        patchQuestion(qi, {
                          options: question.options.filter((o) => o.id !== option.id),
                        })
                      }
                    >
                      <X size={12} />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  className="self-start"
                  onClick={() =>
                    patchQuestion(qi, {
                      options: [
                        ...question.options,
                        {
                          id: `opt-${qi}-${question.options.length + 1}-${Date.now()}`,
                          label: "",
                          correct: false,
                        },
                      ],
                    })
                  }
                >
                  <Plus size={12} />
                  選択肢を追加
                </Button>
              </div>

              <label
                className="mt-2 mb-1 block text-[11px] text-ink-3"
                htmlFor={`dm-exp-${question.id}`}
              >
                解説 (任意 · 受講者には出しません)
              </label>
              <Textarea
                id={`dm-exp-${question.id}`}
                value={question.explanation ?? ""}
                onChange={(e) => patchQuestion(qi, { explanation: e.target.value })}
                className="min-h-[44px]"
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <span className="mr-auto self-center text-[11.5px] text-ink-3">
            {canApprove ? "承認すると受講者に公開されます" : approveBlockedReason}
          </span>
          <Button variant="ghost" disabled={saving} onClick={() => void save("rejected")}>
            却下する
          </Button>
          <Button variant="default" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            下書きを保存
          </Button>
          <Button
            variant="accent"
            disabled={saving || !canApprove}
            onClick={() => void save("approved")}
          >
            <Check size={13} />
            承認して公開
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
