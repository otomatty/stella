import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { UsersAdmin } from "@/components/admin/UsersAdmin";

export const Route = createFileRoute("/_app/users")({
  component: UsersPage,
});

function UsersPage() {
  const s = useAppShell();
  return (
    <RoleGuard allow={["admin"]} page="users">
      <UsersAdmin
        tenantId={s.tenantId}
        tenantName={s.tenantName}
        currentUserId={s.currentUserId}
        currentUserRole={s.profileRole ?? null}
        backendEnabled={s.backendEnabled}
      />
    </RoleGuard>
  );
}
