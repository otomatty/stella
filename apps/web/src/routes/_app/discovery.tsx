import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { AdminDiscoveryPage } from "@/components/admin/discovery/AdminDiscoveryPage";

/**
 * 発見教材のレビュー画面 (`/discovery`)。
 *
 * `/admin/*` ではなく成績台帳 (`/gradebook`) と同じ **staff 共有ページ** に置く。
 * API は staff (instructor / admin) に開いており、下書きを読んで承認するのは
 * 講師の仕事だから — `/admin/*` の下は「管理者専用の面」で、そのレイアウトの
 * RoleGuard は admin だけを通す (例外を足すとその境界が読めなくなる)。
 */
export const Route = createFileRoute("/_app/discovery")({
  component: DiscoveryPage,
});

function DiscoveryPage() {
  return (
    <RoleGuard allow={["instructor", "admin"]}>
      <AdminDiscoveryPage />
    </RoleGuard>
  );
}
