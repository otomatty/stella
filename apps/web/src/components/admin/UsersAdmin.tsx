import { Upload, Plus, Filter, Search, MoreHorizontal } from '@/lib/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import type { AvatarTone } from '@/data/types';

const USERS: Array<{
  n: string;
  c: AvatarTone;
  e: string;
  r: '受講者' | '講師' | 'テナント管理者';
  o: string;
  p: number | null;
  l: string;
}> = [
  { n: '田中 翔太', c: 'c1', e: 'tanaka@example.com', r: '受講者', o: 'FALCON INFORMAL', p: 62, l: '5分前' },
  { n: '佐藤 美咲', c: 'c2', e: 'sato.m@example.com', r: '受講者', o: 'テックソリューション', p: 38, l: '2時間前' },
  { n: '堀江メンター', c: 'c3', e: 'horie@ursal.co.jp', r: '講師', o: 'FALCON INFORMAL', p: null, l: '10分前' },
  { n: '鈴木 健一', c: 'c4', e: 'suzuki@example.com', r: '受講者', o: 'ブルーコード', p: 18, l: '昨日' },
  { n: '山田 優花', c: 'c5', e: 'yamada@example.com', r: '受講者', o: 'テックソリューション', p: 85, l: '1時間前' },
  { n: '中村 理恵', c: 'c6', e: 'nakamura@ursal.co.jp', r: 'テナント管理者', o: 'FALCON INFORMAL', p: null, l: '3時間前' },
  { n: '渡辺 拓海', c: 'c1', e: 'watanabe@example.com', r: '受講者', o: 'FALCON INFORMAL', p: 72, l: '昨日' },
  { n: '小林 沙織', c: 'c2', e: 'kobayashi@example.com', r: '受講者', o: 'システムズ', p: 52, l: '2日前' },
];

export const UsersAdmin = () => (
  <>
    <PageHeader
      title="ユーザー管理"
      sub="テナント内の全ユーザーを管理 · CSV一括招待 / ロール割当"
      actions={
        <>
          <Button>
            <Upload size={14} />
            CSV一括招待
          </Button>
          <Button variant="accent">
            <Plus size={14} />
            ユーザーを招待
          </Button>
        </>
      }
    />
    <Card className="overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-border">
        <div className="flex items-center gap-2 bg-sunken border border-border rounded-md px-2.5 py-1.5 w-[280px] text-ink-3 text-[12.5px]">
          <Search size={13} />
          <input
            placeholder="名前・メールで検索…"
            className="flex-1 min-w-0 bg-transparent border-none outline-none placeholder:text-ink-3"
          />
        </div>
        <Badge>全 219名</Badge>
        <Badge variant="info">受講者 198</Badge>
        <Badge variant="accent">講師 12</Badge>
        <Badge>管理者 9</Badge>
        <div className="flex-1" />
        <Button size="sm">
          <Filter size={13} />
          フィルター
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名前</TableHead>
            <TableHead>メール</TableHead>
            <TableHead>ロール</TableHead>
            <TableHead>組織</TableHead>
            <TableHead>進捗</TableHead>
            <TableHead>最終ログイン</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {USERS.map((u, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback tone={u.c}>{u.n.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{u.n}</span>
                </div>
              </TableCell>
              <TableCell className="text-ink-3">{u.e}</TableCell>
              <TableCell>
                {u.r === '講師' ? (
                  <Badge variant="accent">講師</Badge>
                ) : u.r === 'テナント管理者' ? (
                  <Badge variant="solid">管理者</Badge>
                ) : (
                  <Badge>受講者</Badge>
                )}
              </TableCell>
              <TableCell className="text-ink-3">{u.o}</TableCell>
              <TableCell>
                {u.p !== null ? (
                  <div className="flex items-center gap-2">
                    <div className="w-[60px]">
                      <Progress value={u.p} tone="brand" />
                    </div>
                    <span className="font-mono text-[11.5px]">{u.p}%</span>
                  </div>
                ) : (
                  <span className="text-ink-3 text-[11.5px]">—</span>
                )}
              </TableCell>
              <TableCell className="text-ink-3 text-[11.5px]">{u.l}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon-sm">
                  <MoreHorizontal size={13} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  </>
);
