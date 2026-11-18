import { createFileRoute } from "@tanstack/react-router";
import { IntegrationsAdmin } from "@/components/admin/IntegrationsAdmin";

// ロールチェックは親レイアウト `_app/admin.tsx` の RoleGuard が担う。
export const Route = createFileRoute("/_app/admin/integrations")({
  component: IntegrationsPage,
});

function IntegrationsPage() {
  return <IntegrationsAdmin />;
}
