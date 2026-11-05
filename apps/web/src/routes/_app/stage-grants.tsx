/**
 * 旧 URL 互換 — `/stage-grants` → `/stages`。
 *
 * Extra の割当はステージ管理の盤面にまとめた。以前のブックマークを落とさないためだけの
 * ルート。描画は持たず `beforeLoad` で置き換え遷移する。
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/stage-grants")({
  beforeLoad: () => {
    throw redirect({ to: "/stages", search: true, replace: true });
  },
});
