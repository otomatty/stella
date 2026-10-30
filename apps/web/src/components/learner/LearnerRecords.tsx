/**
 * 学習の記録 — これまでの学習を振り返る画面。
 *
 * ホームをスキルツリー + 「次にやること」に絞ったので、今日の行動に直結しない記録は
 * ここへ移した (学習のペース・完了レッスン / 学習時間・週間学習時間・提出と添削・
 * お知らせ・期限)。数字は前のホームと同じ実データで、取れないときは空の状態を出す
 * (サンプル値で埋めない)。
 *
 * 前のホームにあった「学習アシスタントAI」のカードは置かない — 右下の AI ボタンが
 * どの画面からも同じものを開く。
 */

import { CheckCircle, ChevronRight, Clock, TrendingUp } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { KpiCard } from "@/components/common/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardActions, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import type { Stage } from "@/data/types";
import type { UseAnnouncementsResult } from "@/hooks/useAnnouncements";
import { useLessonProgressMap } from "@/hooks/useLessonProgress";
import { useMySubmissions } from "@/hooks/useMySubmissions";
import { useStudyActivity } from "@/hooks/useStudyActivity";
import { StudyChart } from "@/components/learner/StudyChart";
import { LearningPacePanel } from "@/components/learner/LearningPacePanel";
import { resolveLessonStatus } from "@/lib/lesson-progress";
import { formatSubmittedAt } from "@/lib/submissions-store";
import { cn } from "@/lib/utils";

interface LearnerRecordsProps {
  stages: Stage[];
  announcementsHook: UseAnnouncementsResult;
  onOpenSubmission: (submissionId: string) => void;
  currentUserId: string | null;
  backendEnabled: boolean;
}

