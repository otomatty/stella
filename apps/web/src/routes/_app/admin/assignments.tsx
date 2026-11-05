import { createFileRoute } from "@tanstack/react-router";
import { AdminAssignmentsPage } from "@/components/admin/AdminAssignmentsPage";

// ロールチェックは親レイアウト `_app/admin.tsx` の RoleGuard が担う。
export const Route = createFileRoute("/_app/admin/assignments")({
  component: AdminAssignmentsPage,
});
