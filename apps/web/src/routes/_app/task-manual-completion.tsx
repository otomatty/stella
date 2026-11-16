import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { ManualCompletionPage } from "@/components/staff/ManualCompletionPage";
export const Route = createFileRoute("/_app/task-manual-completion")({
  validateSearch: (search: Record<string, unknown>) => ({
    userId: typeof search.userId === "string" ? search.userId : "",
    stageId: typeof search.stageId === "string" ? search.stageId : "",
  }),
  component: Page,
});
function Page() {
  const { userId, stageId } = Route.useSearch();
  return (
    <RoleGuard allow={["admin"]}>
      {userId && stageId ? (
        <ManualCompletionPage key={`${stageId}:${userId}`} userId={userId} stageId={stageId} />
      ) : (
        <p role="alert">受講者とステージを指定して開いてください。</p>
      )}
    </RoleGuard>
  );
}
