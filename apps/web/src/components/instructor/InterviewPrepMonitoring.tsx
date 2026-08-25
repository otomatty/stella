/**
 * 面談対策 — 講師・営業・管理者のモニタリング一覧 (Issue #236 / 設計書 Flow B)。
 *
 * 「この受講者を面談に出せるか」を口頭確認ではなく画面で判断するための起点。
 * 面談日が近い順に受講者を並べ、 準備率・最終練習日を出し、 行を開くと質問ごとの
 * ステータスと個別回答の型 (#206)・改善点メモ (#234)・スキルシート (#233) をまとめて見る。
 *
 * 集計は API (`GET /api/interview-prep/assignments`) が同梱するので、 ここは表示のみ。
 * 詳細ドロワーだけは開いたときに `GET /questions?profileId=` を 1 回引く。
 */

import { useEffect, useMemo, useState } from "react";
import { X } from "@/lib/icons";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Progress } from "@/components/ui/progress";
import { SkeletonRows } from "@/components/ui/skeleton";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { sortFixNotesForHistory } from "@falcon/shared/interview/fix-notes";
import {
  formatInterviewCountdown,
  formatLastPracticed,
  MONITORING_RISK_LABELS,
  monitoringRisk,
  type MonitoringRisk,
  sortByInterviewDate,
  summarizeMonitoring,
} from "@falcon/shared/interview/monitoring";
import { deriveQuestionPrepStatus } from "@falcon/shared/interview/progress";
import type { ProfileRole } from "@falcon/shared/cms/types";
import type { Role } from "@/data/types";
import {
  fetchInterviewQuestions,
  type InterviewPrepAssignmentRow,
  type LearnerInterviewQuestion,
  monitoringRowsOf,
  monitoringSummaryOf,
} from "@/lib/interview-prep-api";
import { useStudyToday } from "@/hooks/useStudyToday";
import { PrepStatusPill } from "@/components/interview/PrepStatusPill";
import { PrepTargetRoleBadge } from "@/components/interview/PrepTargetRoleBadge";
import { SkillSheetRegistrationPanel } from "@/components/skill-sheet/SkillSheetRegistrationPanel";
import { cn } from "@/lib/utils";

/** 行の強調。 `alert` = 面談が目前なのに準備率が低い (一目で分かるようにする)。 */
const RISK_ROW_CLASSES: Record<MonitoringRisk, string> = {
  alert: "bg-danger/[0.06] hover:bg-danger/10",
  watch: "bg-warning/[0.06] hover:bg-warning/10",
  none: "",
};

const RISK_BADGE_CLASSES: Record<Exclude<MonitoringRisk, "none">, string> = {
  alert: "bg-danger/10 text-danger",
  watch: "bg-warning/15 text-warning",
};

/** 準備率バーの色。 低いほど危ないので、 面談日と関係なく率そのもので出し分ける。 */
function prepRateTone(percent: number): "danger" | "warning" | "success" {
  if (percent < 40) return "danger";
  if (percent < 80) return "warning";
  return "success";
}

