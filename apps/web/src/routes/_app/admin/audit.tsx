import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { AdminAuditPage } from "@/components/admin/AdminAuditPage";

// ロールチェックは親レイアウト `_app/admin.tsx` の RoleGuard が担う。
export const Route = createFileRoute("/_app/admin/audit")({
  component: AuditPage,
});

function AuditPage() {
  const s = useAppShell();
  return <AdminAuditPage tenantId={s.tenantId} backendEnabled={s.backendEnabled} />;
}
