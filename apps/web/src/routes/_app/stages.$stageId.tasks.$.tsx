import { createFileRoute, type SearchSchemaInput } from "@tanstack/react-router";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { StaffTaskDetail } from "@/components/staff/StaffTaskDetail";
import { parseStaffTaskTab } from "@/components/staff/staff-task-detail";

export const Route = createFileRoute("/_app/stages/$stageId/tasks/$")({
  validateSearch: (search: { tab?: unknown } & SearchSchemaInput) => ({
    tab: parseStaffTaskTab(search.tab),
  }),
  component: StaffTaskDetailPage,
});

function StaffTaskDetailPage() {
  const { stageId, _splat } = Route.useParams();
  return (
    <RoleGuard allow={["admin"]}>
      <StaffTaskDetail key={`${stageId}/${_splat}`} stageId={stageId} taskId={_splat ?? ""} />
    </RoleGuard>
  );
}
