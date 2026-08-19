import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * `/admin` 単体でのアクセス。 管理者のトップは KPI ダッシュボード (ロール分岐する `/`)
 * なのでそこへ送る。 レイアウトだけが描画されて空白になるのを防ぐ。
 */
export const Route = createFileRoute("/_app/admin/")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
