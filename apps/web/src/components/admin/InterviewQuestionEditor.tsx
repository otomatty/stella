/**
 * 面談対策 — 想定質問の編集 (admin / 営業)。
 *
 * 質問バンクの正本は `packages/shared/src/interview/questions.json` だが、 面談に
 * 同席して実際の言い回しを知っているのは営業なので、 admin と営業は画面から
 * 直接直せる (Issue #237)。 直した行には「編集済み」が付き、 配信 (seed) で
 * 正本の文面に巻き戻らなくなる。
 *
 * 読み上げ音声は保存の延長でサーバが作り直す。 作り直せなかったときは応答の
 * `audio.stale` が立つので、 その場で「音声が古い」と伝えて質問音声タブへ
 * 誘導する (admin だけがそのタブを持つため、 営業には文言だけ出す)。
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, RotateCcw, Save, Volume2 } from "@/lib/icons";
import { Card } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ASSIGNABLE_CATEGORIES, COMMON_CATEGORY } from "@falcon/shared/interview/types";
import {
  INTERVIEW_QUESTION_FIELD_LABELS,
  INTERVIEW_QUESTION_MAX_LENGTH,
  INTERVIEW_QUESTION_TEXT_FIELDS,
  type InterviewQuestionTextField,
  InterviewQuestionPatchError,
  normalizeInterviewQuestionPatch,
} from "@falcon/shared/interview/edit";
import {
  fetchInterviewQuestions,
  releaseInterviewQuestionEdit,
  type StaffInterviewQuestion,
  updateInterviewQuestion,
} from "@/lib/interview-prep-api";
import { diffPatch, type InterviewQuestionDraft, toDraft } from "@/lib/interview-question-editor";
import { cn } from "@/lib/utils";

/** 複数行で入力する項目 (残りは 1 行)。 */
const MULTILINE_FIELDS: readonly InterviewQuestionTextField[] = [
  "question",
  "answer_template",
  "ng",
  "criteria",
  "intent",
];

/** 選べる案件種別 (共通は「全員に出す」の意味なので先頭)。 */
const CATEGORY_CHOICES = [COMMON_CATEGORY, ...ASSIGNABLE_CATEGORIES];

type StatusFilter = "all" | "edited";

