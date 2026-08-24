import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Play, Volume2 } from "@/lib/icons";
import { Card } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import type { LearnerInterviewQuestion, ProgressEvent } from "@/lib/interview-prep-api";
import type { FixNote } from "@falcon/shared/interview/fix-notes";
import { summarizeFixNotes } from "@falcon/shared/interview/fix-notes";
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
  reportInterviewProgress,
  savePersonalAnswerTemplate,
} from "@/lib/interview-prep-api";
import { FixNoteEditor, InterviewVoiceSession } from "@/components/learner/InterviewVoiceSession";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/ui/chip";
import type { Role } from "@/data/types";
import { interviewPrepTabIdsForRole } from "@/lib/skill-sheet-ui";
import { SkillSheetRegistrationPanel } from "@/components/skill-sheet/SkillSheetRegistrationPanel";

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

const INTERVIEW_PREP_TAB_LABELS: Record<string, string> = {
  questions: "想定質問",
  "skill-sheet": "スキルシート",
};

export function InterviewPrepPage({
  backendEnabled,
  profileId,
  profileRole,
  shellRole = "learner",
}: {
  backendEnabled: boolean;
  profileId?: string | null;
  /** 認証済みの実ロール。 staff が受講者シェルへ切り替えていても student にはならない。 */
  profileRole?: ProfileRole;
  shellRole?: Role;
}) {
  const prepTabs = interviewPrepTabIdsForRole(shellRole);
  const [prepTab, setPrepTab] = useState<string>(prepTabs[0] ?? "questions");
  const [rows, setRows] = useState<LearnerInterviewQuestion[]>([]);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [audioNos, setAudioNos] = useState<number[]>([]);
  const [audioSegments, setAudioSegments] = useState<string[]>([]);
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
        setAudioSegments(r.audioSegments);
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
        setAudioSegments(r.audioSegments);
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

  /**
   * 改善点メモの追加・消し込みを行に反映する。 追加も消し込みも更新後の 1 行が返るので、
   * 同じ id を差し替えるだけで済む (全件読み直すと練習中の出題順が作り直される)。
   */
  const applyFixNote = (note: FixNote) => {
    setRows((rs) =>
      rs.map((r) => {
        if (r.no !== note.question_no) return r;
        const notes = r.fix_notes ?? [];
        const next = notes.some((n) => n.id === note.id)
          ? notes.map((n) => (n.id === note.id ? note : n))
          : [...notes, note];
        return { ...r, fix_notes: next };
      }),
    );
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

  if (prepTab === "skill-sheet" && profileId) {
    return (
      <>
        <InterviewPrepHeader
          prepTabs={prepTabs}
          prepTab={prepTab}
          onPrepTabChange={setPrepTab}
          mode={mode}
          onModeChange={setMode}
          showQuestionModes={false}
        />
        <SkillSheetRegistrationPanel
          backendEnabled={backendEnabled}
          profileRole={profileRole}
          shellRole={shellRole}
          currentUserId={profileId}
          targetProfileId={profileId}
        />
      </>
    );
  }

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
      <InterviewPrepHeader
        prepTabs={prepTabs}
        prepTab={prepTab}
        onPrepTabChange={setPrepTab}
        mode={mode}
        onModeChange={setMode}
        showQuestionModes
      />

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
          canRecordProgress={canRecordProgress}
          profileId={profileId}
          audioNos={audioNos}
          onRefresh={reloadRows}
          onProgress={reportProgress}
          onFixNoteChange={applyFixNote}
        />
      ) : (
        <InterviewVoiceSession
          pool={pool}
          audioSegments={audioSegments}
          backendEnabled={backendEnabled}
          canRecordProgress={canRecordProgress}
          onProgress={reportProgress}
          onFixNoteChange={applyFixNote}
        />
      )}
    </>
  );
}

function InterviewPrepHeader({
  prepTabs,
  prepTab,
  onPrepTabChange,
  mode,
  onModeChange,
  showQuestionModes,
}: {
  prepTabs: string[];
  prepTab: string;
  onPrepTabChange: (tab: string) => void;
  mode: "home" | "quiz";
  onModeChange: (mode: "home" | "quiz") => void;
  showQuestionModes: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-5 pb-4 border-b border-border">
      <h1 className="text-[19px] sm:text-[22px] tracking-tight font-semibold">面談対策</h1>
      <div className="flex items-center gap-1.5 flex-wrap sm:ml-auto">
        {prepTabs.map((tabId) => (
          <Chip key={tabId} active={prepTab === tabId} onClick={() => onPrepTabChange(tabId)}>
            {INTERVIEW_PREP_TAB_LABELS[tabId] ?? tabId}
          </Chip>
        ))}
        {showQuestionModes
          ? (
              [
                ["home", "準備"],
                ["quiz", "練習"],
              ] as const
            ).map(([key, label]) => (
              <Chip key={key} active={mode === key} onClick={() => onModeChange(key)}>
                {label}
              </Chip>
            ))
          : null}
      </div>
    </div>
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
  canRecordProgress,
  profileId,
  audioNos,
  onRefresh,
  onProgress,
  onFixNoteChange,
}: {
  pool: LearnerInterviewQuestion[];
  backendEnabled: boolean;
  /** 改善点メモを編集できるか (staff の受講者プレビューでは false)。 */
  canRecordProgress: boolean;
  profileId?: string | null;
  audioNos: number[];
  onRefresh: () => void;
  onProgress: (no: number, event: ProgressEvent) => void;
  onFixNoteChange: (note: FixNote) => void;
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
                  {summarizeFixNotes(d.fix_notes ?? []).unresolved > 0 ? (
                    <span className="text-[10.5px] px-1.5 py-[1px] rounded-full bg-warning/15 text-warning font-semibold shrink-0 tabular-nums">
                      改善点 {summarizeFixNotes(d.fix_notes ?? []).unresolved}
                    </span>
                  ) : null}
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
                    canRecordProgress={canRecordProgress}
                    profileId={profileId}
                    onRefresh={onRefresh}
                    onFixNoteChange={onFixNoteChange}
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
  canRecordProgress,
  profileId,
  onRefresh,
  onFixNoteChange,
}: {
  d: LearnerInterviewQuestion;
  backendEnabled: boolean;
  canRecordProgress: boolean;
  profileId?: string | null;
  onRefresh: () => void;
  onFixNoteChange: (note: FixNote) => void;
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
      {/* 改善点メモの履歴 (音声セッションの振り返りで書いたもの。 ここでも消し込める) */}
      {backendEnabled && !d.is_reverse ? (
        <FixNoteEditor
          questionNo={d.no}
          notes={d.fix_notes ?? []}
          canEdit={canRecordProgress}
          onFixNoteChange={onFixNoteChange}
          compact
        />
      ) : null}
    </div>
  );
}
