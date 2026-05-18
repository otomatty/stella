import {
  Upload,
  Plus,
  Download,
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
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { SES_COURSES } from '@/data/fixtures';

const titles: Record<string, { t: string; s: string }> = {
  courses: { t: 'コース管理', s: '公開状態 / テンプレート化 / 複製' },
  orgs: { t: '組織マスタ', s: '顧客企業・学校の登録管理' },
  report: { t: 'レポート', s: 'CSV / Excel エクスポート対応' },
  audit: { t: '監査ログ', s: '認証・権限変更・削除操作 — 1年以上保管' },
};

const AUDIT_ROWS = [
  { t: '14:32:18', a: '堀江メンター', ac: 'add_review', tg: 'submission/r1', ip: '10.0.3.22' },
  { t: '14:28:05', a: '中村 理恵', ac: 'role_change', tg: 'user/u_142', ip: '10.0.3.5' },
  { t: '13:05:44', a: 'sys_admin', ac: 'tenant_update', tg: 'tenant/ses', ip: '10.0.0.1' },
  { t: '12:18:30', a: '堀江メンター', ac: 'course_publish', tg: 'course/web-fundamentals', ip: '10.0.3.22' },
  { t: '11:02:09', a: '中村 理恵', ac: 'user_invite', tg: 'email/sato.m', ip: '10.0.3.5' },
  { t: '10:45:12', a: '田中 翔太', ac: 'login', tg: 'auth/magiclink', ip: '124.32.11.8' },
];

export const AdminGeneric = ({ page }: { page: string }) => {
  const info = titles[page];
  if (!info) {
    return <GenericEmpty page={page} />;
  }

  if (page === 'audit') {
    return (
      <>
        <PageHeader
          title={info.t}
          sub={info.s}
          actions={
            <Button>
              <Download size={14} />
              CSV出力
            </Button>
          }
        />
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日時</TableHead>
                <TableHead>実行者</TableHead>
                <TableHead>操作</TableHead>
                <TableHead>対象</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {AUDIT_ROWS.map((l, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-[11.5px]">
                    2026-04-18 {l.t}
                  </TableCell>
                  <TableCell>{l.a}</TableCell>
                  <TableCell>
                    <Badge>{l.ac}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[11.5px] text-ink-3">
                    {l.tg}
                  </TableCell>
                  <TableCell className="font-mono text-[11.5px] text-ink-3">
                    {l.ip}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </>
    );
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