export function InterviewQuestionEditor({ canManageAudio }: { canManageAudio: boolean }) {
  const [rows, setRows] = useState<StaffInterviewQuestion[]>([]);
  /** 音声が本文に追いついていない質問番号。 */
  const [staleNos, setStaleNos] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  /** 開いている質問の番号。 一度に 1 問だけ編集する (取り違えを防ぐ)。 */
  const [openNo, setOpenNo] = useState<number | null>(null);
  const [draft, setDraft] = useState<InterviewQuestionDraft | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetchInterviewQuestions()
      .then((r) => {
        if (cancelled) return;
        setRows(r.rows as StaffInterviewQuestion[]);
        setStaleNos(new Set(r.audioStaleNos));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "edited" && !r.edited_at) return false;
      if (!q) return true;
      return r.question.toLowerCase().includes(q) || String(r.no) === q;
    });
  }, [rows, query, filter]);

  const editedCount = useMemo(() => rows.filter((r) => r.edited_at).length, [rows]);

  const open = (row: StaffInterviewQuestion) => {
    if (openNo === row.no) {
      setOpenNo(null);
      setDraft(null);
      return;
    }
    setOpenNo(row.no);
    setDraft(toDraft(row));
  };

  const save = async (row: StaffInterviewQuestion) => {
    if (!draft) return;
    const patch = diffPatch(row, draft);
    if (Object.keys(patch).length === 0) {
      toast("変更がありません");
      return;
    }
    // サーバと同じ検証をここでも通し、 往復する前に同じ文言で返す。
    try {
      normalizeInterviewQuestionPatch(patch);
    } catch (e) {
      toast.error(
        e instanceof InterviewQuestionPatchError ? e.message : "入力内容を確認してください",
      );
      return;
    }
    setSaving(true);
    try {
      const result = await updateInterviewQuestion(row.no, patch);
      setRows((prev) =>
        prev.map((r) =>
          r.no === row.no
            ? { ...r, ...result.row, edited_at: result.edited_at, edited_by: result.edited_by }
            : r,
        ),
      );
      // 下書きには触らない。 読み上げの生成で保存は数秒かかることがあり、 その間の
      // 入力は生きているので、 応答で塗り替えると打った文字が黙って消える。 別の
      // 質問を開いていればなおさら (その下書きに前の質問の本文が入ってしまう)。
      // サーバ側の正規化 (前後の空白落とし等) は次の保存で送り直されるだけで済む。
      const { regenerated, stale, reason } = result.audio;
      setStaleNos((prev) => {
        const next = new Set(prev);
        if (regenerated) next.delete(row.no);
        if (stale) next.add(row.no);
        return next;
      });
      if (stale) {
        toast.error(reason ?? "保存しましたが、 読み上げ音声が古いままです");
      } else if (regenerated) {
        toast("保存し、 読み上げ音声を作り直しました");
      } else {
        toast("保存しました");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const release = async (row: StaffInterviewQuestion) => {
    setSaving(true);
    try {
      const requestedAt = await releaseInterviewQuestionEdit(row.no);
      // 本文はまだ編集後のままなので「編集済み」は外さない。 次の配信で戻る。
      setRows((prev) =>
        prev.map((r) => (r.no === row.no ? { ...r, release_requested_at: requestedAt } : r)),
      );
      toast("次の配信で正本の文面へ戻します (それまでは編集後の本文のままです)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "解除に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <SkeletonRows rows={5} />
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="p-12 text-center text-sm text-destructive">
        質問一覧の取得に失敗しました: {error}
      </Card>
    );
  }

  return (
    <>
      <Card className="p-3 mb-3 border-warning/40 bg-warning/10 text-[12.5px] leading-relaxed">
        質問文を直すと、 <b>読み上げ音声もその場で作り直します</b>{" "}
        (意図・評価軸など読み上げない項目を直したときは作り直しません)。 編集した質問は
        「編集済み」が付き、 配信のたびに正本の文面へ戻ることはなくなります。
      </Card>

      <Card className="p-3 mb-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12.5px] text-ink-2">
            全 <b>{rows.length}</b> 問 (うち編集済み {editedCount} 問)
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              ["all", "すべて"],
              ["edited", "編集済み"],
            ] as const
          ).map(([key, label]) => (
            <Chip key={key} active={filter === key} onClick={() => setFilter(key)}>
              {label}
            </Chip>
          ))}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="質問文・番号で検索"
            className="h-8 text-[13px] max-w-xs ml-auto"
          />
        </div>
      </Card>

      {visible.length === 0 ? (
        <Card className="p-12 text-center text-sm text-ink-3">条件に合う質問がありません。</Card>
      ) : (
        <div className="flex flex-col gap-1.5">
          {visible.map((row) => {
            const expanded = openNo === row.no;
            const stale = staleNos.has(row.no);
            return (
              <Card key={row.no} className={cn("p-3", expanded && "ring-1 ring-brand/30")}>
                <div className="flex items-center gap-3">
                  <span className="text-[11.5px] text-ink-4 tabular-nums w-8 shrink-0">
                    {row.no}
                  </span>
                  <span className="text-[10.5px] px-1.5 py-[1px] rounded font-semibold shrink-0 bg-muted text-ink-3">
                    {row.freq}
                  </span>
                  {row.edited_at ? (
                    <span className="text-[10.5px] px-1.5 py-[1px] rounded font-semibold shrink-0 bg-brand/10 text-brand">
                      編集済み
                    </span>
                  ) : null}
                  {row.release_requested_at ? (
                    <span
                      className="text-[10.5px] px-1.5 py-[1px] rounded font-semibold shrink-0 bg-muted text-ink-3"
                      title="次の配信 (seed) で questions.json の文面へ戻ります"
                    >
                      正本へ戻す予定
                    </span>
                  ) : null}
                  {stale ? (
                    <span
                      className="text-[10.5px] px-1.5 py-[1px] rounded font-semibold shrink-0 bg-warning/20 text-warning-foreground inline-flex items-center gap-1"
                      title="質問文と読み上げ音声が食い違っています"
                    >
                      <AlertTriangle size={11} />
                      音声が古い
                    </span>
                  ) : null}
                  <span className="flex-1 min-w-0 text-[13px] truncate" title={row.question}>
                    {row.question}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => open(row)}>
                    {expanded ? "閉じる" : "編集"}
                  </Button>
                </div>

                {expanded && draft ? (
                  <div className="mt-3 pt-3 border-t border-border flex flex-col gap-3">
                    {stale ? (
                      <p className="text-[12px] text-ink-2 inline-flex items-center gap-1.5">
                        <Volume2 size={12} />
                        この質問の音声は本文と食い違っています。
                        {canManageAudio
                          ? " 保存し直すか、 「質問音声」タブから再生成してください。"
                          : " 管理者に「質問音声」タブからの再生成を依頼してください。"}
                      </p>
                    ) : null}

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[12px] text-ink-3 w-20 shrink-0">案件種別</span>
                      {CATEGORY_CHOICES.map((cat) => (
                        <Chip
                          key={cat}
                          active={draft.categories.includes(cat)}
                          ariaLabel={`No.${row.no} の案件種別 ${cat}`}
                          onClick={() =>
                            setDraft((d) =>
                              d === null
                                ? d
                                : {
                                    ...d,
                                    categories: d.categories.includes(cat)
                                      ? d.categories.filter((v) => v !== cat)
                                      : [...d.categories, cat],
                                  },
                            )
                          }
                        >
                          {cat}
                        </Chip>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[12px] text-ink-3 w-20 shrink-0">優先度</span>
                      {(["A", "B", "C"] as const).map((freq) => (
                        <Chip
                          key={freq}
                          active={draft.freq === freq}
                          ariaLabel={`No.${row.no} の優先度 ${freq}`}
                          onClick={() => setDraft((d) => (d === null ? d : { ...d, freq }))}
                        >
                          {freq === "A" ? "A 必修" : freq === "B" ? "B 推奨" : "C 参考"}
                        </Chip>
                      ))}
                      <Chip
                        active={draft.is_reverse}
                        ariaLabel={`No.${row.no} を逆質問にする`}
                        onClick={() =>
                          setDraft((d) => (d === null ? d : { ...d, is_reverse: !d.is_reverse }))
                        }
                      >
                        逆質問
                      </Chip>
                    </div>

                    {INTERVIEW_QUESTION_TEXT_FIELDS.map((field) => {
                      const id = `q-${row.no}-${field}`;
                      const value = draft[field];
                      const over = value.length > INTERVIEW_QUESTION_MAX_LENGTH[field];
                      return (
                        <div key={field} className="flex flex-col gap-1">
                          <label
                            htmlFor={id}
                            className="text-[12px] text-ink-3 flex items-center gap-2"
                          >
                            {INTERVIEW_QUESTION_FIELD_LABELS[field]}
                            <span
                              className={cn(
                                "text-[11px] tabular-nums",
                                over ? "text-destructive font-semibold" : "text-ink-4",
                              )}
                            >
                              {value.length}/{INTERVIEW_QUESTION_MAX_LENGTH[field]}
                            </span>
                          </label>
                          {MULTILINE_FIELDS.includes(field) ? (
                            <Textarea
                              id={id}
                              value={value}
                              rows={field === "question" ? 2 : 2}
                              className="text-[13px] min-h-0"
                              onChange={(e) =>
                                setDraft((d) =>
                                  d === null ? d : { ...d, [field]: e.target.value },
                                )
                              }
                            />
                          ) : (
                            <Input
                              id={id}
                              value={value}
                              className="h-8 text-[13px]"
                              onChange={(e) =>
                                setDraft((d) =>
                                  d === null ? d : { ...d, [field]: e.target.value },
                                )
                              }
                            />
                          )}
                        </div>
                      );
                    })}

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" disabled={saving} onClick={() => void save(row)}>
                        {saving ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Save size={13} />
                        )}
                        保存して音声を更新
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={saving}
                        onClick={() => setDraft(toDraft(row))}
                      >
                        <RotateCcw size={13} />
                        入力を戻す
                      </Button>
                      {row.edited_at && !row.release_requested_at ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto text-ink-3"
                          disabled={saving}
                          onClick={() => void release(row)}
                          title="次の配信 (seed) で questions.json の文面へ戻ります。 それまでは編集後の本文のままです"
                        >
                          正本の管理に戻す
                        </Button>
                      ) : null}
                    </div>
                    {row.edited_at ? (
                      <p className="text-[11.5px] text-ink-4">
                        最終編集 {new Date(row.edited_at).toLocaleString("ja-JP")}
                        {row.edited_by ? ` / ${row.edited_by}` : ""}
                        {row.release_requested_at
                          ? " — 次の配信で正本の文面へ戻します (保存し直すと取り消されます)"
                          : ""}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
