import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Play, Pause, X } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import type { LearnerInterviewQuestion } from "@/lib/interview-prep-api";
import { ASSIGNABLE_CATEGORIES, COMMON_CATEGORY } from "@falcon/shared/interview/types";
import { tagMatches } from "@falcon/shared/interview/filter";
import {
  adoptPersonalAnswerTemplateDraft,
  fetchInterviewQuestions,
  savePersonalAnswerTemplate,
} from "@/lib/interview-prep-api";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/ui/chip";

type Freq = "ALL" | "A" | "B" | "C";
const FREQ_LABELS: Record<Exclude<Freq, "ALL">, string> = {
  A: "A 必修",
  B: "B 推奨",
  C: "C 参考",
};

/**
 * Issue #206 — 共通・個別ともプレーンテキストで表示 (blank span 廃止)。
 */
function AnswerTemplateText({ template }: { template: string }) {
  return <span className="whitespace-pre-wrap">{template}</span>;
}

function shuffle(nos: number[]): number[] {
  const a = [...nos];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const left = a[i];
    const right = a[j];
    if (left === undefined || right === undefined) continue;
    a[i] = right;
    a[j] = left;
  }
  return a;
}

function daysUntilInterview(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function formatInterviewCountdown(dateStr: string): string {
  const days = daysUntilInterview(dateStr);
  if (days === 0) return "本日";
  if (days > 0) return `あと ${days} 日`;
  return `${Math.abs(days)} 日前`;
}

export function InterviewPrepPage({
  backendEnabled,
  profileId,
}: {
  backendEnabled: boolean;
  profileId?: string | null;
}) {
  const [rows, setRows] = useState<LearnerInterviewQuestion[]>([]);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [interviewDate, setInterviewDate] = useState<string | null>(null);
  const [interviewNote, setInterviewNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(backendEnabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!backendEnabled) {
      // デモ (fixtures) モード: 全件表示。質問データ(200KB超)はメインチャンクに含めない。
      import("@falcon/shared/interview/questions").then(({ INTERVIEW_QUESTIONS }) => {
        if (cancelled) return;
        setRows(INTERVIEW_QUESTIONS);
        setAssigned([...ASSIGNABLE_CATEGORIES]);
      });
      return () => {
        cancelled = true;
      };
    }
    fetchInterviewQuestions()
      .then((r) => {
        if (cancelled) return;
        setRows(r.rows);
        setAssigned(r.assignedCategories);
        setInterviewDate(r.interviewDate ?? null);
        setInterviewNote(r.note ?? null);
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
  }, [backendEnabled]);

  const reloadRows = () => {
    if (!backendEnabled) return;
    fetchInterviewQuestions()
      .then((r) => {
        setRows(r.rows);
        setAssigned(r.assignedCategories);
        setInterviewDate(r.interviewDate ?? null);
        setInterviewNote(r.note ?? null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  };

  const [mode, setMode] = useState<"list" | "quiz">("list");
  const [cat, setCat] = useState<string>("ALL");
  const [freq, setFreq] = useState<Freq>("A");
  const [query, setQuery] = useState("");

  // 表示対象タグのチップ: 割当タグが 1 つ以上あるときだけ出す
  const catChips = useMemo(() => {
    const cats = [...assigned, COMMON_CATEGORY].filter((c) =>
      rows.some((r) => r.categories.some((t) => tagMatches(t, c))),
    );
    return cats.length > 1 ? cats : [];
  }, [assigned, rows]);

  const pool = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((d) => {
      if (cat !== "ALL" && !d.categories.some((t) => tagMatches(t, cat))) return false;
      if (freq !== "ALL" && d.freq !== freq) return false;
      if (!q) return true;
      return [d.question, d.keywords, d.subcategory, d.intent].some((v) =>
        v?.toLowerCase().includes(q),
      );
    });
  }, [rows, cat, freq, query]);

  if (loading) {
    return (
      <Card className="p-6">
        <SkeletonRows rows={4} />
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="p-12 text-center text-sm text-destructive">
        想定質問の取得に失敗しました: {error}
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title="面談対策"
        sub={`クライアント面談の想定質問 ${rows.length} 問 — 回答の型を確認し、声に出して練習しましょう`}
      />

      {interviewDate ? (
        <Card className="p-3 mb-4 border-brand/20 bg-brand/5">
          <div className="text-[13px] font-semibold text-ink-1">
            面談予定: {interviewDate}
            <span className="ml-2 text-brand">{formatInterviewCountdown(interviewDate)}</span>
          </div>
          {interviewNote ? (
            <p className="mt-1 text-[12px] text-ink-3 leading-relaxed">{interviewNote}</p>
          ) : null}
        </Card>
      ) : null}

      {/* モード切替 */}
      <div className="flex items-center gap-1.5 mb-3">
        {(
          [
            ["list", "一覧"],
            ["quiz", "ランダム出題"],
          ] as const
        ).map(([key, label]) => (
          <Chip key={key} active={mode === key} onClick={() => setMode(key)}>
            {label}
          </Chip>
        ))}
      </div>

      {/* フィルタ */}
      <Card className="p-3 mb-4 flex flex-col gap-2">
        {catChips.length > 0 ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-ink-4 w-14">案件種別</span>
            <Chip active={cat === "ALL"} onClick={() => setCat("ALL")}>
              すべて
            </Chip>
            {catChips.map((c) => (
              <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
                {c}
              </Chip>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-ink-4 w-14">優先度</span>
          <Chip active={freq === "ALL"} onClick={() => setFreq("ALL")}>
            すべて
          </Chip>
          {(Object.keys(FREQ_LABELS) as Array<Exclude<Freq, "ALL">>).map((f) => (
            <Chip key={f} active={freq === f} onClick={() => setFreq(f)}>
              {FREQ_LABELS[f]}
            </Chip>
          ))}
          <span className="ml-auto text-[12px] text-ink-3">該当 {pool.length} 問</span>
        </div>
        {mode === "list" ? (
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="質問文・キーワードで検索"
            className="h-8 text-[13px]"
          />
        ) : null}
      </Card>

      {pool.length === 0 ? (
        <Card className="p-12 text-center text-sm text-ink-3">
          条件に合う質問がありません。フィルターを緩めてください。
        </Card>
      ) : mode === "list" ? (
        <QuestionList
          pool={pool}
          backendEnabled={backendEnabled}
          profileId={profileId}
          onRefresh={reloadRows}
        />
      ) : (
        <QuizMode
          pool={pool}
          backendEnabled={backendEnabled}
          profileId={profileId}
          onRefresh={reloadRows}
        />
      )}
    </>
  );
}

function FreqBadge({ freq }: { freq: "A" | "B" | "C" }) {
  return (
    <span
      className={cn(
        "text-[10.5px] px-1.5 py-[1px] rounded font-semibold shrink-0",
        freq === "A"
          ? "bg-destructive/10 text-destructive"
          : freq === "B"
            ? "border border-border text-ink-2"
            : "bg-muted text-ink-3",
      )}
    >
      {FREQ_LABELS[freq]}
    </span>
  );
}

/** 一覧モード: アコーディオンで 意図 → 回答の型 → 深掘り → NG → 評価軸。 */
function QuestionList({
  pool,
  backendEnabled,
  profileId,
  onRefresh,
}: {
  pool: LearnerInterviewQuestion[];
  backendEnabled: boolean;
  profileId?: string | null;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  return (
    <div className="flex flex-col gap-2">
      {pool.map((d) => (
        <Card key={d.no} className="p-0 overflow-hidden">
          <button
            type="button"
            className="w-full text-left p-3.5 flex items-start gap-2.5 cursor-pointer hover:bg-sunken transition-colors"
            onClick={() => setOpen((s) => ({ ...s, [d.no]: !s[d.no] }))}
          >
            <FreqBadge freq={d.freq} />
            {d.is_reverse ? (
              <span className="text-[10.5px] px-1.5 py-[1px] rounded bg-brand/10 text-brand font-semibold shrink-0">
                聞く質問
              </span>
            ) : null}
            {d.has_pending_draft ? (
              <span className="text-[10.5px] px-1.5 py-[1px] rounded bg-warning/15 text-warning font-semibold shrink-0">
                新案あり
              </span>
            ) : null}
            <span className="flex-1 min-w-0">
              <span className="block text-[13.5px] font-medium">{d.question}</span>
              <span className="block text-[11.5px] text-ink-4 mt-0.5">
                {d.categories.join("、")} ・ {d.subcategory}
                {d.time ? ` ・ 目安 ${d.time}` : ""}
              </span>
            </span>
            {open[d.no] ? (
              <ChevronDown size={15} className="shrink-0 mt-1 text-ink-4" />
            ) : (
              <ChevronRight size={15} className="shrink-0 mt-1 text-ink-4" />
            )}
          </button>
          {open[d.no] ? (
            <QuestionDetail
              d={d}
              backendEnabled={backendEnabled}
              profileId={profileId}
              onRefresh={onRefresh}
            />
          ) : null}
        </Card>
      ))}
    </div>
  );
}

function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4 mb-1">
        {label}
      </div>
      <div className="text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}

function QuestionDetail({
  d,
  backendEnabled,
  profileId,
  onRefresh,
}: {
  d: LearnerInterviewQuestion;
  backendEnabled: boolean;
  profileId?: string | null;
  onRefresh: () => void;
}) {
  const deeps = [d.deep1, d.deep2, d.deep3].filter((v): v is string => Boolean(v));
  const [shownDeeps, setShownDeeps] = useState<Record<number, boolean>>({});
  const displayTemplate = d.personal_answer_template ?? d.answer_template ?? null;
  const canEditPersonal = backendEnabled && profileId && d.freq === "A" && !d.is_reverse;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayTemplate ?? "");
  const [saving, setSaving] = useState(false);

  const saveTemplate = async () => {
    if (!profileId || !draft.trim()) return;
    setSaving(true);
    try {
      await savePersonalAnswerTemplate(profileId, d.no, draft.trim());
      setEditing(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const adoptDraft = async () => {
    if (!profileId) return;
    setSaving(true);
    try {
      await adoptPersonalAnswerTemplateDraft(profileId, d.no);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-border p-3.5 flex flex-col gap-3 bg-sunken/40">
      {d.intent ? <DetailBlock label="Intent ・ 質問の意図">{d.intent}</DetailBlock> : null}
      {d.is_reverse ? (
        <p className="text-[12px] text-ink-3">
          これはあなたが面談官に「聞く」質問です。回答準備ではなく、質問文自体を覚えておきましょう。
        </p>
      ) : null}
      {displayTemplate || canEditPersonal ? (
        <DetailBlock label={d.is_reverse ? "Prep ・ 準備のポイント" : "Answer ・ 回答の型"}>
          {editing ? (
            <div className="flex flex-col gap-2">
              <textarea
                className="w-full min-h-24 rounded-sm border border-border bg-surface p-2 text-[13px]"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  className="px-3 py-1 rounded-sm sf-gradient-bg text-white text-[12px] font-semibold"
                  onClick={() => void saveTemplate()}
                >
                  保存
                </button>
                <button
                  type="button"
                  className="px-3 py-1 rounded-sm border border-border text-[12px]"
                  onClick={() => {
                    setEditing(false);
                    setDraft(displayTemplate ?? "");
                  }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {displayTemplate ? (
                <AnswerTemplateText template={displayTemplate} />
              ) : (
                <p className="text-[12px] text-ink-3">
                  スキルシート登録後、A
                  必修の個別の型が生成されます。共通の型を参考に編集もできます。
                </p>
              )}
              {canEditPersonal ? (
                <button
                  type="button"
                  className="self-start text-[12px] text-brand underline underline-offset-2"
                  onClick={() => {
                    setDraft(displayTemplate ?? d.answer_template ?? "");
                    setEditing(true);
                  }}
                >
                  回答の型を編集
                </button>
              ) : null}
            </div>
          )}
        </DetailBlock>
      ) : null}
      {d.has_pending_draft && d.draft_answer_template ? (
        <DetailBlock label="Draft ・ 新しい生成案">
          <div className="flex flex-col gap-2 rounded-sm border border-warning/30 bg-warning/5 p-2.5">
            <AnswerTemplateText template={d.draft_answer_template} />
            {canEditPersonal ? (
              <button
                type="button"
                disabled={saving}
                className="self-start px-3 py-1 rounded-sm border border-warning text-[12px] text-warning"
                onClick={() => void adoptDraft()}
              >
                この案を採用する
              </button>
            ) : null}
          </div>
        </DetailBlock>
      ) : null}
      {!d.is_reverse && deeps.length > 0 ? (
        <DetailBlock label="Follow-up ・ 深掘り対応（答えてから開く）">
          <div className="flex flex-col gap-1.5">
            {deeps.map((t, i) => (
              <div key={t}>
                <button
                  type="button"
                  className="text-[12px] text-brand underline underline-offset-2 cursor-pointer"
                  onClick={() => setShownDeeps((s) => ({ ...s, [i]: !s[i] }))}
                >
                  深掘り{"①②③"[i]} {shownDeeps[i] ? "を閉じる" : "を見る"}
                </button>
                {shownDeeps[i] ? <p className="mt-1">{t}</p> : null}
              </div>
            ))}
          </div>
        </DetailBlock>
      ) : null}
      {d.ng ? <DetailBlock label="Avoid ・ 避けたい回答">{d.ng}</DetailBlock> : null}
      {d.criteria ? <DetailBlock label="Criteria ・ 評価軸">{d.criteria}</DetailBlock> : null}
    </div>
  );
}

/** ランダム出題モード: タイマー付きフラッシュカード。 */
function QuizMode({
  pool,
  backendEnabled,
  profileId,
  onRefresh,
}: {
  pool: LearnerInterviewQuestion[];
  backendEnabled: boolean;
  profileId?: string | null;
  onRefresh: () => void;
}) {
  const [order, setOrder] = useState<number[]>(() => shuffle(pool.map((d) => d.no)));
  const [qi, setQi] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sec, setSec] = useState(0);
  const [running, setRunning] = useState(false);

  // フィルタが変わったら出題順を作り直す
  useEffect(() => {
    setOrder(shuffle(pool.map((d) => d.no)));
    setQi(0);
    setRevealed(false);
    setSec(0);
    setRunning(false);
  }, [pool]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const cur = pool.find((d) => d.no === order[qi % Math.max(order.length, 1)]);
  if (!cur) return null;

  const fmt = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  const move = (delta: number) => {
    setQi((i) => (i + delta + order.length) % order.length);
    setRevealed(false);
    setSec(0);
    setRunning(false);
  };

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between text-[12px] text-ink-3">
        <span>
          {(qi % order.length) + 1} / {order.length}
        </span>
        <span>
          {cur.categories.join("、")} ・ {cur.subcategory}
          {cur.time ? ` ・ 目安 ${cur.time}` : ""}
        </span>
      </div>

      <div className="flex items-start gap-2.5">
        <FreqBadge freq={cur.freq} />
        <p className="text-[15px] font-medium leading-relaxed flex-1">{cur.question}</p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[20px] font-semibold tabular-nums">{fmt(sec)}</span>
        <button
          type="button"
          className="px-2.5 py-1 rounded-sm border border-border text-[12px] cursor-pointer hover:bg-sunken inline-flex items-center gap-1"
          onClick={() => setRunning((v) => !v)}
        >
          {running ? <Pause size={12} /> : <Play size={12} />}
          {running ? "一時停止" : sec > 0 ? "再開" : "スタート"}
        </button>
        <button
          type="button"
          className="px-2.5 py-1 rounded-sm border border-border text-[12px] cursor-pointer hover:bg-sunken inline-flex items-center gap-1"
          onClick={() => {
            setSec(0);
            setRunning(false);
          }}
        >
          <X size={12} />
          リセット
        </button>
      </div>

      {!revealed ? (
        <button
          type="button"
          className="p-4 rounded-sm border border-dashed border-border text-[13px] text-ink-3 cursor-pointer hover:bg-sunken"
          onClick={() => {
            setRevealed(true);
            setRunning(false);
          }}
        >
          まず声に出して答える → 回答例を表示
        </button>
      ) : (
        <QuestionDetail
          d={cur}
          backendEnabled={backendEnabled}
          profileId={profileId}
          onRefresh={onRefresh}
        />
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="px-3 py-1.5 rounded-sm border border-border text-[12.5px] cursor-pointer hover:bg-sunken"
          onClick={() => move(-1)}
        >
          前の問題
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-full sf-gradient-bg text-white text-[12.5px] font-bold cursor-pointer hover:brightness-105"
          onClick={() => move(1)}
        >
          次の問題
        </button>
        <button
          type="button"
          className="ml-auto text-[12px] text-ink-3 underline underline-offset-2 cursor-pointer"
          onClick={() => {
            setOrder(shuffle(pool.map((d) => d.no)));
            setQi(0);
            setRevealed(false);
            setSec(0);
            setRunning(false);
          }}
        >
          出題順をシャッフルし直す
        </button>
      </div>
    </Card>
  );
}
