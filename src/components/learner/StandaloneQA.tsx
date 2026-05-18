import { Plus } from '@/lib/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const THREADS = [
  {
    t: '関数とスコープ — クロージャのメモリモデル',
    c: 'Web開発基礎',
    s: '堀江メンターより返信',
    unread: 2,
    time: '14:48',
  },
  {
    t: 'CSS の Grid と Flex、使い分けのコツは？',
    c: 'Web開発基礎',
    s: '自己解決',
    unread: 0,
    time: '昨日',
  },
  {
    t: 'Git の reset と revert の違いについて',
    c: 'Git/GitHub',
    s: '講師待ち',
    unread: 0,
    time: '3日前',
  },
];

export const StandaloneQA = () => (
  <>
    <PageHeader
      title="Q&A"
      sub="あなたのスレッド · 講師 / AIアシスタント"
      actions={
        <Button variant="accent">
          <Plus size={14} />
          新しい質問
        </Button>
      }
    />
    <Card>
      {THREADS.map((q, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-3.5 px-5 py-3.5 cursor-pointer',
            i < THREADS.length - 1 ? 'border-b border-border' : '',
          )}
        >
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              q.unread ? 'bg-brand' : 'bg-border-strong',
            )}
          />
          <div className="flex-1">
            <div className="text-[13.5px] font-semibold">{q.t}</div>
            <div className="text-[11.5px] text-ink-3 mt-1">
              {q.c} · {q.s}
            </div>
          </div>
          {q.unread > 0 ? <Badge variant="accent">{q.unread} 新着</Badge> : null}
          <span className="text-[11.5px] text-ink-3">{q.time}</span>
        </div>
      ))}
    </Card>
  </>
);
