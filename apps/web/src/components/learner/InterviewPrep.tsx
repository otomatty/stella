import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Mic,
  Pause,
  Play,
  Square,
  Volume2,
  X,
} from "@/lib/icons";
import { Card } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import type { LearnerInterviewQuestion, ProgressEvent } from "@/lib/interview-prep-api";
import type { ProfileRole } from "@falcon/shared/cms/types";
import { ASSIGNABLE_CATEGORIES, COMMON_CATEGORY } from "@falcon/shared/interview/types";
import { tagMatches } from "@falcon/shared/interview/filter";
import {
  PREP_STATUS_LABELS,
  deriveQuestionPrepStatus,
  prepRate,
  type QuestionPrepStatus,
} from "@falcon/shared/interview/progress";
import {
  adoptPersonalAnswerTemplateDraft,
  fetchInterviewQuestions,
  fetchQuestionAudio,
  reportInterviewProgress,
  savePersonalAnswerTemplate,
  transcribeRecording,
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

/** 表示ステータス (未着手/型を読んだ/回答作成済み/練習OK) を行から導出する。 */
function statusOf(d: LearnerInterviewQuestion): QuestionPrepStatus {
  return deriveQuestionPrepStatus({
    hasPersonalTemplate: Boolean(d.personal_answer_template),
    progressStatus: d.progress_status ?? null,
  });
}

/**
 * サーバに保存されたと確認できた進捗。 `seq` は送信の世代番号で、 応答順が
 * 入れ替わっても古い結果で確定値を上書きしないために持つ。
 */
interface ConfirmedProgress {
  seq: number;
  status: LearnerInterviewQuestion["progress_status"];
  count: number;
}

const STATUS_PILL_CLASSES: Record<QuestionPrepStatus, string> = {
  none: "bg-muted text-ink-3",
  read: "bg-info/10 text-info",
  drafted: "bg-warning/15 text-warning",
  confident: "bg-success/10 text-success",
};

function PrepStatusPill({ status }: { status: QuestionPrepStatus }) {
  return (
    <span
      className={cn(
        "text-[10.5px] px-2 py-[2px] rounded-full font-semibold shrink-0",
        STATUS_PILL_CLASSES[status],
      )}
    >
      {PREP_STATUS_LABELS[status]}
    </span>
  );
}

/** 準備率リング。 sf グラデーションのストロークで A 必修の練習OK率を示す。 */
function PrepRateRing({ percent }: { percent: number }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const filled = (Math.min(Math.max(percent, 0), 100) / 100) * c;
  return (
    <svg width="92" height="92" viewBox="0 0 92 92" role="img" aria-label={`準備率 ${percent}%`}>
      <title>準備率 {percent}%</title>
      <defs>
        <linearGradient id="prep-ring-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0a33ff" />
          <stop offset="0.55" stopColor="#e62f9a" />
          <stop offset="1" stopColor="#ff2e0d" />
        </linearGradient>
      </defs>
      <circle cx="46" cy="46" r={r} fill="none" className="stroke-muted" strokeWidth="9" />
      <circle
        cx="46"
        cy="46"
        r={r}
        fill="none"
        stroke="url(#prep-ring-gradient)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${c - filled}`}
        transform="rotate(-90 46 46)"
      />
      <text
        x="46"
        y="44"
        textAnchor="middle"
        className="fill-ink text-[20px] font-bold tabular-nums"
      >
        {percent}%
      </text>
      <text x="46" y="60" textAnchor="middle" className="fill-ink-3 text-[9px]">
        準備率
      </text>
    </svg>
  );
}

export function InterviewPrepPage({
  backendEnabled,
  profileId,
  profileRole,
}: {
  backendEnabled: boolean;
  profileId?: string | null;
  /** 認証済みの実ロール。 staff が受講者シェルへ切り替えていても student にはならない。 */
  profileRole?: ProfileRole;
}) {
  const [rows, setRows] = useState<LearnerInterviewQuestion[]>([]);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [audioNos, setAudioNos] = useState<number[]>([]);
  const [interviewDate, setInterviewDate] = useState<string | null>(null);
  const [interviewNote, setInterviewNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(backendEnabled);
  const [error, setError] = useState<string | null>(null);

  /**
   * 質問ごとの「サーバに保存されたと確認できた最後の状態」。 楽観更新の巻き戻し先は
   * 直前のスナップショットではなくこれを使う — 連続更新がすべて失敗した場合、
   * 直前スナップショットには 1 つ前の (保存されなかった) 楽観状態が入っており、
   * 戻しても未保存の進捗が画面に残ってしまうため。
   */
  const confirmedRef = useRef<Map<number, ConfirmedProgress>>(new Map());
  const seqRef = useRef<Map<number, number>>(new Map());

  /** サーバから読み直した行を確定値として覚え直す (参照しか触らないので依存は空)。 */
  const seedConfirmed = useCallback((rs: LearnerInterviewQuestion[]) => {
    const next = new Map<number, ConfirmedProgress>();
    for (const r of rs) {
      // 送信中のリクエストが後から解決してもこの読み直しを上書きしないよう、
      // 現在の世代番号を確定値の世代にする (seqRef 自体はリセットしない)。
      next.set(r.no, {
        seq: seqRef.current.get(r.no) ?? 0,
        status: r.progress_status ?? null,
        count: r.practiced_count ?? 0,
      });
    }
    confirmedRef.current = next;
  }, []);

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
        seedConfirmed(r.rows);
        setAssigned(r.assignedCategories);
        setAudioNos(r.audioNos);
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
  }, [backendEnabled, seedConfirmed]);

  const reloadRows = () => {
    if (!backendEnabled) return;
    fetchInterviewQuestions()
      .then((r) => {
        setRows(r.rows);
        seedConfirmed(r.rows);
        setAssigned(r.assignedCategories);
        setAudioNos(r.audioNos);
        setInterviewDate(r.interviewDate ?? null);
        setInterviewNote(r.note ?? null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  };

  const [mode, setMode] = useState<"home" | "quiz">("home");
  const [showFilters, setShowFilters] = useState(false);
  const [cat, setCat] = useState<string>("ALL");
  const [freq, setFreq] = useState<Freq>("A");
  const [query, setQuery] = useState("");

  /**
   * 進捗を記録できるのは認証済みの受講者本人だけ。 staff が受講者シェルへ切り替えて
   * 覗いているときは `s.role` が learner でも API 側は 403 を返すので、 送信も
   * 自己評価ボタンの表示も止める (毎回失敗してロールバックするのを防ぐ)。
   */
  const canRecordProgress = backendEnabled && profileRole === "student";

  /**
   * 学習ステータスの更新。 楽観更新してからサーバへ送り、 保存に失敗したら
   * その行だけ確定値へ戻す — 準備率が「保存された」と誤表示されるのを防ぐ
   * (リロードで消える進捗の上に練習を積み重ねてしまわないようにする)。
   */
  const reportProgress = (no: number, event: ProgressEvent) => {
    if (!canRecordProgress) return;
    const seq = (seqRef.current.get(no) ?? 0) + 1;
    seqRef.current.set(no, seq);
    let applied: Omit<ConfirmedProgress, "seq"> | undefined;
    setRows((rs) =>
      rs.map((r) => {
        if (r.no !== no) return r;
        const next: LearnerInterviewQuestion = {
          ...r,
          progress_status: event === "confident" ? "confident" : (r.progress_status ?? "read"),
          practiced_count: (r.practiced_count ?? 0) + (event === "read" ? 0 : 1),
        };
        applied = { status: next.progress_status ?? null, count: next.practiced_count ?? 0 };
        return next;
      }),
    );
    reportInterviewProgress(no, event)
      .then(() => {
        // 保存できた状態を確定値にする。 応答が前後しても古い世代では上書きしない。
        const current = confirmedRef.current.get(no);
        if (applied && (!current || current.seq < seq)) {
          confirmedRef.current.set(no, { seq, ...applied });
        }
      })
      .catch((e: unknown) => {
        // 後続の更新が同じ質問に走っていれば、 そちらの結果が正。 巻き戻さない。
        if (seqRef.current.get(no) === seq) {
          const baseline = confirmedRef.current.get(no);
          if (baseline) {
            setRows((rs) =>
              rs.map((r) =>
                r.no === no
                  ? { ...r, progress_status: baseline.status, practiced_count: baseline.count }
                  : r,
              ),
            );
          }
        }
        toast.error(
          e instanceof Error
            ? `進捗を保存できませんでした: ${e.message}`
            : "進捗を保存できませんでした",
        );
      });
  };

  // 準備率 (割当範囲全体の A 必修が対象。 画面のフィルタには影響されない)
  const stats = useMemo(
    () =>
      prepRate(rows.map((r) => ({ freq: r.freq, is_reverse: r.is_reverse, status: statusOf(r) }))),
    [rows],
  );

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
      // 練習は「答える」タブなので逆質問 (聞く質問) を出題しない。 自己評価ボタンも
      // 出ないうえ、 準備率の分母 (prepRate) からも外れていて件数が食い違うため。
      // 逆質問は準備タブのチェックリストで確認する。
      if (mode === "quiz" && d.is_reverse) return false;
      if (cat !== "ALL" && !d.categories.some((t) => tagMatches(t, cat))) return false;
      if (freq !== "ALL" && d.freq !== freq) return false;
      if (!q) return true;
      return [d.question, d.keywords, d.subcategory, d.intent].some((v) =>
        v?.toLowerCase().includes(q),
      );
    });
  }, [rows, cat, freq, query, mode]);

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

  const startPractice = () => {
    setFreq("A");
    setCat("ALL");
    setQuery("");
    setMode("quiz");
  };

  const filtersVisible = mode === "quiz" || showFilters;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-5 pb-4 border-b border-border">
        <h1 className="text-[19px] sm:text-[22px] tracking-tight font-semibold">面談対策</h1>
        <div className="flex items-center gap-1.5 sm:ml-auto">
          {(
            [
              ["home", "準備"],
              ["quiz", "練習"],
            ] as const
          ).map(([key, label]) => (
            <Chip key={key} active={mode === key} onClick={() => setMode(key)}>
              {label}
            </Chip>
          ))}
        </div>
      </div>

      {mode === "home" ? (
        <>
          {/* 面談ヒーローカード: いつ・何の面談・どこまで準備できたか */}
          <Card className="p-5 mb-3 flex flex-wrap items-center gap-6">
            <div className="flex-1 min-w-52 flex flex-col gap-1">
              <div className="text-[11px] font-bold tracking-[0.14em] text-brand-ink font-display">
                NEXT INTERVIEW
              </div>
              {interviewDate ? (
                <>
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="text-[26px] font-bold tracking-tight tabular-nums font-display">
                      {interviewDate}
                    </span>
                    <span className="text-[11.5px] px-2.5 py-[2px] rounded-full font-bold bg-warning/15 text-warning">
                      {formatInterviewCountdown(interviewDate)}
                    </span>
                  </div>
                  {interviewNote ? (
                    <p className="text-[12.5px] text-ink-2 leading-relaxed">{interviewNote}</p>
                  ) : null}
                </>
              ) : (
                <p className="text-[13px] text-ink-3 leading-relaxed">
                  面談予定は未登録です。営業が登録するとここに日付とカウントダウンが表示されます。
                </p>
              )}
              <p className="text-[11.5px] text-ink-4 mt-1">
                想定質問 {rows.length} 問 — 型を確認し、声に出して練習しましょう
              </p>
            </div>
            <div className="flex items-center gap-4">
              <PrepRateRing percent={stats.percent} />
              <div className="flex flex-col gap-0.5 text-[12px] text-ink-2">
                <span>
                  必修 {stats.total} 問中 <b className="text-[14px]">{stats.confident}</b> 問 練習OK
                </span>
                <span className="text-ink-3">
                  回答作成済み {stats.drafted} 問 ・ 型を読んだ {stats.read} 問 ・ 未着手{" "}
                  {stats.none} 問
                </span>
              </div>
            </div>
          </Card>

          {/* 次にやること: CTA は 1 つ */}
          <div className="flex items-center gap-2.5 mb-5 flex-wrap">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full sf-gradient-bg text-white text-[13.5px] font-bold cursor-pointer hover:brightness-105"
              onClick={startPractice}
            >
              <Play size={14} />
              今日の練習を始める — A 必修 {stats.total} 問
            </button>
            <button
              type="button"
              className="ml-auto text-[12px] text-ink-3 underline underline-offset-2 cursor-pointer"
              onClick={() => setShowFilters((v) => !v)}
            >
              {showFilters ? "絞り込みを閉じる" : "絞り込み・検索"}
            </button>
          </div>
        </>
      ) : null}

      {/* フィルタ (準備ホームでは折りたたみ、 練習では常時表示) */}
      {filtersVisible ? (
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
          {mode === "home" ? (
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="質問文・キーワードで検索"
              className="h-8 text-[13px]"
            />
          ) : null}
        </Card>
      ) : null}

      {pool.length === 0 ? (
        <Card className="p-12 text-center text-sm text-ink-3">
          条件に合う質問がありません。フィルターを緩めてください。
        </Card>
      ) : mode === "home" ? (
        <PrepChecklist
          pool={pool}
          backendEnabled={backendEnabled}
          profileId={profileId}
          audioNos={audioNos}
          onRefresh={reloadRows}
          onProgress={reportProgress}
        />
      ) : (
        <QuizMode
          pool={pool}
          backendEnabled={backendEnabled}
          canRecordProgress={canRecordProgress}
          profileId={profileId}
          audioNos={audioNos}
          onRefresh={reloadRows}
          onProgress={reportProgress}
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

/**
 * 準備ホームのチェックリスト: サブカテゴリごとにグループ化し、 質問ごとの
 * ステータスとグループの進捗を出す。 行を開くと 意図 → 回答の型 → 深掘り → NG → 評価軸。
 * 未着手の質問を開いたら「型を読んだ」を記録する。
 */
function PrepChecklist({
  pool,
  backendEnabled,
  profileId,
  audioNos,
  onRefresh,
  onProgress,
}: {
  pool: LearnerInterviewQuestion[];
  backendEnabled: boolean;
  profileId?: string | null;
  audioNos: number[];
  onRefresh: () => void;
  onProgress: (no: number, event: ProgressEvent) => void;
}) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const audioSet = useMemo(() => new Set(audioNos), [audioNos]);

  // 出現順を保ったままサブカテゴリでグループ化する
  const groups = useMemo(() => {
    const map = new Map<string, LearnerInterviewQuestion[]>();
    for (const d of pool) {
      const key = d.subcategory || "その他";
      const list = map.get(key);
      if (list) list.push(d);
      else map.set(key, [d]);
    }
    return [...map.entries()];
  }, [pool]);

  const toggleRow = (d: LearnerInterviewQuestion) => {
    const willOpen = !open[d.no];
    setOpen((s) => ({ ...s, [d.no]: willOpen }));
    // 初めて開いた質問は「型を読んだ」へ (confident は下がらない)
    if (willOpen && !d.is_reverse && statusOf(d) === "none") onProgress(d.no, "read");
  };

  return (
    <div className="flex flex-col gap-5">
      {groups.map(([subcategory, items]) => {
        const aItems = items.filter((d) => d.freq === "A" && !d.is_reverse);
        const okCount = aItems.filter((d) => statusOf(d) === "confident").length;
        return (
          <div key={subcategory} className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5 px-1">
              <span className="text-[13px] font-semibold">{subcategory}</span>
              {aItems.length > 0 ? (
                <>
                  <div className="w-32 h-[5px] rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full sf-gradient-bg"
                      style={{ width: `${Math.round((okCount / aItems.length) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11.5px] text-ink-3 tabular-nums">
                    {okCount}/{aItems.length} 練習OK
                  </span>
                </>
              ) : null}
            </div>
            {items.map((d) => (
              <Card key={d.no} className="p-0 overflow-hidden">
                <button
                  type="button"
                  className="w-full text-left p-3.5 flex items-center gap-2.5 cursor-pointer hover:bg-sunken transition-colors"
                  onClick={() => toggleRow(d)}
                >
                  {d.is_reverse ? (
                    <span className="text-[10.5px] px-1.5 py-[1px] rounded bg-brand/10 text-brand font-semibold shrink-0">
                      聞く質問
                    </span>
                  ) : (
                    <PrepStatusPill status={statusOf(d)} />
                  )}
                  <FreqBadge freq={d.freq} />
                  {d.has_pending_draft ? (
                    <span className="text-[10.5px] px-1.5 py-[1px] rounded bg-warning/15 text-warning font-semibold shrink-0">
                      新案あり
                    </span>
                  ) : null}
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13.5px] font-medium">{d.question}</span>
                    <span className="block text-[11.5px] text-ink-4 mt-0.5">
                      {d.categories.join("、")}
                      {d.time ? ` ・ 目安 ${d.time}` : ""}
                    </span>
                  </span>
                  {audioSet.has(d.no) ? (
                    <Volume2 size={14} className="shrink-0 text-ink-4" aria-label="音声あり" />
                  ) : null}
                  {open[d.no] ? (
                    <ChevronDown size={15} className="shrink-0 text-ink-4" />
                  ) : (
                    <ChevronRight size={15} className="shrink-0 text-ink-4" />
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
      })}
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

/**
 * 音声練習: 質問を聞く (admin が事前生成した読み上げ音声) → 録音しながら声に出して
 * 答える → Whisper の文字起こしで振り返る。 `key={question.no}` で質問ごとに状態を捨てる。
 */
const ttsUrlCache = new Map<number, string>();

function VoicePractice({
  q,
  hasAudio,
  onRecordStart,
  onRecordStop,
}: {
  q: LearnerInterviewQuestion;
  hasAudio: boolean;
  onRecordStart: () => void;
  onRecordStop: () => void;
}) {
  const [ttsState, setTtsState] = useState<"idle" | "loading" | "playing">("idle");
  const [recState, setRecState] = useState<"idle" | "recording" | "transcribing" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [recUrl, setRecUrl] = useState<string | null>(null);
  /** マイク取得中 (許可ダイアログ表示中を含む)。 ボタンを塞いで二重取得を防ぐ。 */
  const [acquiring, setAcquiring] = useState(false);
  const acquiringRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  /**
   * 音声取得は非同期なので、 fetch 中に質問が変わる (= このインスタンスが unmount される)
   * ことがある。 その場合 audioRef はまだ空でクリーンアップが効かず、 後から解決した
   * 前の質問の音声が新しい質問に重なって鳴ってしまうため、 再生前にこのフラグで弾く。
   */
  const aliveRef = useRef(true);
  // クリーンアップから親のタイマー停止を呼ぶための最新参照 (依存配列で再登録しない)。
  const onRecordStopRef = useRef(onRecordStop);
  onRecordStopRef.current = onRecordStop;

  // アンマウント時: 再生・録音を止めてマイクを解放する。
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      audioRef.current?.pause();
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        // 録音中に「次の問題」へ移った場合:
        //   1. onstop を外してから止める — 旧質問の文字起こし API を裏で叩かせない
        //   2. 親のタイマーを止める — 次の問題でカウントが走り続けるのを防ぐ
        rec.onstop = null;
        rec.stop();
        onRecordStopRef.current();
      }
      for (const track of rec?.stream.getTracks() ?? []) track.stop();
    };
  }, []);

  // 録音の objectURL は差し替え時・アンマウント時に解放する。
  useEffect(() => {
    return () => {
      if (recUrl) URL.revokeObjectURL(recUrl);
    };
  }, [recUrl]);

  const playTts = async () => {
    if (ttsState === "playing") {
      audioRef.current?.pause();
      setTtsState("idle");
      return;
    }
    // 取得中の再クリックは無視する。 2 本の Audio が同時に鳴り、 audioRef に残る
    // 最後の 1 本しか停止できなくなるため (ボタン側も loading 中は disabled)。
    if (ttsState === "loading") return;
    setError(null);
    try {
      let url = ttsUrlCache.get(q.no);
      if (!url) {
        setTtsState("loading");
        const blob = await fetchQuestionAudio(q.no);
        url = URL.createObjectURL(blob);
        ttsUrlCache.set(q.no, url);
      }
      // fetch 中に質問が切り替わっていたら再生しない (前の質問が重なって鳴るのを防ぐ)。
      if (!aliveRef.current) return;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setTtsState("idle");
      await audio.play();
      if (!aliveRef.current) {
        audio.pause();
        return;
      }
      setTtsState("playing");
    } catch (e) {
      if (!aliveRef.current) return;
      setTtsState("idle");
      setError(e instanceof Error ? e.message : "音声の再生に失敗しました");
    }
  };

  const finishRecording = async (rec: MediaRecorder) => {
    for (const track of rec.stream.getTracks()) track.stop();
    // 質問が切り替わった後に発火した場合は、 アップロードも状態更新もしない。
    if (!aliveRef.current) return;
    const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
    if (blob.size === 0) {
      setRecState("idle");
      return;
    }
    setRecUrl(URL.createObjectURL(blob));
    setRecState("transcribing");
    try {
      const r = await transcribeRecording(q.no, blob);
      setTranscript(r.transcript || "（無音、または聞き取れませんでした）");
    } catch (e) {
      // 文字起こしに失敗しても録音自体は聞き直せる。
      setError(e instanceof Error ? e.message : "文字起こしに失敗しました");
    } finally {
      setRecState("done");
    }
  };

  const startRecording = async () => {
    // マイク許可のダイアログ中は recState が idle のままなので、 連打すると
    // getUserMedia が複数走って recorderRef が上書きされ、 先に立ち上がった
    // レコーダーを止める手段が無くなる。 取得中はここで弾く (ボタンも disabled)。
    if (acquiringRef.current) return;
    acquiringRef.current = true;
    setAcquiring(true);
    setError(null);
    setTranscript(null);
    /** 録音開始まで漕ぎ着けなかった場合に解放するストリーム (成功したら undefined にする)。 */
    let pending: MediaStream | undefined;
    try {
      pending = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 許可のダイアログ中に「次の問題」へ移ると、 クリーンアップは recorderRef が
      // 空のまま走り終えている。 ここで弾かないとマイクを掴んだまま録音が始まり、
      // 停止する手段も画面に無くなる (マイクが開きっぱなしになる)。
      if (!aliveRef.current) return;
      // Chromium/Firefox は webm/opus、 Safari は mp4 (m4a)。 Whisper はどちらも受け付ける。
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      const rec = new MediaRecorder(pending, mimeType ? { mimeType } : undefined);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        void finishRecording(rec);
      };
      rec.start();
      // ここから先はレコーダー側 (停止・アンマウント) がストリームを解放する。
      pending = undefined;
      setRecState("recording");
      onRecordStart();
    } catch {
      if (aliveRef.current) {
        setError("マイクを利用できません。ブラウザのマイク許可を確認してください");
      }
    } finally {
      // 中断・MediaRecorder の生成失敗・start() の失敗のいずれでもマイクを解放する。
      for (const track of pending?.getTracks() ?? []) track.stop();
      acquiringRef.current = false;
      if (aliveRef.current) setAcquiring(false);
    }
  };

  const stopRecording = () => {
    onRecordStop();
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  };

  const voiceBtn =
    "px-2.5 py-1 rounded-sm border border-border text-[12px] cursor-pointer hover:bg-sunken inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-default";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        {hasAudio ? (
          <button
            type="button"
            className={voiceBtn}
            disabled={ttsState === "loading"}
            onClick={() => void playTts()}
          >
            {ttsState === "loading" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Volume2 size={12} />
            )}
            {ttsState === "playing" ? "停止" : "質問を聞く"}
          </button>
        ) : null}
        {recState === "recording" ? (
          <button type="button" className={voiceBtn} onClick={stopRecording}>
            <Square size={12} />
            停止して文字起こし
          </button>
        ) : (
          <button
            type="button"
            className={voiceBtn}
            disabled={recState === "transcribing" || acquiring}
            onClick={() => void startRecording()}
          >
            {acquiring ? <Loader2 size={12} className="animate-spin" /> : <Mic size={12} />}
            {acquiring
              ? "マイクを準備中…"
              : recState === "done"
                ? "もう一度録音"
                : "録音して答える"}
          </button>
        )}
        {recState === "recording" ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-destructive">
            <span className="size-2 rounded-full bg-destructive animate-pulse" />
            録音中 — 声に出して答えましょう
          </span>
        ) : null}
        {recState === "transcribing" ? (
          <span className="inline-flex items-center gap-1 text-[12px] text-ink-3">
            <Loader2 size={12} className="animate-spin" />
            文字起こし中…
          </span>
        ) : null}
      </div>
      {error ? <p className="text-[12px] text-destructive">{error}</p> : null}
      {recUrl && recState === "done" ? (
        <div className="flex flex-col gap-1.5 p-3 rounded-sm border border-border bg-sunken/40">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4">
            Your Answer ・ あなたの回答（文字起こし）
          </div>
          {/* biome-ignore lint/a11y/useMediaCaption: 受講者自身の練習録音で、 内容は直下に文字起こしとして表示している */}
          <audio src={recUrl} controls className="h-8 w-full max-w-md" />
          {transcript ? (
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{transcript}</p>
          ) : null}
          <p className="text-[11.5px] text-ink-4">
            回答例と見比べて、抜けた要素や言い淀みがないか確認しましょう。
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** 練習モード: タイマー付きフラッシュカード + 音声練習 + 自己評価。 */
function QuizMode({
  pool,
  backendEnabled,
  canRecordProgress,
  profileId,
  audioNos,
  onRefresh,
  onProgress,
}: {
  pool: LearnerInterviewQuestion[];
  backendEnabled: boolean;
  /** 自己評価を保存できるか (staff の受講者プレビューでは false)。 */
  canRecordProgress: boolean;
  profileId?: string | null;
  audioNos: number[];
  onRefresh: () => void;
  onProgress: (no: number, event: ProgressEvent) => void;
}) {
  const [order, setOrder] = useState<number[]>(() => shuffle(pool.map((d) => d.no)));
  const [qi, setQi] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sec, setSec] = useState(0);
  const [running, setRunning] = useState(false);

  // フィルタが変わったら出題順を作り直す。 進捗の楽観更新で pool の参照だけが変わる
  // ケースでは作り直さない (自己評価のたびにシャッフルされるのを防ぐ)。
  const poolKey = pool.map((d) => d.no).join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: poolKey が pool の同一性を代表する
  useEffect(() => {
    setOrder(shuffle(poolKey === "" ? [] : poolKey.split(",").map(Number)));
    setQi(0);
    setRevealed(false);
    setSec(0);
    setRunning(false);
  }, [poolKey]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const audioSet = useMemo(() => new Set(audioNos), [audioNos]);
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

      {backendEnabled ? (
        <VoicePractice
          key={cur.no}
          q={cur}
          hasAudio={audioSet.has(cur.no)}
          onRecordStart={() => {
            // 録音開始と同時にタイマーも回す (面談本番の時間感覚をつける)。
            setSec(0);
            setRunning(true);
          }}
          onRecordStop={() => setRunning(false)}
        />
      ) : null}

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
            // 回答例を開いた = 型を読んだ (confident は下がらない)
            if (!cur.is_reverse && statusOf(cur) === "none") onProgress(cur.no, "read");
          }}
        >
          まず声に出して答える → 回答例を表示
        </button>
      ) : (
        <>
          <QuestionDetail
            d={cur}
            backendEnabled={backendEnabled}
            profileId={profileId}
            onRefresh={onRefresh}
          />
          {canRecordProgress && !cur.is_reverse ? (
            <div className="flex items-center gap-2.5 border-t border-border pt-4">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 h-11 px-6 rounded-full border border-border-2 text-[13.5px] cursor-pointer hover:bg-sunken"
                onClick={() => {
                  onProgress(cur.no, "practiced");
                  move(1);
                }}
              >
                もう一度
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 h-11 px-7 rounded-full sf-gradient-bg text-white text-[13.5px] font-bold cursor-pointer hover:brightness-105"
                onClick={() => {
                  onProgress(cur.no, "confident");
                  move(1);
                }}
              >
                できた — 次へ
              </button>
              <span className="ml-auto text-[11.5px] text-ink-4">
                「できた」で練習OKになり準備率に反映されます
              </span>
            </div>
          ) : null}
        </>
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
