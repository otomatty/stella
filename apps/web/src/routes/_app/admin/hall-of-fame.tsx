import { createFileRoute } from "@tanstack/react-router";
import { AdminHallOfFamePage } from "@/components/admin/AdminHallOfFamePage";

/**
 * 殿堂の運用 (`/admin/hall-of-fame`)。ロールチェックは親レイアウト
 * `_app/admin.tsx` の RoleGuard (admin のみ) が担う。
 *
 * 発見教材 (`/discovery`) と違い staff 共有ページには置かない — 誰を殿堂に載せるかは
 * 運営の判断で、受講者を評価する立場の講師はここに関与しない (API も admin 限定)。
 */
export const Route = createFileRoute("/_app/admin/hall-of-fame")({
  component: AdminHallOfFameRoute,
});

function AdminHallOfFameRoute() {
  return <AdminHallOfFamePage />;
}
