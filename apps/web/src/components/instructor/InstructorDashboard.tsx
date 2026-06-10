import {
  Calendar,
  Edit,
  MessageCircle,
  AlertTriangle,
  Star,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ChevronRight,
} from '@/lib/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { KpiCard } from '@/components/common/KpiCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardActions } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import type { AvatarTone, Tenant } from '@/data/types';
import type { InstructorStudentProgress } from '@falcon/shared/cms/types';
import { useSubmissions } from '@/hooks/useSubmissions';
import { useInstructorOverview } from '@/hooks/useAnalytics';
import { useOpenQuestions } from '@/hooks/useQuestions';
import { formatSubmittedAt } from '@/lib/submissions-store';
import { cn } from '@/lib/utils';

interface InstructorDashboardProps {
  tenantId: Tenant['id'];
  setPage: (p: string) => void;
  onOpenReview: (submissionId: string) => void;
  supabaseEnabled: boolean;
}

const AVATAR_TONES: AvatarTone[] = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

function toneFromId(id: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % AVATAR_TONES.length;
  return AVATAR_TONES[h] ?? 'c1';
}

/** 進捗率 + 遅延フラグから受講状況バッジを決める。 */
function severityOf(s: InstructorStudentProgress): {
  label: string;
  sev: 'success' | 'warning' | 'danger';
} {
  if (s.overdue || s.progress_pct < 25) return { label: '遅延', sev: 'danger' };
  if (s.progress_pct < 60) return { label: 'やや遅延', sev: 'warning' };
  return { label: '順調', sev: 'success' };
}

/** <input type="date"> ではなく相対表現にする簡易フォーマッタ。 */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'たった今';
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

