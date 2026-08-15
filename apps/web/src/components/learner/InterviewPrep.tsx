import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Play, Pause, X } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import type { InterviewQuestion } from "@falcon/shared/interview/types";
import { ASSIGNABLE_CATEGORIES, COMMON_CATEGORY } from "@falcon/shared/interview/types";
import { fetchInterviewQuestions } from "@/lib/interview-prep-api";
import { cn } from "@/lib/utils";

type Freq = "ALL" | "A" | "B" | "C";
const FREQ_LABELS: Record<Exclude<Freq, "ALL">, string> = {
  A: "A 必修",
  B: "B 推奨",
  C: "C 参考",
};

/**
 * 回答の型を描画する。 `<span class="blank">…</span>` が「自分の経験で埋める穴」で、
 * データ中の HTML タグはこれのみ (packages/shared のテストで担保)。 split の
 * 奇数インデックスがキャプチャ = 穴の中身。
 */
function AnswerTemplate({ template }: { template: string }) {
  const parts = template.split(/<span class="blank">(.*?)<\/span>/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: split 結果は位置が同一性
            key={i}
            className="px-1.5 py-px rounded-sm bg-brand/10 text-brand font-bold"
          >
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
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

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-full text-[12px] border cursor-pointer transition-colors",
        active
          ? "sf-gradient-bg text-white border-transparent font-bold"
          : "bg-card text-ink-2 border-border hover:bg-sunken",
      )}
    >
      {children}
    </button>
  );
}

export function InterviewPrepPage({ backendEnabled }: { backendEnabled: boolean }) {
  const [rows, setRows] = useState<InterviewQuestion[]>([]);
  const [assigned, setAssigned] = useState<string[]>([]);
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

  const [mode, setMode] = useState<"list" | "quiz">("list");
  const [cat, setCat] = useState<string>("ALL");
  const [freq, setFreq] = useState<Freq>("A");
  const [query, setQuery] = useState("");

  // 表示対象カテゴリのチップ: 割当カテゴリが 1 つ以上あるときだけ出す
  const catChips = useMemo(() => {
    const cats = [...assigned, COMMON_CATEGORY].filter((c) => rows.some((r) => r.category === c));
    return cats.length > 1 ? cats : [];
  }, [assigned, rows]);

  const pool = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((d) => {
      if (cat !== "ALL" && d.category !== cat) return false;
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
        sub={`クライアント面談の想定質問 ${rows.length} 問 — 回答の型に自分の経験を当てはめて、声に出して練習しましょう`}
      />

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
        <QuestionList pool={pool} />
      ) : (
        <QuizMode pool={pool} />
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
function QuestionList({ pool }: { pool: InterviewQuestion[] }) {
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
            <span className="flex-1 min-w-0">
              <span className="block text-[13.5px] font-medium">{d.question}</span>
              <span className="block text-[11.5px] text-ink-4 mt-0.5">
                {d.category} ・ {d.subcategory}
                {d.time ? ` ・ 目安 ${d.time}` : ""}
              </span>
            </span>
            {open[d.no] ? (
              <ChevronDown size={15} className="shrink-0 mt-1 text-ink-4" />
            ) : (
              <ChevronRight size={15} className="shrink-0 mt-1 text-ink-4" />
            )}
          </button>
          {open[d.no] ? <QuestionDetail d={d} /> : null}
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

function QuestionDetail({ d }: { d: InterviewQuestion }) {
  const deeps = [d.deep1, d.deep2, d.deep3].filter((v): v is string => Boolean(v));
  const [shownDeeps, setShownDeeps] = useState<Record<number, boolean>>({});
  return (
    <div className="border-t border-border p-3.5 flex flex-col gap-3 bg-sunken/40">
      {d.intent ? <DetailBlock label="Intent ・ 質問の意図">{d.intent}</DetailBlock> : null}
      {d.is_reverse ? (
        <p className="text-[12px] text-ink-3">
          これはあなたが面談官に「聞く」質問です。回答準備ではなく、質問文自体を覚えておきましょう。
        </p>
      ) : null}
      {d.answer_template ? (
        <DetailBlock label={d.is_reverse ? "Prep ・ 準備のポイント" : "Answer ・ 回答の型"}>
          <AnswerTemplate template={d.answer_template} />
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
function QuizMode({ pool }: { pool: InterviewQuestion[] }) {
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
          {cur.category} ・ {cur.subcategory}
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
        <QuestionDetail d={cur} />
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
