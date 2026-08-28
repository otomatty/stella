import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { AdminEnrollmentsPage } from "@/components/admin/AdminEnrollmentsPage";

// ロールチェックは親レイアウト `_app/admin.tsx` の RoleGuard が担う。
export const Route = createFileRoute("/_app/admin/enrollments")({
  component: EnrollmentsPage,
});

function EnrollmentsPage() {
  const s = useAppShell();
  return (
    <AdminEnrollmentsPage
      key={s.tenantId}
      tenantId={s.tenantId}
      backendEnabled={s.backendEnabled}
    />
  );
}
