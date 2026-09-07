import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Play, Volume2 } from "@/lib/icons";
import { Card } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import type { LearnerInterviewQuestion, ProgressEvent } from "@/lib/interview-prep-api";
import type { FixNote } from "@stella/shared/interview/fix-notes";
import { summarizeFixNotes } from "@stella/shared/interview/fix-notes";
import type { ProfileRole } from "@stella/shared/cms/types";
import { canPracticeInterviewPrep } from "@stella/shared/admin/types";
import { ASSIGNABLE_CATEGORIES, COMMON_CATEGORY } from "@stella/shared/interview/types";
import { tagMatches } from "@stella/shared/interview/filter";
import {
  deriveQuestionPrepStatus,
  prepRate,
  type QuestionPrepStatus,
} from "@stella/shared/interview/progress";
import { PrepStatusPill } from "@/components/interview/PrepStatusPill";
import {
  type ActiveSetSummary,
  adoptPersonalAnswerTemplateDraft,
  fetchInterviewQuestions,
  finishPracticeSet,
  type PracticeSet,
  type PracticeSetSummary,
  reportInterviewProgress,
  savePersonalAnswerTemplate,
  startPracticeSet,
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

/** 消化状況から派生フィールド (残り・次の質問・完了判定) を組み直す。 */
function withSetCounts(
  set: PracticeSet,
  completedNos: number[],
  confidentNos: number[],
): PracticeSet {
  const remaining = set.question_nos.filter((v) => !completedNos.includes(v));
  return {
    ...set,
    completed_nos: completedNos,
    confident_nos: confidentNos,
    completed: completedNos.length,
    remaining: remaining.length,
    next_no: remaining[0] ?? null,
    finished: remaining.length === 0,
  };
}

/** 自己評価 1 件をセットに反映する (楽観更新。 サーバ側も同じ形で記録する)。 */
function applyAnswerToSet(set: PracticeSet, no: number, confident: boolean): PracticeSet {
  if (!set.question_nos.includes(no)) return set;
  const completed = set.completed_nos.includes(no) ? set.completed_nos : [...set.completed_nos, no];
  const confidentNos = confident
    ? set.confident_nos.includes(no)
      ? set.confident_nos
      : [...set.confident_nos, no]
    : set.confident_nos.filter((v) => v !== no);
  return withSetCounts(set, completed, confidentNos);
}

/**
 * 保存に失敗した自己評価をセットから取り消す。 楽観更新のまま残すと、 その質問は
 * 消化済みとして出題から外れ、 セット終了時にサーバ側では「未回答」で確定してしまう
 * (その場でやり直すこともできない)。 取り消せば未評価に戻り、 出題に戻ってくる。
 */
function revertAnswerInSet(
  set: PracticeSet,
  no: number,
  wasCompleted: boolean,
  wasConfident: boolean,
): PracticeSet {
  if (!set.question_nos.includes(no)) return set;
  const completed = wasCompleted ? set.completed_nos : set.completed_nos.filter((v) => v !== no);
  const confidentNos = wasConfident
    ? set.confident_nos.includes(no)
      ? set.confident_nos
      : [...set.confident_nos, no]
    : set.confident_nos.filter((v) => v !== no);
  return withSetCounts(set, completed, confidentNos);
}

/** セット終了サマリ: できた n/10 と準備率の伸び、 続けるか終了するか。 */
function PracticeSetSummaryCard({
  summary,
  starting,
  onContinue,
  onExit,
}: {
  summary: PracticeSetSummary;
  starting: boolean;
  onContinue: () => void;
  onExit: () => void;
}) {
  return (
    <Card className="p-6 flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="text-[11px] font-bold tracking-[0.14em] text-brand-ink font-display">
          SET COMPLETE
        </div>
        <div className="text-[24px] font-bold tracking-tight font-display tabular-nums">
          できた {summary.confident} / {summary.total} 問
        </div>
        <p className="text-[12.5px] text-ink-2">
          もう一度 {summary.again} 問{summary.skipped > 0 ? ` ・ 未回答 ${summary.skipped} 問` : ""}
        </p>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <PrepRateRing percent={summary.currentPercent} />
        <div className="flex flex-col gap-0.5 text-[12.5px] text-ink-2">
          <span className="tabular-nums">
            準備率 {summary.startedPercent}% →{" "}
            <b className="text-[15px]">{summary.currentPercent}%</b>
          </span>
          <span
            className={cn(
              "tabular-nums font-semibold",
              summary.gainedPercent > 0 ? "text-success" : "text-ink-4",
            )}
          >
            {summary.gainedPercent > 0
              ? `このセットで +${summary.gainedPercent} ポイント`
              : "今回は準備率の変化なし — 「できた」を付けると上がります"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2.5 flex-wrap border-t border-border pt-4">
        <button
          type="button"
          disabled={starting}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full sf-gradient-bg text-white text-[13.5px] font-bold cursor-pointer hover:brightness-105 disabled:opacity-50 disabled:cursor-default"
          onClick={onContinue}
        >
          <Play size={14} />
          {starting ? "次のセットを準備中…" : "もう 1 セット続ける"}
        </button>
        <button
          type="button"
          className="px-4 py-2.5 rounded-full border border-border text-[13px] cursor-pointer hover:bg-sunken"
          onClick={onExit}
        >
          今日はここまでにする
        </button>
      </div>
    </Card>
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
  /**
   * 自分の練習ぶんを取りに行くときに渡す profileId。
   *
   * 受講者は付けても付けなくても同じ (サーバは caller 自身を見る) が、 管理者は
   * staff 判定のまま質問全件を返されてしまう — 自分の進捗・個別の型が付いた
   * 「受講者と同じ」ペイロードを受け取るために明示する。 講師 / 営業は面談対策の
   * 対象者ではないので付けず、 従来どおり staff の全件表示にする。
   */
  const practiceProfileId =
    profileRole !== undefined && canPracticeInterviewPrep(profileRole) ? (profileId ?? null) : null;

  const prepTabs = interviewPrepTabIdsForRole(shellRole);
  const [prepTab, setPrepTab] = useState<string>(prepTabs[0] ?? "questions");
  const [rows, setRows] = useState<LearnerInterviewQuestion[]>([]);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [audioNos, setAudioNos] = useState<number[]>([]);
  const [interviewDate, setInterviewDate] = useState<string | null>(null);
  const [interviewNote, setInterviewNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(backendEnabled);
  const [error, setError] = useState<string | null>(null);
  /** 中断中のセット (準備ホームの「途中のセットを再開」)。 */
  const [activeSet, setActiveSet] = useState<ActiveSetSummary | null>(null);
  /** 実行中のセット (Issue #235)。 サブ導線の「全問からランダム」では null。 */
  const [practiceSet, setPracticeSet] = useState<PracticeSet | null>(null);
  const [setSummary, setSetSummary] = useState<PracticeSetSummary | null>(null);
  /**
   * セット取得時にサーバが返した質問番号 (= いま出題してよいもの)。 セット作成後に
   * 割当から外された質問はここに入らないので、 出題対象の判定はこちらを正とする。
   */
  const [setVisibleNos, setSetVisibleNos] = useState<number[]>([]);
  /**
   * 最新のセット。 終了処理は待ち合わせのあとに走るので、 その時点の状態
   * (巻き戻しで未評価に戻った質問があるか) を state のスナップショットではなく
   * これで見る。
   */
  const practiceSetRef = useRef<PracticeSet | null>(null);
  const [startingSet, setStartingSet] = useState(false);
  /** セット終了の確定待ち。 その間は次のセットを始めさせない。 */
  const [finishingSet, setFinishingSet] = useState(false);

  /**
   * 質問ごとの「サーバに保存されたと確認できた最後の状態」。 楽観更新の巻き戻し先は
   * 直前のスナップショットではなくこれを使う — 連続更新がすべて失敗した場合、
   * 直前スナップショットには 1 つ前の (保存されなかった) 楽観状態が入っており、
   * 戻しても未保存の進捗が画面に残ってしまうため。
   */
  const confirmedRef = useRef<Map<number, ConfirmedProgress>>(new Map());
  const seqRef = useRef<Map<number, number>>(new Map());
  /**
   * 送信中の進捗更新。 セット終了サマリはサーバが保存済みの回答から作るので、
   * 最後の 1 問の自己評価が届く前に終了すると「できた n/10」が 1 問ぶん少なくなる。
   * 終了はこの Promise の解決を待ってから投げる。
   */
  const pendingProgressRef = useRef<Promise<unknown>>(Promise.resolve());
  practiceSetRef.current = practiceSet;

  /** サーバから読み直した行を確定値として覚え直す (参照しか触らないので依存は空)。 */
  /**
   * サーバから受け取った行だけを確定値として覚え直す (全体は作り直さない)。 セット取得で
   * 増えた行をここに入れておかないと、 その質問の保存に失敗したときに巻き戻し先が無く、
   * 保存されていない進捗が準備率に残り続ける。
   */
  const confirmRows = useCallback((rs: LearnerInterviewQuestion[]) => {
    for (const r of rs) {
      // 送信中のリクエストが後から解決してもこの読み直しを上書きしないよう、
      // 現在の世代番号を確定値の世代にする (seqRef 自体はリセットしない)。
      confirmedRef.current.set(r.no, {
        seq: seqRef.current.get(r.no) ?? 0,
        status: r.progress_status ?? null,
        count: r.practiced_count ?? 0,
      });
    }
  }, []);

  const seedConfirmed = useCallback(
    (rs: LearnerInterviewQuestion[]) => {
      confirmedRef.current = new Map<number, ConfirmedProgress>();
      confirmRows(rs);
    },
    [confirmRows],
  );

  useEffect(() => {
    let cancelled = false;
    if (!backendEnabled) {
      // デモ (fixtures) モード: 全件表示。質問データ(200KB超)はメインチャンクに含めない。
      import("@stella/shared/interview/questions").then(({ INTERVIEW_QUESTIONS }) => {
        if (cancelled) return;
        setRows(INTERVIEW_QUESTIONS);
        setAssigned([...ASSIGNABLE_CATEGORIES]);
      });
      return () => {
        cancelled = true;
      };
    }
    fetchInterviewQuestions(practiceProfileId)
      .then((r) => {
        if (cancelled) return;
        setRows(r.rows);
        seedConfirmed(r.rows);
        setAssigned(r.assignedCategories);
        setAudioNos(r.audioNos);
        setInterviewDate(r.interviewDate ?? null);
        setInterviewNote(r.note ?? null);
        setActiveSet(r.activeSet ?? null);
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
  }, [backendEnabled, practiceProfileId, seedConfirmed]);

  /**
   * 質問を読み直す。 送信中の自己評価が終わってから投げる — 先に読み直すと、 まだ届いて
   * いない評価を含まない状態で行と `activeSet` を差し替えてしまい、 後から成功した評価は
   * 確定値 (ref) を更新するだけなので、 準備率と残り問数が古いまま残る。
   */
  const reloadRows = () => {
    if (!backendEnabled) return;
    pendingProgressRef.current
      .then(() => fetchInterviewQuestions(practiceProfileId))
      .then((r) => {
        setRows(r.rows);
        seedConfirmed(r.rows);
        setAssigned(r.assignedCategories);
        setAudioNos(r.audioNos);
        setInterviewDate(r.interviewDate ?? null);
        setInterviewNote(r.note ?? null);
        setActiveSet(r.activeSet ?? null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  };

  /** home=準備 / set=今日の練習セット / quiz=全問からランダム (サブ導線)。 */
  const [mode, setMode] = useState<"home" | "quiz" | "set">("home");
  const [showFilters, setShowFilters] = useState(false);
  const [cat, setCat] = useState<string>("ALL");
  const [freq, setFreq] = useState<Freq>("A");
  const [query, setQuery] = useState("");

  /**
   * 進捗を記録できるのは面談対策の対象者本人 (受講者・管理者) だけ。 講師 / 営業が
   * 受講者シェルへ切り替えて覗いているときは `s.role` が learner でも API 側は 403 を
   * 返すので、 送信も自己評価ボタンの表示も止める (毎回失敗してロールバックするのを防ぐ)。
   */
  const canRecordProgress =
    backendEnabled && profileRole !== undefined && canPracticeInterviewPrep(profileRole);

  /**
   * 学習ステータスの更新。 楽観更新してからサーバへ送り、 保存に失敗したら
   * その行だけ確定値へ戻す — 準備率が「保存された」と誤表示されるのを防ぐ
   * (リロードで消える進捗の上に練習を積み重ねてしまわないようにする)。
   */
  const reportProgress = (no: number, event: ProgressEvent) => {
    if (!canRecordProgress) return;
    // セット実行中の自己評価はセットの消化としても記録する (中断・再開と終了サマリ)。
    const setId = mode === "set" && event !== "read" ? (practiceSet?.id ?? null) : null;
    // 保存に失敗したときに楽観更新を戻せるよう、 反映前の消化状況を控える。
    const wasCompleted = practiceSet?.completed_nos.includes(no) ?? false;
    const wasConfident = practiceSet?.confident_nos.includes(no) ?? false;
    if (setId && practiceSet) {
      setPracticeSet((prev) =>
        prev && prev.id === setId ? applyAnswerToSet(prev, no, event === "confident") : prev,
      );
    }
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
    /** セットへの記録が失敗したときに、 その 1 問だけ楽観更新を戻す。 */
    const revertSetAnswer = () => {
      if (!setId) return;
      setPracticeSet((prev) =>
        prev && prev.id === setId ? revertAnswerInSet(prev, no, wasCompleted, wasConfident) : prev,
      );
    };

    const request = reportInterviewProgress(no, event, setId)
      .then((result) => {
        // 保存できた状態を確定値にする。 応答が前後しても古い世代では上書きしない。
        const current = confirmedRef.current.get(no);
        if (applied && (!current || current.seq < seq)) {
          confirmedRef.current.set(no, { seq, ...applied });
        }
        /**
         * 進捗自体は保存できたが、 セットへの記録だけ落ちた場合 (競合・別タブでの終了)。
         * ここで再評価を促してはいけない — もう一度評価すると SM-2 と練習回数が二重に
         * 進み、 1 回の「できた」が rep 2 (6 日後) まで飛んでしまう。 練習の記録は
         * 残っているので、 セットの集計にだけ入らなかったことを伝えるに留める。
         */
        if (setId && !result.set_recorded) {
          toast.warning(
            "この回答はセットの集計に反映されませんでした（練習の記録は保存されています）",
          );
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
          // セットの消化も戻す。 残したままだとこの質問が飛ばされ、 終了時に「未回答」で確定する。
          revertSetAnswer();
        }
        toast.error(
          e instanceof Error
            ? `進捗を保存できませんでした: ${e.message}`
            : "進捗を保存できませんでした",
        );
      });
    pendingProgressRef.current = Promise.allSettled([pendingProgressRef.current, request]);
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

  /**
   * セットの出題 (サーバが決めた順番のまま。 改善点メモの更新は rows 側に入る)。
   *
   * 出題してよい質問は「セット取得時にサーバが返した行」が正。 手元の rows には一覧を
   * 取得した時点の質問が残っており、 その後に割当から外された質問も含まれる。 rows だけで
   * 引くと、 外された質問を出題してしまい、 自己評価が API の可視性検査で 403 になる。
   */
  const setPool = useMemo(() => {
    if (!practiceSet) return [];
    const allowed = new Set(setVisibleNos);
    const byNo = new Map(rows.map((r) => [r.no, r]));
    return practiceSet.question_nos.flatMap((no) => {
      if (!allowed.has(no)) return [];
      const row = byNo.get(no);
      return row ? [row] : [];
    });
  }, [practiceSet, rows, setVisibleNos]);

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

  /** サブ導線: 割当範囲の A 必修を全問シャッフルで回す (従来の練習)。 */
  const startRandomPractice = () => {
    setFreq("A");
    setCat("ALL");
    setQuery("");
    setMode("quiz");
  };

  /** セットを終了してサマリを出す (全問終えた場合も途中で切り上げた場合も同じ)。 */
  /**
   * セットを終了してサマリを出す。 `requireComplete` は「全問答え終えたので自動で
   * 終了する」経路で立てる — 直前の自己評価が保存できず巻き戻された場合は、 終了せずに
   * セッションへ戻す (終了してしまうとその質問は「未回答」で確定し、 やり直せない)。
   * 受講者が明示的に切り上げる経路では立てない。
   *
   * 画面の状態は終了が確定してから片付ける。 先に片付けると、 終了リクエスト (と
   * 待ち合わせている自己評価) が飛んでいる間に新しいセットを始められてしまい、 サーバは
   * まだ進行中の同じセットを返して再開扱いになる。 その後に届いた終了が裏から done に
   * するため、 以後の自己評価は進捗には入るのにセットには記録されない。
   */
  const finishSetById = (id: string, opts: { requireComplete?: boolean } = {}) => {
    if (finishingSet) return;
    setFinishingSet(true);
    // 直前の自己評価が保存されてから終了する (サマリの「できた n/10」がずれないように)。
    pendingProgressRef.current
      .then(() => {
        const current = practiceSetRef.current;
        if (opts.requireComplete && current?.id === id && !current.finished) {
          toast.error("保存できなかった回答があります。もう一度評価してください");
          return null;
        }
        return finishPracticeSet(id);
      })
      .then((r) => {
        if (!r) return; // 中止 (セッションを続ける)
        setPracticeSet(null);
        setActiveSet(null);
        setMode("home");
        setSetSummary(r.summary);
      })
      .catch((e: unknown) =>
        toast.error(
          e instanceof Error
            ? `セットを終了できませんでした: ${e.message}`
            : "セットを終了できませんでした",
        ),
      )
      .finally(() => {
        setFinishingSet(false);
        reloadRows();
      });
  };

  /** 受講者が明示的に切り上げる (未回答が残っていてもそのまま終了する)。 */
  const closePracticeSet = () => {
    if (practiceSet) finishSetById(practiceSet.id);
  };

  /** 全問答え終えたので自動で終了する。 巻き戻された回答があれば終了しない。 */
  const completePracticeSet = () => {
    if (practiceSet) finishSetById(practiceSet.id, { requireComplete: true });
  };

  /**
   * 今日の練習セット (Issue #235)。 中断していたセットがあればサーバがそれを返すので、
   * 「始める」と「再開する」は同じ呼び出しで済む。
   */
  const beginPracticeSet = () => {
    if (!canRecordProgress || startingSet || finishingSet) return;
    setStartingSet(true);
    setSetSummary(null);
    startPracticeSet()
      .then((r) => {
        if (!r.set) {
          toast.error("出題できる A 必修がありません。担当者に案件種別の割当を依頼してください");
          // 割当が外れて 0 問になった可能性がある。 手元の質問を読み直して、
          // サブ導線 (全問からランダム) に無効な質問が残らないようにする。
          reloadRows();
          return;
        }
        if (r.set.finished) {
          // 全問答えたまま終了していなかったセット。 出題するものが無いのでサマリへ送る。
          finishSetById(r.set.id);
          return;
        }
        /**
         * セットの行はサーバで作り直した最新版なので、 手元の行も差し替える。
         * 差し替えだけでは足りない — 一覧を取得した後に割当が変わっていると、 セットには
         * 手元に無い質問が入る。 取りこぼすと出題を引けず、 有効なセットなのに
         * 「出題できる質問が残っていません」になってしまうので、 新しい行は足す。
         */
        setRows((rs) => {
          const byNo = new Map(r.rows.map((row) => [row.no, row]));
          const known = new Set(rs.map((row) => row.no));
          const merged = rs.map((row) => byNo.get(row.no) ?? row);
          const added = r.rows.filter((row) => !known.has(row.no));
          return added.length === 0 ? merged : [...merged, ...added].sort((a, b) => a.no - b.no);
        });
        // セットの行はサーバの確定値。 巻き戻し先として覚えておく (増えた行を含む)。
        confirmRows(r.rows);
        setPracticeSet(r.set);
        setSetVisibleNos(r.rows.map((row) => row.no));
        setActiveSet({
          id: r.set.id,
          date: r.set.date,
          total: r.set.total,
          completed: r.set.completed,
          remaining: r.set.remaining,
        });
        setMode("set");
      })
      .catch((e: unknown) =>
        toast.error(
          e instanceof Error
            ? `練習セットを開始できませんでした: ${e.message}`
            : "練習セットを開始できませんでした",
        ),
      )
      .finally(() => setStartingSet(false));
  };

  /** 中断: セットはサーバに残したまま準備ホームへ戻る。 */
  const suspendPracticeSet = () => {
    setPracticeSet(null);
    setMode("home");
    reloadRows();
  };

  const filtersVisible = mode === "quiz" || showFilters;

  return (
    <>
      <InterviewPrepHeader
        prepTabs={prepTabs}
        prepTab={prepTab}
        onPrepTabChange={setPrepTab}
        mode={mode}
        onModeChange={(next) => {
          // セット実行中に「準備」へ戻るのは中断 (セットはサーバに残す)。
          if (next === "home") {
            if (mode === "set") suspendPracticeSet();
            else setMode("home");
            return;
          }
          if (mode !== "set") startRandomPractice();
        }}
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

          {/* 次にやること: CTA は「今日の練習セット」1 つ。 全問からランダムはサブ導線 */}
          <div className="flex items-center gap-2.5 mb-5 flex-wrap">
            {canRecordProgress ? (
              <button
                type="button"
                disabled={startingSet || finishingSet}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full sf-gradient-bg text-white text-[13.5px] font-bold cursor-pointer hover:brightness-105 disabled:opacity-50 disabled:cursor-default"
                onClick={beginPracticeSet}
              >
                <Play size={14} />
                {finishingSet
                  ? "セットを終了しています…"
                  : startingSet
                    ? "セットを準備中…"
                    : activeSet
                      ? `途中のセットを再開 — 残り ${activeSet.remaining} 問`
                      : "今日の練習セットを始める — 10 問"}
              </button>
            ) : null}
            <button
              type="button"
              className={cn(
                "text-[12px] text-ink-3 underline underline-offset-2 cursor-pointer",
                canRecordProgress ? "" : "font-semibold",
              )}
              onClick={startRandomPractice}
            >
              全問からランダム（A 必修 {stats.total} 問）
            </button>
            <button
              type="button"
              className="ml-auto text-[12px] text-ink-3 underline underline-offset-2 cursor-pointer"
              onClick={() => setShowFilters((v) => !v)}
            >
              {showFilters ? "絞り込みを閉じる" : "絞り込み・検索"}
            </button>
          </div>
          {activeSet ? (
            <p className="text-[12px] text-ink-3 -mt-3 mb-5">
              {activeSet.date} のセットが {activeSet.completed}/{activeSet.total}{" "}
              問まで進んでいます。 再開すると続きから出題されます。
            </p>
          ) : null}
          {setSummary ? (
            <div className="mb-5">
              <PracticeSetSummaryCard
                summary={setSummary}
                starting={startingSet || finishingSet}
                onContinue={beginPracticeSet}
                onExit={() => setSetSummary(null)}
              />
            </div>
          ) : null}
        </>
      ) : null}

      {/* フィルタ (準備ホームでは折りたたみ、 全問からランダムでは常時表示。 セットでは出さない) */}
      {mode !== "set" && filtersVisible ? (
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

      {mode === "set" ? (
        practiceSet && setPool.length > 0 ? (
          <InterviewVoiceSession
            pool={setPool}
            audioNos={audioNos}
            backendEnabled={backendEnabled}
            canRecordProgress={canRecordProgress}
            practiceSet={{
              id: practiceSet.id,
              questionNos: practiceSet.question_nos,
              completedNos: practiceSet.completed_nos,
              onAllDone: completePracticeSet,
              onFinish: closePracticeSet,
              onSuspend: suspendPracticeSet,
            }}
            onProgress={reportProgress}
            onFixNoteChange={applyFixNote}
          />
        ) : practiceSet ? (
          /* 出題できる質問が残っていないセット (割当変更など)。 行き止まりにしない。 */
          <Card className="p-8 text-center flex flex-col items-center gap-3">
            <p className="text-[13px] text-ink-3">
              このセットに出題できる質問が残っていません。割当が変わった可能性があります。
            </p>
            <button
              type="button"
              className="px-4 py-2 rounded-full sf-gradient-bg text-white text-[13px] font-bold cursor-pointer hover:brightness-105"
              onClick={closePracticeSet}
            >
              セットを終了して準備に戻る
            </button>
          </Card>
        ) : (
          <Card className="p-12 text-center text-sm text-ink-3">セットを読み込んでいます…</Card>
        )
      ) : pool.length === 0 ? (
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
          audioNos={audioNos}
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
  /** set は「今日の練習セット」実行中 (チップ上は「練習」と同じ扱い)。 */
  mode: "home" | "quiz" | "set";
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
              <Chip
                key={key}
                active={key === "quiz" ? mode !== "home" : mode === "home"}
                onClick={() => onModeChange(key)}
              >
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
 * ステータスとグループの進捗を出す。 行を開くと 意図 → 触れたい要素 → 回答の型 → NG → 評価軸。
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
      {/* 質問文は面談どおり短くしてあるので、 触れてほしい具体はここに出す。 */}
      {d.keywords ? <DetailBlock label="Keywords ・ 触れたい要素">{d.keywords}</DetailBlock> : null}
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
