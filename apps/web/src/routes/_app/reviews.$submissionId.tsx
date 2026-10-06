import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { ReviewEditor } from "@/components/instructor/ReviewEditor";

export const Route = createFileRoute("/_app/reviews/$submissionId")({
  component: ReviewEditorPage,
});

function ReviewEditorPage() {
  const s = useAppShell();
  const { submissionId } = Route.useParams();
  // 管理者もレビューできる (#34)。API の権限 (講師・管理者) と同じ。
  return (
    <RoleGuard allow={["instructor", "admin"]}>
      <ReviewEditor tenantId={s.tenantId} submissionId={submissionId} setPage={s.setPage} />
    </RoleGuard>
  );
}
