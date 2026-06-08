/**
 * 小テスト (quiz) の設問エディタ (Issue #23)。
 *
 * LessonEditor の「設問を編集」から開くフルスクリーン Dialog。
 * - マウント時に ensureQuiz → getQuizByLesson で設定・設問・選択肢を読み込む。
 * - 設定 (合格点 / シャッフル)、 設問の追加/削除、 種別 (単一/複数/真偽)、 配点、
 *   解説、 選択肢の追加/削除/正誤を編集する。
 * - 保存は cms-api 経由 (staff のみ RLS 許可)。 読み込み済みスナップショットと
 *   差分を取り、 削除された設問・選択肢を delete、 残りを upsert する。
 *
 * AssignmentEditor の draft + 配列 immutable 更新パターンを踏襲。
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash, Loader2 } from "@/lib/icons";
import {
  deleteQuizOption,
  deleteQuizQuestion,
  ensureQuiz,
  getQuizByLesson,
  updateQuiz,
  upsertQuizOption,
  upsertQuizQuestion,
} from "@/lib/cms-api";
import type { QuestionKind } from "@falcon/shared/cms/types";

interface Props {
  lessonId: string;
  onClose: () => void;
}

interface DraftOption {
  key: string;
  id: string | null; // 永続済みなら uuid
  label: string;
  is_correct: boolean;
}

interface DraftQuestion {
  key: string;
  id: string | null;
  kind: QuestionKind;
  prompt: string;
  explanation: string;
  points: number;
  options: DraftOption[];
}

const KIND_OPTIONS: { value: QuestionKind; label: string }[] = [
  { value: "single", label: "単一選択" },
  { value: "multiple", label: "複数選択" },
  { value: "boolean", label: "真偽" },
];

let keySeq = 0;
const nextKey = () => `tmp-${keySeq++}`;

function newOption(label = "", is_correct = false): DraftOption {
  return { key: nextKey(), id: null, label, is_correct };
}

function newQuestion(): DraftQuestion {
  return {
    key: nextKey(),
    id: null,
    kind: "single",
    prompt: "",
    explanation: "",
    points: 1,
    options: [newOption(), newOption()],
  };
}

function booleanOptions(): DraftOption[] {
  return [newOption("正しい", true), newOption("誤り", false)];
}

export function QuizEditor({ lessonId, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [passScore, setPassScore] = useState(70);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  // 読み込み時の id スナップショット (削除検出用)
  const [loadedQuestionIds, setLoadedQuestionIds] = useState<string[]>([]);
  const [loadedOptionIds, setLoadedOptionIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureQuiz(lessonId);
        const data = await getQuizByLesson(lessonId);
        if (cancelled || !data) return;
        setQuizId(data.quiz.id);
        setPassScore(data.quiz.pass_score);
        setShuffleQuestions(data.quiz.shuffle_questions);
        setShuffleOptions(data.quiz.shuffle_options);
        setQuestions(
          data.questions.map((q) => ({
            key: nextKey(),
            id: q.id,
            kind: q.kind,
            prompt: q.prompt,
            explanation: q.explanation ?? "",
            points: q.points,
            options: q.options.map((o) => ({
              key: nextKey(),
              id: o.id,
              label: o.label,
              is_correct: o.is_correct,
            })),
          })),
        );
        setLoadedQuestionIds(data.questions.map((q) => q.id));
        setLoadedOptionIds(
          data.questions.flatMap((q) => q.options.map((o) => o.id)),
        );
      } catch (err) {
        if (!cancelled) {
          console.error("[QuizEditor] load failed", err);
          toast.error("クイズの読み込みに失敗しました");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const updateQuestion = (key: string, patch: Partial<DraftQuestion>) => {
    setQuestions((qs) =>
      qs.map((q) => (q.key === key ? { ...q, ...patch } : q)),
    );
  };

  const changeKind = (key: string, kind: QuestionKind) => {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.key !== key) return q;
        if (kind === "boolean") {
          return { ...q, kind, options: booleanOptions() };
        }
        // single へ変えたとき正解が複数あれば最初の 1 つに絞る
        let options = q.options;
        if (kind === "single") {
          let seen = false;
          options = q.options.map((o) => {
            if (o.is_correct && !seen) {
              seen = true;
              return o;
            }
            return o.is_correct ? { ...o, is_correct: false } : o;
          });
        }
        return { ...q, kind, options };
      }),
    );
  };

  const toggleCorrect = (qKey: string, oKey: string) => {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.key !== qKey) return q;
        const single = q.kind === "single" || q.kind === "boolean";
        return {
          ...q,
          options: q.options.map((o) => {
            if (o.key === oKey) return { ...o, is_correct: !o.is_correct };
            // 単一選択系は他をオフに
            return single && o.is_correct ? { ...o, is_correct: false } : o;
          }),
        };
      }),
    );
  };

  const updateOption = (qKey: string, oKey: string, label: string) => {
    setQuestions((qs) =>
      qs.map((q) =>
        q.key === qKey
          ? {
              ...q,
              options: q.options.map((o) =>
                o.key === oKey ? { ...o, label } : o,
              ),
            }
          : q,
      ),
    );
  };

  const addOption = (qKey: string) => {
    setQuestions((qs) =>
      qs.map((q) =>
        q.key === qKey ? { ...q, options: [...q.options, newOption()] } : q,
      ),
    );
  };

  const removeOption = (qKey: string, oKey: string) => {
    setQuestions((qs) =>
      qs.map((q) =>
        q.key === qKey
          ? { ...q, options: q.options.filter((o) => o.key !== oKey) }
          : q,
      ),
    );
  };

  const addQuestion = () => setQuestions((qs) => [...qs, newQuestion()]);
  const removeQuestion = (key: string) =>
    setQuestions((qs) => qs.filter((q) => q.key !== key));

  const validate = (): string | null => {
    if (Number.isNaN(passScore) || passScore < 0 || passScore > 100)
      return "合格点は 0 から 100 の間で入力してください";
    if (questions.length === 0) return "設問を 1 問以上追加してください";
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (Number.isNaN(q.points) || q.points < 0)
        return `問題 ${i + 1}: 配点は 0 以上の数値を入力してください`;
      if (!q.prompt.trim()) return `問題 ${i + 1}: 設問文を入力してください`;
      if (q.options.length < 2)
        return `問題 ${i + 1}: 選択肢を 2 つ以上にしてください`;
      if (q.options.some((o) => !o.label.trim()))
        return `問題 ${i + 1}: 空の選択肢があります`;
      const correctCount = q.options.filter((o) => o.is_correct).length;
      if (correctCount === 0)
        return `問題 ${i + 1}: 正解を 1 つ以上指定してください`;
      if (q.kind !== "multiple" && correctCount > 1)
        return `問題 ${i + 1}: この種別では正解は 1 つだけです`;
    }
    return null;
  };

  const save = async () => {
    if (!quizId) return;
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      await updateQuiz({
        id: quizId,
        pass_score: passScore,
        shuffle_questions: shuffleQuestions,
        shuffle_options: shuffleOptions,
      });

      // 削除検出: スナップショットにあって draft に無い id を delete
      const keptQuestionIds = new Set(
        questions.map((q) => q.id).filter((id): id is string => id !== null),
      );
      const keptOptionIds = new Set(
        questions
          .flatMap((q) => q.options.map((o) => o.id))
          .filter((id): id is string => id !== null),
      );
      // 削除はネットワークラウンドトリップが多くなり得るので並列実行する。
      await Promise.all([
        ...loadedQuestionIds
          .filter((id) => !keptQuestionIds.has(id))
          .map((id) => deleteQuizQuestion(id)),
        ...loadedOptionIds
          .filter((id) => !keptOptionIds.has(id))
          .map((id) => deleteQuizOption(id)),
      ]);

      // 設問 → 選択肢を順次 upsert (新規設問の id を得てから選択肢を作る)
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const savedQ = await upsertQuizQuestion({
          ...(q.id ? { id: q.id } : {}),
          quiz_id: quizId,
          kind: q.kind,
          prompt: q.prompt.trim(),
          explanation: q.explanation.trim() || null,
          points: q.points,
          order: i,
        });
        for (let j = 0; j < q.options.length; j++) {
          const o = q.options[j];
          await upsertQuizOption({
            ...(o.id ? { id: o.id } : {}),
            question_id: savedQ.id,
            label: o.label.trim(),
            is_correct: o.is_correct,
            order: j,
          });
        }
      }

      toast.success("クイズを保存しました");
      onClose();
    } catch (e) {
      console.error("[QuizEditor] save failed", e);
      toast.error(
        e instanceof Error ? `保存に失敗: ${e.message}` : "保存に失敗しました",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>クイズ設問の編集</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-3">
            <Loader2 size={16} className="animate-spin" /> 読み込み中…
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* 設定 */}
            <div className="grid grid-cols-3 gap-3 items-end">
              <div>
                <Label htmlFor="quiz-pass">合格点 (%)</Label>
                <Input
                  id="quiz-pass"
                  type="number"
                  min={0}
                  max={100}
                  value={passScore}
                  onChange={(e) => setPassScore(Number(e.target.value))}
                />
              </div>
              <label className="flex items-center gap-2 text-[12.5px] text-ink-2">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                />
                設問をシャッフル
              </label>
              <label className="flex items-center gap-2 text-[12.5px] text-ink-2">
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                />
                選択肢をシャッフル
              </label>
            </div>

            {/* 設問リスト */}
            {questions.map((q, i) => (
              <div
                key={q.key}
                className="rounded-md border border-border-2 bg-card p-4 flex flex-col gap-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-ink-3">
                    問題 {i + 1}
                  </span>
                  <select
                    value={q.kind}
                    onChange={(e) =>
                      changeKind(q.key, e.target.value as QuestionKind)
                    }
                    className="h-8 rounded-sm border border-border-2 bg-card px-2 text-[13px]"
                  >
                    {KIND_OPTIONS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1">
                    <Label
                      htmlFor={`q-points-${q.key}`}
                      className="text-[11.5px] text-ink-3"
                    >
                      配点
                    </Label>
                    <Input
                      id={`q-points-${q.key}`}
                      type="number"
                      min={0}
                      value={q.points}
                      onChange={(e) =>
                        updateQuestion(q.key, { points: Number(e.target.value) })
                      }
                      className="w-16"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.key)}
                    className="ml-auto text-ink-3 hover:text-danger"
                    title="設問を削除"
                    aria-label="設問を削除"
                  >
                    <Trash size={14} />
                  </button>
                </div>

                <div>
                  <Label htmlFor={`q-prompt-${q.key}`}>設問文</Label>
                  <Textarea
                    id={`q-prompt-${q.key}`}
                    rows={2}
                    value={q.prompt}
                    onChange={(e) =>
                      updateQuestion(q.key, { prompt: e.target.value })
                    }
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>
                    選択肢{" "}
                    <span className="text-[11px] text-ink-3 font-normal">
                      ({q.kind === "multiple" ? "複数正解可" : "正解は1つ"})
                    </span>
                  </Label>
                  {q.options.map((o) => (
                    <div key={o.key} className="flex items-center gap-2">
                      <input
                        type={q.kind === "multiple" ? "checkbox" : "radio"}
                        name={`correct-${q.key}`}
                        checked={o.is_correct}
                        onChange={() => toggleCorrect(q.key, o.key)}
                        title="正解にする"
                      />
                      <Input
                        value={o.label}
                        onChange={(e) =>
                          updateOption(q.key, o.key, e.target.value)
                        }
                        placeholder="選択肢のテキスト"
                        className="flex-1"
                        disabled={q.kind === "boolean"}
                      />
                      {q.kind !== "boolean" ? (
                        <button
                          type="button"
                          onClick={() => removeOption(q.key, o.key)}
                          className="text-ink-3 hover:text-danger"
                          title="選択肢を削除"
                          aria-label="選択肢を削除"
                        >
                          <Trash size={13} />
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {q.kind !== "boolean" ? (
                    <button
                      type="button"
                      onClick={() => addOption(q.key)}
                      className="self-start flex items-center gap-1 text-[12px] text-brand hover:underline"
                    >
                      <Plus size={12} /> 選択肢を追加
                    </button>
                  ) : null}
                </div>

                <div>
                  <Label htmlFor={`q-exp-${q.key}`}>
                    解説 (任意・提出後に表示)
                  </Label>
                  <Textarea
                    id={`q-exp-${q.key}`}
                    rows={2}
                    value={q.explanation}
                    onChange={(e) =>
                      updateQuestion(q.key, { explanation: e.target.value })
                    }
                  />
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="ghost"
              onClick={addQuestion}
              className="self-start"
            >
              <Plus size={14} /> 設問を追加
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            type="button"
            variant="accent"
            disabled={saving || loading}
            onClick={() => void save()}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
