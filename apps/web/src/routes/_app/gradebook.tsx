import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { Gradebook } from "@/components/instructor/Gradebook";

export const Route = createFileRoute("/_app/gradebook")({
  component: GradebookPage,
});

function GradebookPage() {
  const s = useAppShell();
  return (
    <RoleGuard allow={["instructor", "admin"]} page="gradebook">
      <Gradebook courses={s.courses} />
    </RoleGuard>
  );
}
