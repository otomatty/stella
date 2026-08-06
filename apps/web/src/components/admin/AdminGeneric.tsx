import { Folder, FileText } from '@/lib/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';

const titles: Record<string, { t: string; s: string }> = {
  orgs: { t: '組織マスタ', s: '顧客企業・学校の登録管理' },
  report: { t: 'レポート', s: 'CSV / Excel エクスポート対応' },
};

export const AdminGeneric = ({ page }: { page: string }) => {
  const info = titles[page];
  if (!info) {
    return <GenericEmpty page={page} />;
  }

  return (
    <>
      <PageHeader title={info.t} sub={info.s} />
      <Card className="text-center p-16 text-ink-3 text-sm">
        <div className="w-10 h-10 rounded-full bg-sunken grid place-items-center text-ink-3 mx-auto mb-3">
          <Folder size={20} />
        </div>
        このセクションは未実装です（仕様書 F1x / F7x に対応予定）。
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
      このページは未実装です。
    </Card>
  </>
);
