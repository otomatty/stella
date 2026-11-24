import { createFileRoute } from "@tanstack/react-router";
import { GroupAdminDetail } from "@/components/admin/groups/GroupAdminDetail";

export const Route = createFileRoute("/_app/admin/groups/$groupId")({
  component: GroupDetailPage,
});

function GroupDetailPage() {
  const { groupId } = Route.useParams();
  return <GroupAdminDetail key={groupId} groupId={groupId} />;
}
