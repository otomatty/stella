import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { RoleGuard } from '@/components/shell/RoleGuard';
import { AdminAuditPage } from '@/components/admin/AdminAuditPage';

export const Route = createFileRoute('/_app/audit')({
  component: AuditPage,
});

function AuditPage() {
  const s = useAppShell();
  return (
    <RoleGuard allow={['admin']} page="audit">
      <AdminAuditPage tenantId={s.tenantId} backendEnabled={s.backendEnabled} />
    </RoleGuard>
  );
}
