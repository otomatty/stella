import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { AdminReportPage } from "@/components/admin/AdminReportPage";

export const Route = createFileRoute("/_app/report")({
  component: ReportPage,
});

function ReportPage() {
  const s = useAppShell();
  return (
    <RoleGuard allow={["admin"]} page="report">
      <AdminReportPage tenantId={s.tenantId} backendEnabled={s.backendEnabled} />
    </RoleGuard>
  );
}
