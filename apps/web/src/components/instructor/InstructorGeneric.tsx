import { ChevronRight } from '@/lib/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

const titles: Record<string, string> = {
  students: '担当受講者',
  qa: 'Q&A 未返信',
  courses: '担当コース',
};

export const InstructorGeneric = ({ page }: { page: string }) => {
  const toneFor = (i: number): AvatarTone => (['c1', 'c2', 'c3', 'c4', 'c5', 'c6'] as const)[i % 6];
  return (
    <>
      <PageHeader title={titles[page] ?? page} sub="フィルターして一覧表示" />
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前/課題</TableHead>
              <TableHead>コース</TableHead>
              <TableHead>状態</TableHead>
              <TableHead>更新</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <TableRow key={i} interactive>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback tone={toneFor(i - 1)}>U{i}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">受講者 {i}</span>
                  </div>
                </TableCell>
                <TableCell className="text-ink-3">Web開発基礎</TableCell>
                <TableCell>
                  {i % 2 ? (
                    <Badge variant="success">順調</Badge>
                  ) : (
                    <Badge variant="warning">要フォロー</Badge>
                  )}
                </TableCell>
                <TableCell className="text-ink-3 text-[11.5px]">{i}時間前</TableCell>
                <TableCell>
                  <ChevronRight size={14} className="text-ink-4" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
};
