/**
 * UsersAdmin のデモ版 (バックエンド未設定時)。 デモデータを read-only で表示する。
 */

import { Upload, Plus, MoreHorizontal } from '@/lib/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import type { AvatarTone } from '@/data/types';
import type { ProfileRole } from '@falcon/shared/cms/types';

import { RoleBadge } from './shared';

const DEMO_USERS: Array<{
  n: string;
  c: AvatarTone;
  e: string;
  r: ProfileRole;
}> = [
  { n: '田中 翔太', c: 'c1', e: 'tanaka@example.com', r: 'student' },
  { n: '佐藤 美咲', c: 'c2', e: 'sato.m@example.com', r: 'student' },
  { n: '堀江メンター', c: 'c3', e: 'horie@ursal.co.jp', r: 'instructor' },
  { n: '鈴木 健一', c: 'c4', e: 'suzuki@example.com', r: 'student' },
  { n: '中村 理恵', c: 'c6', e: 'nakamura@ursal.co.jp', r: 'admin' },
];

export function UsersAdminDemo() {
  return (
    <>
      <PageHeader
        title="ユーザー管理"
        sub="テナント内の全ユーザーを管理 · CSV一括招待 / ロール割当"
        actions={
          <>
            <Button disabled>
              <Upload size={14} />
              CSV一括招待
            </Button>
            <Button variant="accent" disabled>
              <Plus size={14} />
              ユーザーを招待
            </Button>
          </>
        }
      />
      <div className="mb-4 rounded-md border border-border bg-sunken px-3 py-2 text-[12.5px] text-ink-3">
        バックエンド未設定のためデモデータを表示しています。 招待 / ロール変更を行うには
        <code className="mx-1">VITE_SERVER_URL</code> を設定してください。
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>メール</TableHead>
              <TableHead>ロール</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEMO_USERS.map((u, i) => (
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
                  <RoleBadge role={u.r} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon-sm" disabled>
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
}
