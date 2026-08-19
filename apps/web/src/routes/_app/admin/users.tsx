import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { UsersAdmin } from "@/components/admin/UsersAdmin";

// ロールチェックは親レイアウト `_app/admin.tsx` の RoleGuard が担う。
export const Route = createFileRoute("/_app/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const s = useAppShell();
  return (
    <UsersAdmin
      tenantId={s.tenantId}
      tenantName={s.tenantName}
      currentUserId={s.currentUserId}
      currentUserRole={s.profileRole ?? null}
      backendEnabled={s.backendEnabled}
    />
  );
}
