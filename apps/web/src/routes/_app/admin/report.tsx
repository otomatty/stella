import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { AdminReportPage } from "@/components/admin/AdminReportPage";

// ロールチェックは親レイアウト `_app/admin.tsx` の RoleGuard が担う。
export const Route = createFileRoute("/_app/admin/report")({
  component: ReportPage,
});

function ReportPage() {
  const s = useAppShell();
  return <AdminReportPage tenantId={s.tenantId} backendEnabled={s.backendEnabled} />;
}
