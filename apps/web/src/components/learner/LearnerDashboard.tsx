import { useEffect, useMemo, useState } from 'react';
import {
  Play,
  Book,
  CheckCircle,
  Clock,
  Award,
  ChevronRight,
  Flame,
  MessageCircle,
  Sparkles,
  TrendingUp,
} from '@/lib/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { KpiCard } from '@/components/common/KpiCard';
import { CourseThumb } from '@/components/common/CourseThumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardActions, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Course } from '@/data/types';
import type { UseAnnouncementsResult } from '@/hooks/useAnnouncements';
import { useLessonProgressMap } from '@/hooks/useLessonProgress';
import { useMySubmissions } from '@/hooks/useMySubmissions';
import { useStudyActivity } from '@/hooks/useStudyActivity';
import { StudyChart } from '@/components/learner/StudyChart';
import { listCertificatesForUser } from '@/lib/certificates-api';
import { findNextLesson, resolveLessonStatus } from '@/lib/lesson-progress';
import { formatSubmittedAt } from '@/lib/submissions-store';
import { cn } from '@/lib/utils';

interface LearnerDashboardProps {
  setPage: (page: string) => void;
  /** 指定のレッスンでレッスン画面を開く (「続きから学習」)。 */
  onOpenLesson: (course: Course, lessonId: string) => void;
  courses: Course[];
  announcementsHook: UseAnnouncementsResult;
  coursesError: string | null;
  onOpenSubmission: (submissionId: string) => void;
  studentName: string;
  currentUserId: string | null;
  backendEnabled: boolean;
}

