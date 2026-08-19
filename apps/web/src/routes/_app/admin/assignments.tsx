import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { AdminAssignmentsPage } from "@/components/admin/AdminAssignmentsPage";

// ロールチェックは親レイアウト `_app/admin.tsx` の RoleGuard が担う。
export const Route = createFileRoute("/_app/admin/assignments")({
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const s = useAppShell();
  return <AdminAssignmentsPage tenantId={s.tenantId} />;
}
