import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * 旧 URL 互換。 管理画面は `/admin/*` 配下へ移した (ブックマーク / 共有リンク救済)。
 * 移行期間を過ぎたら削除してよい (削除後は `_app/$` の 404 が受ける)。
 */
export const Route = createFileRoute("/_app/audit")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/audit", replace: true });
  },
});