export const InstructorDashboard = ({
  tenantId,
  setPage,
  onOpenReview,
  supabaseEnabled,
}: InstructorDashboardProps) => {
  const { submissions, pendingCount, aiReadyCount } = useSubmissions(tenantId);
  const pending = submissions.filter((s) => s.status === 'pending');

  const { overview } = useInstructorOverview(tenantId, supabaseEnabled);
  const { threads: openThreads } = useOpenQuestions(supabaseEnabled);

  // 実データ (Supabase 設定時) と fixtures フォールバックを切り替える。
  const openQuestions = overview ? overview.open_questions : 3;
  const overdueLearners = overview ? overview.overdue_learners : 4;
  const totalLearners = overview ? overview.total_learners : 42;
  const students: StudentRow[] = overview
    ? overview.students.map((s) => {
        const sv = severityOf(s);
        return {
          id: s.user_id,
          n: s.display_name,
          c: toneFromId(s.user_id),
          p: s.progress_pct,
          course: s.course_title,
          s: sv.label,
          sev: sv.sev,
        };
      })
    : STUDENT_PROG_DEMO;
  const unanswered: UnansweredRow[] = overview
    ? openThreads.slice(0, 3).map((q) => ({
        id: q.id,
        q: q.title,
        who: q.author_name,
        c: toneFromId(q.author_id),
        t: relativeTime(q.created_at),
      }))
    : UNANSWERED_DEMO;

  return (
  <>
    <PageHeader
      title="講師ダッシュボード"
      sub="担当受講者の進捗 · 添削 · Q&A"
      actions={
        <>
          <Button>
            <Calendar size={14} />
            今週の予定
          </Button>
          <Button variant="accent" onClick={() => setPage('review-queue')}>
            <Edit size={14} />
            添削を開始
          </Button>
        </>
      }
    />

    <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      <KpiCard
        label={
          <>
            <Edit size={12} /> 添削待ち
          </>
        }
        value={pendingCount}
        unit="件"
        trend={
          <>
            <TrendingUp size={12} />
            AI下書き準備済 {aiReadyCount}件
          </>
        }
        trendDir="up"
      />
      <KpiCard
        label={
          <>
            <MessageCircle size={12} /> Q&A 未返信
          </>
        }
        value={openQuestions}
        unit="件"
        trend={unanswered[0] ? `最古 ${unanswered[unanswered.length - 1]?.t ?? ''}` : '未返信なし'}
      />
      <KpiCard
        label={
          <>
            <AlertTriangle size={12} /> 遅延している受講者
          </>
        }
        value={overdueLearners}
        unit={`/ ${totalLearners}名`}
        trend={
          <>
            <TrendingDown size={12} />
            期限超過 · 未完了
          </>
        }
        trendDir={overdueLearners > 0 ? 'down' : 'up'}
      />
      <KpiCard
        label={
          <>
            <Star size={12} /> AI採用率
          </>
        }
        value={74}
        unit="%"
        trend="直近30日間"
      />
    </div>

    <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
      <Card>
        <CardHeader>
          <CardTitle>添削待ちキュー</CardTitle>
          <CardActions>
            <Button size="sm" type="button" onClick={() => setPage('review-queue')}>
              すべて見る ({pendingCount})
            </Button>
          </CardActions>
        </CardHeader>
        <div>
          {pending.slice(0, 4).map((r) => (
            <button
              type="button"
              key={r.id}
              onClick={() => {
                onOpenReview(r.id);
                setPage('review');
              }}
              className="w-full grid items-center gap-3.5 px-4 py-3 border-b border-border last:border-b-0 hover:bg-sunken text-left"
              style={{ gridTemplateColumns: 'auto 1fr auto auto auto' }}
            >
              <Avatar size="sm">
                <AvatarFallback tone={r.avatarTone as AvatarTone}>
                  {r.studentInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-[13.5px] font-medium">
                  {r.studentName} ·{' '}
                  <span className="text-ink-3 font-normal">{r.assignmentTitle}</span>
                </div>
                <div className="text-xs text-ink-3 mt-0.5">
                  {r.courseTitle} · 提出 {formatSubmittedAt(r.submittedAt)}
                </div>
              </div>
              {r.aiReady ? (
                <Badge variant="accent">
                  <Sparkles size={10} />
                  AI下書き
                </Badge>
              ) : (
                <span />
              )}
              {r.priority === 'high' ? (
                <Badge variant="warning">優先</Badge>
              ) : (
                <span style={{ width: 60 }} />
              )}
              <ChevronRight size={14} className="text-ink-4" />
            </button>
          ))}
          {pending.length === 0 ? (
            <div className="px-4 py-8 text-center text-ink-3 text-[12.5px]">
              添削待ちの提出物はありません
            </div>
          ) : null}
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>担当受講者の進捗</CardTitle>
          </CardHeader>
          <div>
            {students.length === 0 ? (
              <div className="px-4 py-8 text-center text-ink-3 text-[12.5px]">
                受講登録された受講者がいません
              </div>
            ) : (
              students.map((s, i) => (
                <div
                  key={s.id ?? i}
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-2.5',
                    i < students.length - 1 ? 'border-b border-border' : '',
                  )}
                >
                  <Avatar size="sm">
                    <AvatarFallback tone={s.c}>{s.n.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium">{s.n}</div>
                    <div className="text-[11.5px] text-ink-3">{s.course}</div>
                  </div>
                  <div className="w-20">
                    <Progress value={s.p} tone="ink" />
                    <div className="text-[11.5px] text-ink-3 font-mono text-right mt-0.5">
                      {s.p}%
                    </div>
                  </div>
                  <Badge variant={s.sev}>{s.s}</Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Q&A 未返信</CardTitle>
          </CardHeader>
          <div>
            {unanswered.length === 0 ? (
              <div className="px-4 py-8 text-center text-ink-3 text-[12.5px]">
                未返信の質問はありません
              </div>
            ) : (
              unanswered.map((q, i) => (
                <div
                  key={q.id ?? i}
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-3',
                    i < unanswered.length - 1 ? 'border-b border-border' : '',
                  )}
                >
                  <Avatar size="sm">
                    <AvatarFallback tone={q.c}>{q.who.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{q.q}</div>
                    <div className="text-[11.5px] text-ink-3">
                      {q.who} · {q.t}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setPage('qa')}>
                    返信
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  </>
  );
};

interface StudentRow {
  id?: string;
  n: string;
  c: AvatarTone;
  p: number;
  course: string;
  s: string;
  sev: 'success' | 'warning' | 'danger';
}

interface UnansweredRow {
  id?: string;
  q: string;
  who: string;
  c: AvatarTone;
  t: string;
}

// Supabase 未設定 (dev fixtures フロー) のフォールバック表示。
const STUDENT_PROG_DEMO: StudentRow[] = [
  { n: '田中 翔太', c: 'c1', p: 62, course: 'Web開発基礎', s: '順調', sev: 'success' },
  { n: '佐藤 美咲', c: 'c2', p: 38, course: 'Web開発基礎', s: 'やや遅延', sev: 'warning' },
  { n: '鈴木 健一', c: 'c3', p: 18, course: 'React入門', s: '遅延', sev: 'danger' },
  { n: '山田 優花', c: 'c4', p: 85, course: '基本情報対策', s: '順調', sev: 'success' },
];

const UNANSWERED_DEMO: UnansweredRow[] = [
  { q: 'thisの束縛についての質問', who: '佐藤 美咲', c: 'c2', t: '6時間前' },
  { q: 'CSS Grid の minmax() について', who: '鈴木 健一', c: 'c3', t: '昨日' },
  { q: 'Node.js のバージョン指定方法', who: '中村 理恵', c: 'c6', t: '昨日' },
];
