import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RoleGuard } from "@/components/shell/RoleGuard";

/**
 * 管理画面 (`/admin/*`) のレイアウトルート。
 *
 * 管理者専用ページはすべてこの配下に置き、 ロールチェックをここ 1 箇所に集約する。
 * 配下にページを足したときに RoleGuard を貼り忘れても素通りしない。
 *
 * URL の形自体はセキュリティ境界ではない (SPA なのでバンドルは誰でも取得できる)。
 * 実際の認可は API 側の `requireRole` / テナント突合が担う。 ここは
 * 「管理者専用の面」を構造として一目で分かるようにするための境界。
 */
export const Route = createFileRoute("/_app/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <RoleGuard allow={["admin"]}>
      <Outlet />
    </RoleGuard>
  );
}
