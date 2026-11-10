import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { ReviewQueue } from "@/components/instructor/ReviewQueue";

export const Route = createFileRoute("/_app/review-queue")({
  component: ReviewQueuePage,
});

function ReviewQueuePage() {
  const s = useAppShell();
  return (
    <RoleGuard allow={["admin"]}>
      <ReviewQueue
        setPage={s.setPage}
        onOpenReview={s.onOpenReview}
        backendEnabled={s.backendEnabled}
      />
    </RoleGuard>
  );
}
