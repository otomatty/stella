import { Filter, Sliders, ChevronRight, Sparkles } from '@/lib/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { REVIEW_QUEUE } from '@/data/fixtures';

export const ReviewQueue = ({ setPage }: { setPage: (p: string) => void }) => {
  const readyCount = REVIEW_QUEUE.filter((r) => r.aiReady).length;

  return (
    <>
      <PageHeader
        title="添削待ちキュー"
        sub={`${REVIEW_QUEUE.length}件の提出物 · うちAI下書き準備済 ${readyCount}件`}
        actions={
          <>
            <Button>
              <Filter size={14} />
              フィルター
            </Button>
            <Button>
              <Sliders size={14} />
              ソート
            </Button>
          </>
        }
      />
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>受講者</TableHead>
              <TableHead>課題</TableHead>
              <TableHead>コース</TableHead>
              <TableHead>提出日時</TableHead>
              <TableHead>AI</TableHead>
              <TableHead>優先度</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {REVIEW_QUEUE.map((r) => (
              <TableRow key={r.id} interactive onClick={() => setPage('review')}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback tone={r.c}>{r.initials}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{r.student}</span>
                  </div>
                </TableCell>
                <TableCell>{r.assignment}</TableCell>
                <TableCell className="text-ink-3">{r.course}</TableCell>
                <TableCell className="text-ink-3">{r.submittedAt}</TableCell>
                <TableCell>
                  {r.aiReady ? (
                    <Badge variant="accent">
                      <Sparkles size={10} />
                      準備済
                    </Badge>
                  ) : (
                    <span className="text-ink-3 text-[11.5px]">生成中</span>
                  )}
                </TableCell>
                <TableCell>
                  {r.priority === 'high' ? (
                    <Badge variant="warning">優先</Badge>
                  ) : r.priority === 'low' ? (
                    <Badge>低</Badge>
                  ) : (
                    <Badge variant="info">通常</Badge>
                  )}
                </TableCell>
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
