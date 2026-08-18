import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { AdminEnrollmentsPage } from "@/components/admin/AdminEnrollmentsPage";

export const Route = createFileRoute("/_app/enrollments")({
  component: EnrollmentsPage,
});

function EnrollmentsPage() {
  const s = useAppShell();
  return (
    <RoleGuard allow={["admin"]}>
      <AdminEnrollmentsPage
        key={s.tenantId}
        tenantId={s.tenantId}
        backendEnabled={s.backendEnabled}
        profileRole={s.profileRole}
      />
    </RoleGuard>
  );
}
