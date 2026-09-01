import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { StageGrantsPage } from "@/components/instructor/StageGrantsPage";

export const Route = createFileRoute("/_app/stage-grants")({
  component: StageGrantsRoutePage,
});

function StageGrantsRoutePage() {
  const s = useAppShell();
  return (
    <RoleGuard allow={["instructor", "admin"]}>
      <StageGrantsPage backendEnabled={s.backendEnabled} />
    </RoleGuard>
  );
}
