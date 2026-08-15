import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { AdminAssignmentsPage } from "@/components/admin/AdminAssignmentsPage";

export const Route = createFileRoute("/_app/assignments")({
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const s = useAppShell();
  return (
    <RoleGuard allow={["admin"]} page="assignments">
      <AdminAssignmentsPage tenantId={s.tenantId} />
    </RoleGuard>
  );
}
