import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { InstructorGeneric } from "@/components/instructor/InstructorGeneric";

export const Route = createFileRoute("/_app/students")({
  component: StudentsPage,
});

function StudentsPage() {
  const s = useAppShell();
  return (
    <RoleGuard allow={["instructor"]}>
      <InstructorGeneric
        page="students"
        tenantId={s.tenantId}
        backendEnabled={s.backendEnabled}
        highlightCourseId={null}
        highlightSeq={0}
      />
    </RoleGuard>
  );
}
