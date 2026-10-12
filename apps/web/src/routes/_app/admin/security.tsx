import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { AdminSecurityPage } from "@/components/admin/AdminSecurityPage";

// ロールチェックは親レイアウト `_app/admin.tsx` の RoleGuard が担う (admin / platform_admin)。
export const Route = createFileRoute("/_app/admin/security")({
  component: SecurityPage,
});

function SecurityPage() {
  const s = useAppShell();
  return <AdminSecurityPage backendEnabled={s.backendEnabled} />;
}
