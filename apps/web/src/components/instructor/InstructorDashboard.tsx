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
import { REVIEW_QUEUE } from '@/data/fixtures';
import type { AvatarTone } from '@/data/types';
import { cn } from '@/lib/utils';

export const InstructorDashboard = ({ setPage }: { setPage: (p: string) => void }) => (
  <>
    <PageHeader
      title="講師ダッシュボード"
      sub="堀江メンター · 担当コース3 · 担当受講者42名"
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
        value={6}
        unit="件"
        trend={
          <>
            <TrendingUp size={12} />
            AI下書き準備済 5件
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
        value={3}
        unit="件"
        trend="最古 6時間前"
      />
      <KpiCard
        label={
          <>
            <AlertTriangle size={12} /> 遅延している受講者
          </>
        }
        value={4}
        unit="/ 42名"
        trend={
          <>
            <TrendingDown size={12} />
            先週比 +1
          </>
        }
        trendDir="down"
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
            <Button size="sm" onClick={() => setPage('review-queue')}>
              すべて見る ({REVIEW_QUEUE.length})
            </Button>
          </CardActions>
        </CardHeader>
        <div>
          {REVIEW_QUEUE.slice(0, 4).map((r) => (
            <button
              type="button"
              key={r.id}
              onClick={() => setPage('review')}
              className="w-full grid items-center gap-3.5 px-4 py-3 border-b border-border last:border-b-0 hover:bg-sunken text-left"
              style={{ gridTemplateColumns: 'auto 1fr auto auto auto' }}
            >
              <Avatar size="sm">
                <AvatarFallback tone={r.c}>{r.initials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-[13.5px] font-medium">
                  {r.student} ·{' '}
                  <span className="text-ink-3 font-normal">{r.assignment}</span>
                </div>
                <div className="text-xs text-ink-3 mt-0.5">
                  {r.course} · 提出 {r.submittedAt}
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
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>担当受講者の進捗</CardTitle>
          </CardHeader>
          <div>
            {STUDENT_PROG.map((s, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-2.5',
                  i < STUDENT_PROG.length - 1 ? 'border-b border-border' : '',
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
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Q&A 未返信</CardTitle>
          </CardHeader>
          <div>
            {UNANSWERED.map((q, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-3',
                  i < UNANSWERED.length - 1 ? 'border-b border-border' : '',
                )}
              >
                <Avatar size="sm">
                  <AvatarFallback tone={q.c}>{q.who.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-[13px] font-medium">{q.q}</div>
                  <div className="text-[11.5px] text-ink-3">
                    {q.who} · {q.t}
                  </div>
                </div>
                <Button size="sm">返信</Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  </>
);

const STUDENT_PROG: Array<{
  n: string;
  c: AvatarTone;
  p: number;
  course: string;
  s: string;
  sev: 'success' | 'warning' | 'danger';
}> = [
  { n: '田中 翔太', c: 'c1', p: 62, course: 'Web開発基礎', s: '順調', sev: 'success' },
  { n: '佐藤 美咲', c: 'c2', p: 38, course: 'Web開発基礎', s: 'やや遅延', sev: 'warning' },
  { n: '鈴木 健一', c: 'c3', p: 18, course: 'React入門', s: '遅延', sev: 'danger' },
  { n: '山田 優花', c: 'c4', p: 85, course: '基本情報対策', s: '順調', sev: 'success' },
];

const UNANSWERED: Array<{ q: string; who: string; c: AvatarTone; t: string }> = [
  { q: 'thisの束縛についての質問', who: '佐藤 美咲', c: 'c2', t: '6時間前' },
  { q: 'CSS Grid の minmax() について', who: '鈴木 健一', c: 'c3', t: '昨日' },
  { q: 'Node.js のバージョン指定方法', who: '中村 理恵', c: 'c6', t: '昨日' },
];
