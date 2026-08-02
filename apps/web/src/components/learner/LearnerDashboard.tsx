import {
  Calendar,
  Play,
  Book,
  Flame,
  Clock,
  Award,
  TrendingUp,
  ChevronRight,
  MessageCircle,
  Sparkles,
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
import { useMySubmissions } from '@/hooks/useMySubmissions';
import { formatSubmittedAt } from '@/lib/submissions-store';
import { cn } from '@/lib/utils';

interface LearnerDashboardProps {
  setPage: (page: string) => void;
  courses: Course[];
  announcementsHook: UseAnnouncementsResult;
  coursesError: string | null;
  onOpenSubmission: (submissionId: string) => void;
}

/** ISO 文字列を「M月D日」表記にする。 不正値は空文字。 */
function formatAnnouncementDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

const NEW_WINDOW_MS = 7 * 86_400_000;

export const LearnerDashboard = ({
  setPage,
  courses,
  announcementsHook,
  coursesError,
  onOpenSubmission,
}: LearnerDashboardProps) => {
  const active = courses.filter((c) => !c.completed && c.progress > 0);
  const current = active[0];
  const {
    submissions,
    loading: submissionsLoading,
    error: submissionsError,
  } = useMySubmissions(true);

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
        title="おかえりなさい、翔太さん"
        sub={
          <>
            今日も学習を続けましょう。連続学習 <strong className="text-foreground">12日</strong> · 今週 3時間20分
          </>
        }
        actions={
          <>
            <Button variant="default">
              <Calendar size={14} />
              学習スケジュール
            </Button>
            <Button variant="accent" onClick={() => setPage('lesson')}>
              <Play size={14} />
              続きから学習
            </Button>
          </>
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

      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
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
          value={12}
          unit="日"
          trend={
            <>
              <TrendingUp size={12} />
              自己ベスト更新中
            </>
          }
          trendDir="up"
        />
        <KpiCard
          label={
            <>
              <Clock size={12} /> 今週の学習時間
            </>
          }
          value="3:20"
          unit="/ 目標 5:00"
        >
          <Progress value={66} className="mt-2" tone="brand" />
        </KpiCard>
        <KpiCard
          label={
            <>
              <Award size={12} /> 修了証
            </>
          }
          value={1}
          unit="/ 2 見込み"
          trend={<>次の修了まで 38%</>}
        />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
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
              <div className="grid" style={{ gridTemplateColumns: '220px 1fr', gap: 0 }}>
                <div className="relative border-r border-border">
                  <CourseThumb color={current.color} label={current.category} />
                </div>
                <div className="p-4 pl-5">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <Badge variant="accent">受講中</Badge>
                    <span className="text-[11.5px] text-ink-3">
                      セクション 03 · レッスン 10/24
                    </span>
                  </div>
                  <div className="text-[15px] font-semibold leading-snug mb-1">関数とスコープ</div>
                  <div className="text-[11.5px] text-ink-3 mb-3">{current.title}</div>
                  <div className="flex items-center gap-3 mb-3.5">
                    <div className="flex-1">
                      <div className="text-[11.5px] text-ink-3 mb-2">進捗 {current.progress}%</div>
                      <Progress value={current.progress} tone="brand" />
                    </div>
                    <div className="text-[11.5px] text-ink-3 flex items-center gap-1">
                      <Clock size={12} />
                      残り 約11時間
                    </div>
                  </div>
                  <Button variant="primary" onClick={() => setPage('lesson')}>
                    <Play size={13} />
                    再生を続ける (14:20 から)
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
                <span className="text-[11.5px] text-ink-3">直近14日</span>
              </CardActions>
            </CardHeader>
            <div className="p-4 h-60 relative">
              <WeeklyChart />
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

const WEEK = [32, 45, 0, 58, 72, 38, 48, 55, 62, 25, 88, 72, 40, 62];
const DAY = ['月', '火', '水', '木', '金', '土', '日', '月', '火', '水', '木', '金', '土', '日'];

const WeeklyChart = () => (
  <svg viewBox="0 0 560 200" className="w-full h-full">
    {[0, 1, 2, 3].map((i) => (
      <line
        key={i}
        x1="40"
        y1={40 + i * 40}
        x2="550"
        y2={40 + i * 40}
        stroke="var(--line)"
        strokeDasharray="2 4"
      />
    ))}
    {[40, 80, 120, 160].map((y, i) => (
      <text key={i} x="35" y={y + 3} textAnchor="end" className="fill-ink-3 text-[10.5px]">
        {[3, 2, 1, 0][i]}h
      </text>
    ))}
    {WEEK.map((v, i) => {
      const x = 55 + i * 34;
      const h = v * 1.6;
      return (
        <rect
          key={i}
          x={x}
          y={160 - h}
          width="18"
          height={h}
          rx="2"
          fill="var(--ink)"
          opacity={i > 6 ? 1 : 0.55}
        />
      );
    })}
    {DAY.map((d, i) => (
      <text
        key={i}
        x={55 + i * 34 + 9}
        y="178"
        textAnchor="middle"
        className="fill-ink-3 text-[10.5px]"
      >
        {d}
      </text>
    ))}
  </svg>
);
