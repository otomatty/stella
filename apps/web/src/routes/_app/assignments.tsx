import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * 旧 URL 互換。 教材の編集画面は廃止したため、ステージ管理へ送る (ブックマーク / 共有リンク救済)。
 * 移行期間を過ぎたら削除してよい (削除後は `_app/$` の 404 が受ける)。
 */
export const Route = createFileRoute("/_app/assignments")({
  beforeLoad: () => {
    throw redirect({ to: "/stages", replace: true });
  },
});
