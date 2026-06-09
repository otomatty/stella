import {
  Upload,
  Plus,
  Folder,
  Edit,
  MoreHorizontal,
  FileText,
} from '@/lib/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CourseThumb } from '@/components/common/CourseThumb';
import { SES_COURSES } from '@/data/fixtures';

const titles: Record<string, { t: string; s: string }> = {
  courses: { t: 'コース管理', s: '公開状態 / テンプレート化 / 複製' },
  orgs: { t: '組織マスタ', s: '顧客企業・学校の登録管理' },
  report: { t: 'レポート', s: 'CSV / Excel エクスポート対応' },
};

export const AdminGeneric = ({ page }: { page: string }) => {
  const info = titles[page];
  if (!info) {
    return <GenericEmpty page={page} />;
  }

  if (page === 'courses') {
    return (
      <>
        <PageHeader
          title={info.t}
          sub={info.s}
          actions={
            <>
              <Button>
                <Upload size={14} />
                SCORMインポート
              </Button>
              <Button variant="accent">
                <Plus size={14} />
                新規コース
              </Button>
            </>
          }
        />
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {SES_COURSES.map((c) => (
            <div
              key={c.id}
              className="bg-card border border-border rounded-lg overflow-hidden flex flex-col"
            >
              <div className="relative">
                <CourseThumb color={c.color} />
                <div className="absolute top-2.5 left-2.5">
                  {c.completed ? (
                    <Badge variant="success">公開中</Badge>
                  ) : c.progress === 0 ? (
                    <Badge>下書き</Badge>
                  ) : (
                    <Badge variant="accent">公開中</Badge>
                  )}
                </div>
                <div className="absolute top-2.5 right-2.5">
                  <Button variant="ghost" size="icon-sm" className="bg-card">
                    <MoreHorizontal size={13} />
                  </Button>
                </div>
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="text-[15px] font-semibold leading-snug tracking-tight">
                  {c.title}
                </div>
                <div className="text-[11.5px] text-ink-3 flex gap-3 items-center">
                  <span>{c.lessonsCount}レッスン</span>
                  <span className="w-[3px] h-[3px] rounded-full bg-ink-4" />
                  <span>受講者 {30 + Math.floor(Math.random() * 60)}名</span>
                </div>
                <div className="mt-auto flex items-center justify-between text-xs">
                  <span className="text-[11.5px] text-ink-3">
                    最終更新 4月{14 + Math.floor(Math.random() * 4)}日
                  </span>
                  <Button size="sm">
                    <Edit size={12} />
                    編集
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={info.t} sub={info.s} />
      <Card className="text-center p-16 text-ink-3 text-sm">
        <div className="w-10 h-10 rounded-full bg-sunken grid place-items-center text-ink-3 mx-auto mb-3">
          <Folder size={20} />
        </div>
        このセクションはプロトタイプでは省略されています（仕様書 F1x / F7x に対応）。
      </Card>
    </>
  );
};

export const GenericEmpty = ({ page }: { page: string }) => (
  <>
    <PageHeader title={page} />
    <Card className="text-center p-16 text-ink-3 text-sm">
      <div className="w-10 h-10 rounded-full bg-sunken grid place-items-center text-ink-3 mx-auto mb-3">
        <FileText size={20} />
      </div>
      このページはプロトタイプでは省略されています。
    </Card>
  </>
);