/** ISO 文字列を「M月D日」表記にする。 不正値は空文字。 */
function formatAnnouncementDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 秒数を「H:MM」表記にする。 */
function formatHoursMinutes(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

const NEW_WINDOW_MS = 7 * 86_400_000;

/** 週間学習チャートの表示日数 (受け入れ基準の「直近14日」)。 */
const STUDY_ACTIVITY_DAYS = 14;

export const LearnerRecords = ({
  stages,
  announcementsHook,
  onOpenSubmission,
  currentUserId,
  backendEnabled,
}: LearnerRecordsProps) => {
  const progressMap = useLessonProgressMap();
  const {
    submissions,
    loading: submissionsLoading,
    error: submissionsError,
  } = useMySubmissions(true);
  // 週間チャートは日別学習ログ (study_activity) の実データから出す。
  const {
    activity,
    loading: activityLoading,
    error: activityError,
  } = useStudyActivity(currentUserId, STUDY_ACTIVITY_DAYS, backendEnabled);

  // 進捗 KPI はレッスン進捗ストア (バックエンド設定時はサーバ同期済み) から集計する。
  const allLessons = stages.flatMap((c) => c.sections?.flatMap((s) => s.lessons) ?? []);
  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter(
    (l) => resolveLessonStatus(l, progressMap) === "done",
  ).length;
  const totalWatchedSec = allLessons.reduce(
    (sum, l) => sum + (progressMap[l.id]?.watchedSec ?? 0),
    0,
  );

  // 前日比: 累計の完了レッスン数は「今日完了した数」だけ前日から増えるので、
  // 日別学習ログの今日の completed_lessons を昨日からの増分として出す。
  const todayCompletedLessons = activity
    ? (activity.days.find((d) => d.date === activity.today)?.completed_lessons ?? 0)
    : null;
  const todaySec = activity?.today_sec ?? null;
  const completedTrend = !activity ? (
    activityLoading ? (
      <Skeleton className="h-3 w-24" />
    ) : undefined
  ) : todayCompletedLessons != null && todayCompletedLessons > 0 ? (
    <>
      <TrendingUp size={12} />
      昨日から +{todayCompletedLessons} レッスン
    </>
  ) : (
    <>昨日から ±0 · 今日の1本目を始めよう</>
  );
  const studyTimeTrend = !activity ? (
    activityLoading ? (
      <Skeleton className="h-3 w-24" />
    ) : (
      "動画視聴の合計"
    )
  ) : todaySec != null && todaySec > 0 ? (
    <>
      <TrendingUp size={12} />
      今日 {formatHoursMinutes(todaySec)}
    </>
  ) : (
    <>今日はまだ 0:00</>
  );

  const { announcements, error: announcementsError, refetch } = announcementsHook;
  const now = Date.now();
  const newCount = announcements.reduce(
    (n, a) => n + (now - new Date(a.published_at).getTime() < NEW_WINDOW_MS ? 1 : 0),
    0,
  );

  // 期限が近い課題は enrollment の dueAt から実データで組み立てる。自己開始の受講には
  // 期限が無いので、該当が無ければカードごと出さない (誤情報も空の箱も出さない)。
  const deadlines = stages
    .filter((c): c is Stage & { dueAt: string } => Boolean(c.dueAt) && !c.completed)
    .sort((a, b) => (a.dueAt < b.dueAt ? -1 : 1))
    .slice(0, 5)
    .flatMap((c) => {
      // due_at は UTC 午前0時で保存される。 new Date(...) で UTC インスタンスを
      // ローカル日付に変換すると UTC より西の TZ で日付が 1 日ずれるため、
      // 日付部分 (YYYY-MM-DD) を date-only として扱って差分を取る。
      const [y, m, d] = c.dueAt.slice(0, 10).split("-").map(Number);
      if (y === undefined || m === undefined || d === undefined) return [];
      const dueUTC = Date.UTC(y, m - 1, d);
      const today = new Date();
      const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
      const days = Math.round((dueUTC - todayUTC) / 86_400_000);
      return [
        {
          id: c.id,
          t: c.title,
          due: days < 0 ? "期限超過" : days === 0 ? "本日まで" : `${days}日後`,
          c: c.required ? "必須" : c.category,
          urgency: (days <= 3 ? "warning" : "info") as "warning" | "info",
        },
      ];
    });

  return (
    <>
      <PageHeader
        title="学習の記録"
        sub="これまでの学習の進み具合と、提出・お知らせを振り返れます"
      />

      <div className="grid gap-3 mb-5 grid-cols-1 sm:grid-cols-2">
        <KpiCard
          label={
            <>
              <CheckCircle size={12} /> 完了レッスン
            </>
          }
          value={completedLessons}
          unit={`/ ${totalLessons}`}
          trend={completedTrend}
          {...(todayCompletedLessons != null && todayCompletedLessons > 0
            ? { trendDir: "up" as const }
            : {})}
        >
          <Progress
            value={totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0}
            className="mt-2"
            tone="brand"
          />
        </KpiCard>
        <KpiCard
          label={
            <>
              <Clock size={12} /> 学習時間
            </>
          }
          value={formatHoursMinutes(totalWatchedSec)}
          unit="累計"
          trend={studyTimeTrend}
          {...(todaySec != null && todaySec > 0 ? { trendDir: "up" as const } : {})}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          {backendEnabled && currentUserId ? (
            <LearningPacePanel key={currentUserId} className="" />
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>週間学習時間</CardTitle>
              <CardActions>
                <span className="text-[11.5px] text-ink-3">
                  直近{STUDY_ACTIVITY_DAYS}日
                  {activity ? ` · 合計 ${formatHoursMinutes(activity.total_sec)}` : ""}
                </span>
              </CardActions>
            </CardHeader>
            {activityError ? (
              <div className="px-4 py-4 text-[12.5px] text-destructive">
                学習ログの取得に失敗しました: {activityError}
              </div>
            ) : activityLoading && !activity ? (
              <div className="p-4 h-60">
                <Skeleton className="h-full w-full" />
              </div>
            ) : !activity ? (
              <div className="px-4 py-4 text-[12.5px] text-ink-3">
                学習ログはまだありません。レッスンを視聴すると日別の学習時間が記録されます。
              </div>
            ) : activity.total_sec === 0 ? (
              <div className="px-4 py-4 text-[12.5px] text-ink-3">
                直近{STUDY_ACTIVITY_DAYS}日の学習記録はありません。
              </div>
            ) : (
              <div className="p-4 h-60 relative">
                <StudyChart days={activity.days} />
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>提出・添削履歴</CardTitle>
            </CardHeader>
            <div>
              {submissionsLoading ? <SkeletonRows rows={3} className="px-4 py-4" /> : null}
              {submissionsError ? (
                <div className="px-4 py-3 text-[12.5px] text-destructive">
                  提出履歴の取得に失敗しました: {submissionsError}
                </div>
              ) : null}
              {!submissionsLoading && !submissionsError && submissions.length === 0 ? (
                <div className="px-4 py-4 text-[12.5px] text-ink-3">提出はまだありません。</div>
              ) : null}
              {submissions.map((submission, i) => {
                const meta = submission.verdict
                  ? SUBMISSION_META[submission.verdict]
                  : SUBMISSION_META.pending;
                return (
                  <button
                    type="button"
                    key={submission.id}
                    onClick={() => onOpenSubmission(submission.id)}
                    className={cn(
                      "w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-sunken",
                      i < submissions.length - 1 ? "border-b border-border" : "",
                    )}
                  >
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium">{submission.assignmentTitle}</div>
                      <div className="text-[11.5px] text-ink-3">
                        {submission.stageTitle} · {formatSubmittedAt(submission.submittedAt)}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-ink-4" />
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>お知らせ</CardTitle>
              <CardActions>
                {newCount > 0 ? <Badge variant="accent">{newCount} 新着</Badge> : null}
              </CardActions>
            </CardHeader>
            <div>
              {announcementsError ? (
                <div className="flex items-center gap-3 px-4 py-3">
                  <p className="text-[12.5px] text-destructive">
                    お知らせの取得に失敗しました: {announcementsError}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => void refetch()}>
                    再試行
                  </Button>
                </div>
              ) : null}
              {announcements.length === 0 && !announcementsError ? (
                <div className="px-4 py-3 text-[12.5px] text-ink-3">お知らせはありません。</div>
              ) : null}
              {announcements.slice(0, 5).map((a, i, arr) => {
                const isNew = now - new Date(a.published_at).getTime() < NEW_WINDOW_MS;
                return (
                  <div
                    key={a.id}
                    className={cn(
                      "flex gap-3 px-4 py-3",
                      i < arr.length - 1 ? "border-b border-border" : "",
                    )}
                  >
                    <div
                      className={cn(
                        "shrink-0 w-2 h-2 rounded-full mt-1.5",
                        isNew ? "bg-brand" : "bg-border-strong",
                      )}
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-[13px] leading-snug">{a.title}</div>
                      {a.body ? (
                        <div className="text-[11.5px] text-ink-2 mt-0.5 line-clamp-2">{a.body}</div>
                      ) : null}
                      <div className="text-[11.5px] text-ink-3 mt-1 flex gap-2">
                        <span>{a.author_name || "お知らせ"}</span>
                        <span>{formatAnnouncementDate(a.published_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {deadlines.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>期限が近い課題</CardTitle>
              </CardHeader>
              <div>
                {deadlines.map((d, i) => (
                  <div
                    key={d.id}
                    className={cn(
                      "flex gap-3 px-4 py-3",
                      i < deadlines.length - 1 ? "border-b border-border" : "",
                    )}
                  >
                    <Badge variant={d.urgency} className="text-[10px]">
                      {d.due}
                    </Badge>
                    <div>
                      <div className="font-medium text-[13px] leading-snug">{d.t}</div>
                      <div className="text-[11.5px] text-ink-3 mt-1">{d.c}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
};

const SUBMISSION_META = {
  pending: { label: "添削待ち", variant: "info" },
  pass: { label: "合格", variant: "success" },
  resubmit: { label: "再提出", variant: "warning" },
  fail: { label: "不合格", variant: "danger" },
} as const;
