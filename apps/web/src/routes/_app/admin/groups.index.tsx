import { createFileRoute } from "@tanstack/react-router";
import { GroupsAdmin } from "@/components/admin/groups/GroupsAdmin";

export const Route = createFileRoute("/_app/admin/groups/")({
  validateSearch: (search: Record<string, unknown>): { clientId?: string } =>
    typeof search.clientId === "string" && search.clientId.trim()
      ? { clientId: search.clientId }
      : {},
  component: GroupsPage,
});

function GroupsPage() {
  const { clientId } = Route.useSearch();
  return <GroupsAdmin key={clientId} clientId={clientId} />;
}
