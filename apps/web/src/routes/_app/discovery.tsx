import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { AdminDiscoveryPage } from "@/components/admin/discovery/AdminDiscoveryPage";

/**
 * 発見教材のレビュー画面 (`/discovery`)。
 * 成績台帳 (`/gradebook`) と同じ場所に残す。開けるのは管理者。
 */
export const Route = createFileRoute("/_app/discovery")({
  component: DiscoveryPage,
});

function DiscoveryPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <AdminDiscoveryPage />
    </RoleGuard>
  );
}
