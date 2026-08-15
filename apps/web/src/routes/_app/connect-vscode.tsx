import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { ConnectVscodePage } from "@/components/learner/ConnectVscodePage";

export const Route = createFileRoute("/_app/connect-vscode")({
  component: ConnectVscode,
});

function ConnectVscode() {
  return (
    <RoleGuard allow={["learner"]} page="connect-vscode">
      <ConnectVscodePage />
    </RoleGuard>
  );
}
