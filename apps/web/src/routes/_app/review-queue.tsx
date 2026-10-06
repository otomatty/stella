import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { ReviewQueue } from "@/components/instructor/ReviewQueue";

export const Route = createFileRoute("/_app/review-queue")({
  component: ReviewQueuePage,
});

function ReviewQueuePage() {
  const s = useAppShell();
  // 管理者もレビューできる (#34)。API の権限 (講師・管理者) と同じ。
  return (
    <RoleGuard allow={["instructor", "admin"]}>
      <ReviewQueue
        tenantId={s.tenantId}
        setPage={s.setPage}
        onOpenReview={s.onOpenReview}
        currentUserId={s.currentUserId}
        backendEnabled={s.backendEnabled}
      />
    </RoleGuard>
  );
}
