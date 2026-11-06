import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * 教材の編集画面は廃止した。旧ブックマークの救済のため、ステージ管理へ送る。
 */
export const Route = createFileRoute("/_app/admin/assignments")({
  beforeLoad: () => {
    throw redirect({ to: "/stages", replace: true });
  },
});