/** ISO 文字列を「M月D日」表記にする。 不正値は空文字。 */
function formatAnnouncementDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 秒数を「H:MM」表記にする。 */
function formatHoursMinutes(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

const NEW_WINDOW_MS = 7 * 86_400_000;

/** 週間学習チャートの表示日数 (受け入れ基準の「直近14日」)。 */
const STUDY_ACTIVITY_DAYS = 14;

export const LearnerDashboard = ({
  setPage,
  onOpenLesson,
  courses,
  announcementsHook,
  coursesError,
  onOpenSubmission,
  studentName,
  currentUserId,
  backendEnabled,
}: LearnerDashboardProps) => {
  const progressMap = useLessonProgressMap();
  const active = courses.filter((c) => !c.completed && c.progress > 0);
  // 「次に取り組む」対象: 受講中の先頭 → なければ未着手の先頭。
  const current =
    active[0] ?? courses.find((c) => !c.completed && (c.sections?.length ?? 0) > 0);
  const nextLesson = useMemo(
    () => findNextLesson(current, progressMap),
    [current, progressMap],
  );
  /** 再開先が決まらない (受講コース無し / 全完了) ときはコース一覧へ逃がす。 */
  const resume = () => {
    if (current && nextLesson) onOpenLesson(current, nextLesson.lesson.id);
    else setPage('courses');
  };
  const {
    submissions,
    loading: submissionsLoading,
    error: submissionsError,
  } = useMySubmissions(true);
  // 週間チャート / ストリークは日別学習ログ (study_activity) の実データから出す。
  const {
    activity,
    loading: activityLoading,
    error: activityError,
  } = useStudyActivity(currentUserId, STUDY_ACTIVITY_DAYS, backendEnabled);
  // ストリークが自己ベストに並んだら「更新中」として強調する。
  const isBestStreak =
    activity != null && activity.current_streak > 0 &&
    activity.current_streak >= activity.longest_streak;
  const streakTrend = !activity ? (
    activityLoading ? (
      '読み込み中…'
    ) : (
      '学習ログがありません'
    )
  ) : isBestStreak ? (
    <>
      <TrendingUp size={12} />
      自己ベスト更新中
    </>
  ) : (
    <>自己ベスト {activity.longest_streak}日</>
  );

  // 進捗 KPI はレッスン進捗ストア (バックエンド設定時はサーバ同期済み) から集計する。
  const allLessons = useMemo(
    () => courses.flatMap((c) => c.sections?.flatMap((s) => s.lessons) ?? []),
    [courses],
  );
  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter(
    (l) => resolveLessonStatus(l, progressMap) === 'done',
  ).length;
  const totalWatchedSec = allLessons.reduce(
    (sum, l) => sum + (progressMap[l.id]?.watchedSec ?? 0),
    0,
  );

  // 修了証: バックエンド設定時は API の実発行数、 未設定 (デモ) 時は完了コース数。
  const completedCourses = courses.filter((c) => c.completed).length;
  const [certCount, setCertCount] = useState<number | null>(null);
  useEffect(() => {
    if (!backendEnabled || !currentUserId) {
      setCertCount(null);
      return;
    }
    let cancelled = false;
    void listCertificatesForUser(currentUserId)
      .then((rows) => {
        if (!cancelled) setCertCount(rows.filter((r) => !r.revoked).length);
      })
      .catch((err) => {
        console.error('[LearnerDashboard] certificates fetch failed', err);
        if (!cancelled) setCertCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [backendEnabled, currentUserId]);
  const displayCertCount = backendEnabled ? certCount ?? 0 : completedCourses;

  const { announcements, error: announcementsError, refetch } = announcementsHook;
  const now = Date.now();
  const newCount = announcements.reduce(
    (n, a) => n + (now - new Date(a.published_at).getTime() < NEW_WINDOW_MS ? 1 : 0),
    0,
  );

  // 期限が近い課題は enrollment の dueAt から実データで組み立てる。
  // 該当が無ければサンプルではなく空状態を表示する (誤情報を出さない)。
  const deadlines = courses
    .filter((c) => c.dueAt && !c.completed)
    .sort((a, b) => (a.dueAt! < b.dueAt! ? -1 : 1))
    .slice(0, 5)
    .map((c) => {
      // due_at は UTC 午前0時で保存される。 new Date(...) で UTC インスタンスを
      // ローカル日付に変換すると UTC より西の TZ で日付が 1 日ずれるため、
      // 日付部分 (YYYY-MM-DD) を date-only として扱って差分を取る。
      const [y, m, d] = c.dueAt!.slice(0, 10).split('-').map(Number);
      const dueUTC = Date.UTC(y!, m! - 1, d!);
      const now = new Date();
      const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      const days = Math.round((dueUTC - todayUTC) / 86_400_000);
      return {
        t: c.title,
        due: days < 0 ? '期限超過' : days === 0 ? '本日まで' : `${days}日後`,
        c: c.required ? '必須' : c.category,
        urgency: (days <= 3 ? 'warning' : 'info') as 'warning' | 'info',
      };
    });

  return (
    <>
      <PageHeader
        title={`おかえりなさい、${studentName}さん`}
        sub={
          <>
            今日も学習を続けましょう。受講中{' '}
            <strong className="text-foreground">{active.length}コース</strong> · 完了レッスン{' '}
            {completedLessons}/{totalLessons}
          </>
        }
        actions={
          // 「学習スケジュール」は撤去した (Issue #77)。 スケジュール機能自体が存在せず、
          // 期限は右カラムの「期限が近い課題」で実データを出しているため。
          <Button variant="accent" onClick={resume}>
            <Play size={14} />
            続きから学習
          </Button>
        }
      />

      {coursesError ? (
        <p className="text-sm text-destructive mb-3">
          コースの取得に失敗しました: {coursesError}
        </p>
      ) : null}
      {announcementsError ? (
        <div className="flex items-center gap-3 mb-3">
          <p className="text-sm text-destructive">
            お知らせの取得に失敗しました: {announcementsError}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            再試行
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 mb-6 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label={
            <>
              <Book size={12} /> 受講中
            </>
          }
          value={active.length}
          unit="コース"
          trend={<>全{courses.length}コース中</>}
        />
        <KpiCard
          label={
            <>
              <Flame size={12} /> 連続学習
            </>
          }
          value={activity ? activity.current_streak : '—'}
          unit={activity ? '日' : undefined}
          trend={streakTrend}
          {...(isBestStreak ? { trendDir: 'up' as const } : {})}
        />
        <KpiCard
          label={
            <>
              <CheckCircle size={12} /> 完了レッスン
            </>
          }
          value={completedLessons}
          unit={`/ ${totalLessons}`}
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
          trend="動画視聴の合計"
        />
        <KpiCard
          label={
            <>
              <Award size={12} /> 修了証
            </>
          }
          value={displayCertCount}
          unit={`/ 全${courses.length}コース`}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          {current ? (
            <Card>
              <CardHeader>
                <CardTitle>次に取り組むレッスン</CardTitle>
                <CardActions>
                  <Button variant="default" size="sm" onClick={() => setPage('courses')}>
                    すべて見る
                  </Button>
                </CardActions>
              </CardHeader>
              <div className="grid gap-0 grid-cols-1 sm:grid-cols-[220px_1fr]">
                <div className="relative border-r border-border">
                  <CourseThumb color={current.color} label={current.category} />
                </div>
                <div className="p-4 pl-5">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <Badge variant="accent">
                      {current.progress > 0 ? '受講中' : '未着手'}
                    </Badge>
                    {nextLesson ? (
                      <span className="text-[11.5px] text-ink-3">
                        セクション {String(nextLesson.sectionNumber).padStart(2, '0')} · レッスン{' '}
                        {nextLesson.lessonNumber}/{current.lessonsCount}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[15px] font-semibold leading-snug mb-1">
                    {nextLesson?.lesson.title ?? current.title}
                  </div>
                  <div className="text-[11.5px] text-ink-3 mb-3">{current.title}</div>
                  <div className="flex items-center gap-3 mb-3.5">
                    <div className="flex-1">
                      <div className="text-[11.5px] text-ink-3 mb-2">進捗 {current.progress}%</div>
                      <Progress value={current.progress} tone="brand" />
                    </div>
                    {nextLesson ? (
                      <div className="text-[11.5px] text-ink-3 flex items-center gap-1">
                        <Clock size={12} />
                        残り {Math.max(current.lessonsCount - nextLesson.lessonNumber + 1, 0)}
                        レッスン
                      </div>
                    ) : null}
                  </div>
                  <Button variant="accent" onClick={resume}>
                    <Play size={13} />
                    続きから学習
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>提出・添削履歴</CardTitle>
            </CardHeader>
            <div>
              {submissionsLoading ? (
                <div className="px-4 py-4 text-[12.5px] text-ink-3">読み込み中…</div>
              ) : null}
              {submissionsError ? (
                <div className="px-4 py-3 text-[12.5px] text-destructive">
                  提出履歴の取得に失敗しました: {submissionsError}
                </div>
              ) : null}
              {!submissionsLoading && !submissionsError && submissions.length === 0 ? (
                <div className="px-4 py-4 text-[12.5px] text-ink-3">
                  提出はまだありません。
                </div>
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
                      'w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-sunken',
                      i < submissions.length - 1 ? 'border-b border-border' : '',
                    )}
                  >
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium">{submission.assignmentTitle}</div>
                      <div className="text-[11.5px] text-ink-3">
                        {submission.courseTitle} · {formatSubmittedAt(submission.submittedAt)}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-ink-4" />
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>週間学習時間</CardTitle>
              <CardActions>
                <span className="text-[11.5px] text-ink-3">
                  直近{STUDY_ACTIVITY_DAYS}日
                  {activity ? ` · 合計 ${formatHoursMinutes(activity.total_sec)}` : ''}
                </span>
              </CardActions>
            </CardHeader>
            {activityError ? (
              <div className="px-4 py-4 text-[12.5px] text-destructive">
                学習ログの取得に失敗しました: {activityError}
              </div>
            ) : activityLoading && !activity ? (
              <div className="px-4 py-4 text-[12.5px] text-ink-3">読み込み中…</div>
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
              <CardTitle>コース進捗</CardTitle>
              <CardActions>
                <Button variant="default" size="sm" onClick={() => setPage('courses')}>
                  コース一覧へ
                </Button>
              </CardActions>
            </CardHeader>
            <div className="px-4 py-3.5">
              {courses.length === 0 ? (
                <div className="py-4 text-center text-[12.5px] text-ink-3">
                  受講中のコースはありません。
                </div>
              ) : (
                courses.slice(0, 5).map((c) => (
                  <div key={c.id} className="mb-3.5 last:mb-0">
                    <div className="flex items-center gap-2 text-xs mb-1.5">
                      <span className="font-medium">{c.title}</span>
                      {c.completed ? <Badge variant="success">完了</Badge> : null}
                      <div className="flex-1" />
                      <span className="font-mono font-semibold">{c.progress}%</span>
                    </div>
                    <Progress
                      value={c.progress}
                      tone={c.completed ? 'success' : 'brand'}
                    />
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>お知らせ</CardTitle>
              <CardActions>
                {newCount > 0 ? (
                  <Badge variant="accent">{newCount} 新着</Badge>
                ) : null}
              </CardActions>
            </CardHeader>
            <div>
              {announcements.length === 0 ? (
                <div className="px-4 py-3 text-[12.5px] text-ink-3">
                  お知らせはありません。
                </div>
              ) : null}
              {announcements.slice(0, 5).map((a, i, arr) => {
                const isNew = now - new Date(a.published_at).getTime() < NEW_WINDOW_MS;
                return (
                  <div
                    key={a.id}
                    className={cn(
                      'flex gap-3 px-4 py-3',
                      i < arr.length - 1 ? 'border-b border-border' : '',
                    )}
                  >
                    <div
                      className={cn(
                        'shrink-0 w-2 h-2 rounded-full mt-1.5',
                        isNew ? 'bg-brand' : 'bg-border-strong',
                      )}
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-[13px] leading-snug">{a.title}</div>
                      {a.body ? (
                        <div className="text-[11.5px] text-ink-2 mt-0.5 line-clamp-2">
                          {a.body}
                        </div>
                      ) : null}
                      <div className="text-[11.5px] text-ink-3 mt-1 flex gap-2">
                        <span>{a.author_name || 'お知らせ'}</span>
                        <span>{formatAnnouncementDate(a.published_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>期限が近い課題</CardTitle>
            </CardHeader>
            <div>
              {deadlines.length === 0 ? (
                <div className="px-4 py-3 text-[12.5px] text-ink-3">
                  期限が設定された課題はありません。
                </div>
              ) : null}
              {deadlines.map((d, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex gap-3 px-4 py-3',
                    i < deadlines.length - 1 ? 'border-b border-border' : '',
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

          <Card
            className="bg-gradient-to-br"
            style={{
              background:
                'linear-gradient(to bottom right, var(--bg-raised), var(--brand-soft))',
            }}
          >
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-md bg-ink text-card grid place-items-center">
                  <Sparkles size={15} />
                </div>
                <div className="text-[13px] font-semibold">学習アシスタントAI</div>
              </div>
              <div className="text-[11.5px] text-ink-2 leading-relaxed">
                教材の内容について質問できます。未解決の時は担当メンターに引き継ぎます。
              </div>
              <Button
                variant="default"
                size="full"
                className="mt-4"
                onClick={() => setPage('__ai')}
              >
                <MessageCircle size={13} />
                質問する
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

const SUBMISSION_META = {
  pending: { label: '添削待ち', variant: 'info' },
  pass: { label: '合格', variant: 'success' },
  resubmit: { label: '再提出', variant: 'warning' },
  fail: { label: '不合格', variant: 'danger' },
} as const;
