import { createFileRoute } from "@tanstack/react-router";

import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { ReviewSession } from "@/components/learner/ReviewSession";

export const Route = createFileRoute("/_app/review")({
  component: ReviewPage,
});

function ReviewPage() {
  const s = useAppShell();
  return (
    <RoleGuard allow={["learner"]}>
      <ReviewSession currentUserId={s.currentUserId} backendEnabled={s.backendEnabled} />
    </RoleGuard>
  );
}
