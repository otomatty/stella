import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { AdminOrganizationsPage } from '@/components/admin/AdminOrganizationsPage';

export const Route = createFileRoute('/_app/orgs')({
  component: OrgsPage,
});

function OrgsPage() {
  const s = useAppShell();
  // 組織マスタは platform_admin のみ。 tenant admin 等が URL 直叩きしても表示しない。
  if (s.profileRole !== 'platform_admin') {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <div className="text-[15px] font-semibold mb-2">権限がありません</div>
        <div className="text-[12.5px] text-ink-3 mb-4">
          組織マスタはプラットフォーム管理のみ利用できます。
        </div>
        <button
          type="button"
          className="text-[12.5px] text-brand underline underline-offset-2"
          onClick={() => s.setPage('dash')}
        >
          ダッシュボードに戻る
        </button>
      </div>
    );
  }
  return <AdminOrganizationsPage backendEnabled={s.backendEnabled} />;
}
