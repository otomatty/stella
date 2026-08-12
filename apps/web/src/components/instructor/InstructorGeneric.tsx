import { useEffect, useRef } from 'react';
import { Loader2, ChevronRight } from '@/lib/icons';
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
import { CourseThumb } from '@/components/common/CourseThumb';
import type { AvatarTone, Tenant } from '@/data/types';
import type { InstructorStudentProgress } from '@falcon/shared/cms/types';
import { useCoursesForTenant } from '@/data/courses-source';
import { useInstructorOverview } from '@/hooks/useAnalytics';
import { cn } from '@/lib/utils';

const titles: Record<string, string> = {
  students: '担当受講者',
  qa: 'Q&A 未返信',
  courses: '担当コース',
};

const AVATAR_TONES: AvatarTone[] = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

function toneForIndex(i: number): AvatarTone {
  return AVATAR_TONES[i % AVATAR_TONES.length] ?? 'c1';
}

function toneFromId(id: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % AVATAR_TONES.length;
  return AVATAR_TONES[h] ?? 'c1';
}

function severityOf(s: InstructorStudentProgress): {
  label: string;
  variant: 'success' | 'warning' | 'danger';
} {
  if (s.overdue || s.progress_pct < 25) return { label: '遅延', variant: 'danger' };
  if (s.progress_pct < 60) return { label: 'やや遅延', variant: 'warning' };
  return { label: '順調', variant: 'success' };
}

interface Props {
  page: string;
  tenantId: Tenant['id'];
  backendEnabled: boolean;
  /** 検索から指定されたコース。 一覧内で強調表示してスクロールする (Issue #77)。 */
  highlightCourseId?: string | null;
  /** 同じコースを選び直したときにも再度スクロールさせるための版番号。 */
  highlightSeq?: number;
}

export const InstructorGeneric = ({
  page,
  tenantId,
  backendEnabled,
  highlightCourseId = null,
  highlightSeq = 0,
}: Props) => {
  if (page === 'courses') {
    return (
      <InstructorCoursesPage
        tenantId={tenantId}
        backendEnabled={backendEnabled}
        highlightCourseId={highlightCourseId}
        highlightSeq={highlightSeq}
      />
    );
  }
  if (page === 'students') {
    return (
      <InstructorStudentsPage tenantId={tenantId} backendEnabled={backendEnabled} />
    );
  }

  return (
    <>
      <PageHeader title={titles[page] ?? page} sub="フィルターして一覧表示" />
      <Card className="text-center p-16 text-ink-3 text-sm">
        このページは準備中です。
      </Card>
    </>
  );
};

function InstructorStudentsPage({
  tenantId,
  backendEnabled,
}: {
  tenantId: Tenant['id'];
  backendEnabled: boolean;
}) {
  const { overview, loading, error } = useInstructorOverview(tenantId, backendEnabled);

  return (
    <>
      <PageHeader title={titles.students} sub="フィルターして一覧表示" />
      {backendEnabled && loading ? (
        <Card className="p-12 flex items-center justify-center gap-2 text-sm text-ink-3">
          <Loader2 size={16} className="animate-spin" />
          読み込み中…
        </Card>
      ) : backendEnabled && error ? (
        <Card className="p-12 text-center text-sm text-destructive">
          受講者一覧の取得に失敗しました: {error}
        </Card>
      ) : (
        <StudentsTable
          rows={
            backendEnabled
              ? (overview?.students ?? []).map((s, i) => {
                  const sv = severityOf(s);
                  return {
                    key: `${s.user_id}:${s.course_title}`,
                    name: s.display_name || `受講者 ${i + 1}`,
                    tone: toneFromId(s.user_id),
                    course: s.course_title || '—',
                    statusLabel: sv.label,
                    statusVariant: sv.variant,
                    updated: `${s.progress_pct}%`,
                  };
                })
              : DEMO_STUDENT_ROWS
          }
        />
      )}
    </>
  );
}

function InstructorCoursesPage({
  tenantId,
  backendEnabled,
  highlightCourseId,
  highlightSeq,
}: {
  tenantId: Tenant['id'];
  backendEnabled: boolean;
  highlightCourseId: string | null;
  highlightSeq: number;
}) {
  const { courses, loading, error } = useCoursesForTenant(tenantId, true);
  const highlightRef = useRef<HTMLDivElement>(null);

  // 検索から来たコースを可視領域に入れる。 同じコースを選び直した場合も
  // highlightSeq が変わるので再度スクロールする。
  useEffect(() => {
    if (!highlightCourseId) return;
    highlightRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlightCourseId, highlightSeq, courses]);

  const rows = courses.map((c) => ({
    key: c.id,
    title: c.title,
    color: c.color,
    lessonsCount: c.lessonsCount,
    statusLabel: c.completed ? '完了' : '公開中',
    statusVariant: (c.completed ? 'success' : 'accent') as 'success' | 'accent',
  }));

  return (
    <>
      <PageHeader title={titles.courses} sub="担当コース一覧" />
      {backendEnabled && loading ? (
        <Card className="p-12 flex items-center justify-center gap-2 text-sm text-ink-3">
          <Loader2 size={16} className="animate-spin" />
          読み込み中…
        </Card>
      ) : backendEnabled && error ? (
        <Card className="p-12 text-center text-sm text-destructive">
          コース一覧の取得に失敗しました: {error}
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center text-sm text-ink-3">
          担当コースがありません。
        </Card>
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {rows.map((c) => {
            const highlighted = c.key === highlightCourseId;
            return (
            <div
              key={c.key}
              ref={highlighted ? highlightRef : undefined}
              className={cn(
                'bg-card border rounded-lg overflow-hidden flex flex-col',
                highlighted
                  ? 'border-brand ring-[3px] ring-brand-soft'
                  : 'border-border',
              )}
            >
              <div className="relative">
                <CourseThumb color={c.color} />
                <div className="absolute top-2.5 left-2.5">
                  <Badge variant={c.statusVariant}>{c.statusLabel}</Badge>
                </div>
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="text-[15px] font-semibold leading-snug tracking-tight">
                  {c.title}
                </div>
                <div className="text-[11.5px] text-ink-3">{c.lessonsCount}レッスン</div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function StudentsTable({
  rows,
}: {
  rows: Array<{
    key: string;
    name: string;
    tone: AvatarTone;
    course: string;
    statusLabel: string;
    statusVariant: 'success' | 'warning' | 'danger';
    updated: string;
  }>;
}) {
  if (rows.length === 0) {
    return (
      <Card className="p-12 text-center text-sm text-ink-3">
        担当受講者がいません。
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名前</TableHead>
            <TableHead>コース</TableHead>
            <TableHead>状態</TableHead>
            <TableHead>進捗</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key} interactive>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback tone={row.tone}>{row.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{row.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-ink-3">{row.course}</TableCell>
              <TableCell>
                <Badge variant={row.statusVariant}>{row.statusLabel}</Badge>
              </TableCell>
              <TableCell className="text-ink-3 text-[11.5px]">{row.updated}</TableCell>
              <TableCell>
                <ChevronRight size={14} className="text-ink-4" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

const DEMO_STUDENT_ROWS = [1, 2, 3, 4, 5, 6].map((i) => ({
  key: `demo-${i}`,
  name: `受講者 ${i}`,
  tone: toneForIndex(i - 1),
  course: 'Web開発基礎',
  statusLabel: i % 2 ? '順調' : '要フォロー',
  statusVariant: (i % 2 ? 'success' : 'warning') as 'success' | 'warning',
  updated: `${i}時間前`,
}));
