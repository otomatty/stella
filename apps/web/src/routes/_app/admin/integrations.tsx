import { createFileRoute } from "@tanstack/react-router";
import { IntegrationsAdmin } from "@/components/admin/IntegrationsAdmin";
import { AccessDeniedScreen } from "@/components/common/AccessDeniedScreen";
import { useAppShell } from "@/components/shell/app-shell-context";
export const Route = createFileRoute("/_app/admin/integrations")({ component: IntegrationsPage });
function IntegrationsPage() {
  const shell = useAppShell();
  if (shell.profileRole !== "platform_admin") return <AccessDeniedScreen allow={[]} />;
  return <IntegrationsAdmin />;
}