export function InterviewPrepMonitoring({
  rows,
  loading,
  error,
  backendEnabled,
  showSkillSheet,
  profileRole,
  shellRole,
  currentUserId,
}: {
  rows: InterviewPrepAssignmentRow[];
  loading: boolean;
  error: string | null;
  backendEnabled: boolean;
  /** ドロワーにスキルシートを出すか (#233 の権限判定の結果)。 */
  showSkillSheet: boolean;
  profileRole: ProfileRole | undefined;
  shellRole: Role;
  currentUserId: string | null;
}) {
  const [openProfileId, setOpenProfileId] = useState<string | null>(null);

  // 開きっぱなしでも日付が変わったら追随する (前日の「今日」でカウントダウンや
  // 要フォロー判定を出さない)。
  const today = useStudyToday();
  // 並び順も「今日」に追随させる。 API / 保存時のソートだけに任せると、 開いたまま
  // 日付をまたいだときに、 済んだばかりの面談がこれからの面談より前に居座る
  // (カウントダウンと注意喚起だけが更新されて順序が取り残される)。
  const orderedRows = useMemo(
    () => sortByInterviewDate(monitoringRowsOf(rows), today),
    [rows, today],
  );
  const totals = useMemo(
    () => summarizeMonitoring(orderedRows.map(monitoringSummaryOf), today),
    [orderedRows, today],
  );
  const openRow = rows.find((r) => r.profile_id === openProfileId) ?? null;

  if (!backendEnabled) {
    return (
      <Card className="p-12 text-center text-sm text-ink-3">
        デモモードでは準備状況を表示できません。
      </Card>
    );
  }
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
        対象者一覧の取得に失敗しました: {error}
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <SummaryChip label="面談予定（今月）" count={totals.upcomingThisMonth} />
        <SummaryChip label="練習なし" count={totals.neverPracticed} tone="warning" />
        <SummaryChip label={MONITORING_RISK_LABELS.alert} count={totals.alerts} tone="danger" />
      </div>
      <Card className="p-0 overflow-hidden">
        <Table className="max-lg:min-w-0">
          <TableHeader>
            <TableRow>
              <TableHead className="w-40 sm:w-52">対象者</TableHead>
              <TableHead className="w-32">面談日</TableHead>
              <TableHead className="w-44">案件・割当</TableHead>
              <TableHead className="w-40">準備率</TableHead>
              <TableHead className="w-24">最終練習</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderedRows.map((row) => {
              const risk = monitoringRisk(monitoringSummaryOf(row), today);
              // 割当を変えた直後は再集計待ち。 0% と偽らず「集計中」を出す。
              const percent = row.prepRate ?? null;
              const countdown = formatInterviewCountdown(row.interviewDate ?? null, today);
              return (
                <TableRow
                  key={row.profile_id}
                  // 行全体を詳細の入口にする。 キーボードからも開けるよう button ロールで扱う。
                  role="button"
                  tabIndex={0}
                  aria-label={`${row.display_name} の準備状況を開く`}
                  onClick={() => setOpenProfileId(row.profile_id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpenProfileId(row.profile_id);
                    }
                  }}
                  className={cn("cursor-pointer", RISK_ROW_CLASSES[risk])}
                >
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium">{row.display_name}</span>
                      <PrepTargetRoleBadge role={row.role} />
                      {risk !== "none" ? (
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-[1px] rounded-full font-semibold shrink-0",
                            RISK_BADGE_CLASSES[risk],
                          )}
                        >
                          {MONITORING_RISK_LABELS[risk]}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11.5px] text-ink-4">{row.email ?? ""}</div>
                  </TableCell>
                  <TableCell>
                    {row.interviewDate ? (
                      <>
                        <div className="text-[12.5px] tabular-nums">{row.interviewDate}</div>
                        <div className="text-[11px] text-ink-4">{countdown}</div>
                      </>
                    ) : (
                      <span className="text-[12px] text-ink-4">未設定</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-[12px] text-ink-2 truncate">{row.note ?? "—"}</div>
                    <div className="text-[11px] text-ink-4 truncate">
                      {row.categories.length > 0 ? row.categories.join(" / ") : "割当なし"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {percent === null ? (
                      <span className="text-[12px] text-ink-4">集計中…</span>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={percent}
                            tone={prepRateTone(percent)}
                            className="flex-1 min-w-16"
                            aria-label={`${row.display_name} の準備率 ${percent}%`}
                          />
                          <span className="text-[12px] font-semibold tabular-nums w-9 text-right">
                            {percent}%
                          </span>
                        </div>
                        <div className="text-[11px] text-ink-4 tabular-nums">
                          練習OK {row.breakdown?.confident ?? 0} / {row.prepTotal ?? 0} 問
                        </div>
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "text-[12px]",
                        row.lastPracticedAt ? "text-ink-2" : "text-ink-4",
                      )}
                    >
                      {formatLastPracticed(row.lastPracticedAt ?? null, today)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
            {orderedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-ink-3 p-8">
                  受講者がいません。
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
      <Drawer
        open={openRow !== null}
        onOpenChange={(open) => {
          if (!open) setOpenProfileId(null);
        }}
      >
        <DrawerContent
          direction="right"
          className="sm:max-w-2xl"
          aria-describedby={undefined}
          // 開いた受講者ごとに state を作り直す (前の受講者の質問が一瞬見えないように)。
          key={openRow?.profile_id ?? "none"}
        >
          {openRow ? (
            <LearnerPrepDetail
              row={openRow}
              today={today}
              showSkillSheet={showSkillSheet}
              backendEnabled={backendEnabled}
              profileRole={profileRole}
              shellRole={shellRole}
              currentUserId={currentUserId}
            />
          ) : null}
        </DrawerContent>
      </Drawer>
    </>
  );
}

function SummaryChip({
  label,
  count,
  tone = "default",
}: {
  label: string;
  count: number;
  tone?: "default" | "warning" | "danger";
}) {
  const toneClass =
    count === 0
      ? "bg-card text-ink-3 border-border"
      : tone === "danger"
        ? "bg-danger/10 text-danger border-danger/30"
        : tone === "warning"
          ? "bg-warning/10 text-warning border-warning/30"
          : "bg-card text-ink-2 border-border";
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-[12px] border", toneClass)}>
      {label} <span className="font-bold tabular-nums">{count}</span> 件
    </span>
  );
}

/**
 * 詳細ドロワー。 質問ごとのステータスと個別回答の型・改善点メモを、
 * 受講者の準備タブと同じ言葉 (ステータスピル) で見せる。
 */
function LearnerPrepDetail({
  row,
  today,
  showSkillSheet,
  backendEnabled,
  profileRole,
  shellRole,
  currentUserId,
}: {
  row: InterviewPrepAssignmentRow;
  today: string;
  showSkillSheet: boolean;
  backendEnabled: boolean;
  profileRole: ProfileRole | undefined;
  shellRole: Role;
  currentUserId: string | null;
}) {
  const [questions, setQuestions] = useState<LearnerInterviewQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"questions" | "skill-sheet">("questions");

  useEffect(() => {
    let cancelled = false;
    fetchInterviewQuestions(row.profile_id)
      .then((r) => {
        if (!cancelled) setQuestions(r.rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [row.profile_id]);

  const countdown = formatInterviewCountdown(row.interviewDate ?? null, today);
  const percent = row.prepRate ?? null;
  // A 必修 (逆質問を除く) を先頭に、 それ以外は質問番号順。 準備率の対象が上に来る。
  const ordered = useMemo(() => {
    if (!questions) return [];
    const weight = (q: LearnerInterviewQuestion) => (q.freq === "A" && !q.is_reverse ? 0 : 1);
    return [...questions].sort((a, b) => weight(a) - weight(b) || a.no - b.no);
  }, [questions]);

  return (
    <>
      <DrawerHeader className="flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <DrawerTitle>{row.display_name}</DrawerTitle>
          <div className="text-[11.5px] text-ink-3 mt-1">
            {row.interviewDate ? `面談 ${row.interviewDate}（${countdown}）` : "面談日 未設定"}
            {" ・ "}
            {percent === null
              ? "準備率 集計中…"
              : `準備率 ${percent}%（練習OK ${row.breakdown?.confident ?? 0} / ${row.prepTotal ?? 0} 問）`}
            {" ・ "}
            最終練習 {formatLastPracticed(row.lastPracticedAt ?? null, today)}
          </div>
        </div>
        <DrawerClose asChild>
          <button
            type="button"
            className="w-7 h-7 rounded-full grid place-items-center text-ink-3 hover:bg-sunken shrink-0"
            aria-label="準備状況を閉じる"
          >
            <X size={15} />
          </button>
        </DrawerClose>
      </DrawerHeader>
      {showSkillSheet ? (
        <div className="flex items-center gap-1.5 px-4 pt-3">
          <Chip active={tab === "questions"} onClick={() => setTab("questions")}>
            質問ごとの状況
          </Chip>
          <Chip active={tab === "skill-sheet"} onClick={() => setTab("skill-sheet")}>
            スキルシート
          </Chip>
        </div>
      ) : null}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {showSkillSheet && tab === "skill-sheet" ? (
          currentUserId ? (
            <SkillSheetRegistrationPanel
              backendEnabled={backendEnabled}
              profileRole={profileRole}
              shellRole={shellRole}
              currentUserId={currentUserId}
              targetProfileId={row.profile_id}
              learnerDisplayName={row.display_name}
            />
          ) : (
            <p className="text-[12.5px] text-ink-3">ログイン情報を読み込めませんでした。</p>
          )
        ) : error ? (
          <p className="text-[12.5px] text-destructive">準備状況の取得に失敗しました: {error}</p>
        ) : questions === null ? (
          <SkeletonRows rows={6} />
        ) : ordered.length === 0 ? (
          <p className="text-[12.5px] text-ink-3">
            案件種別が未割当のため、 対象の質問がありません。「割当」タブで設定してください。
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {ordered.map((q) => (
              <QuestionStatusRow key={q.no} question={q} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function QuestionStatusRow({ question }: { question: LearnerInterviewQuestion }) {
  const status = deriveQuestionPrepStatus({
    hasPersonalTemplate: Boolean(question.personal_answer_template),
    progressStatus: question.progress_status ?? null,
  });
  const notes = sortFixNotesForHistory(question.fix_notes ?? []);

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[12.5px] font-medium leading-snug">
          <span className="text-ink-4 tabular-nums mr-1.5">#{question.no}</span>
          {question.question}
        </div>
        <PrepStatusPill status={status} />
      </div>
      <div className="text-[11px] text-ink-4 mt-1 tabular-nums">
        {question.freq} ・ 練習 {question.practiced_count ?? 0} 回
      </div>
      {question.personal_answer_template ? (
        <div className="mt-2">
          <div className="text-[11px] text-ink-4 mb-1">個別回答の型</div>
          <p className="text-[12px] text-ink-2 whitespace-pre-wrap leading-relaxed">
            {question.personal_answer_template}
          </p>
        </div>
      ) : (
        <p className="text-[11.5px] text-ink-4 mt-2">個別回答の型は未作成です。</p>
      )}
      {notes.length > 0 ? (
        <div className="mt-2">
          <div className="text-[11px] text-ink-4 mb-1">改善点メモ</div>
          <ul className="flex flex-col gap-0.5">
            {notes.map((note) => (
              <li
                key={note.id}
                className={cn(
                  "text-[11.5px]",
                  note.resolved_at ? "text-ink-4 line-through" : "text-ink-2",
                )}
              >
                ・{note.text}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
