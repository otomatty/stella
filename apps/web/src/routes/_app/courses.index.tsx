/**
 * 旧 URL 互換 — `/courses` → `/stages`。
 *
 * 「コース」から「ステージ」への改名前に配ったリンク (ブックマーク / 通知メール /
 * VS Code 拡張の古いバージョン) を落とさないためだけのルート。描画は持たず
 * `beforeLoad` で置き換え遷移する。
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/courses/")({
  beforeLoad: () => {
    // 検索パラメータは引き継ぐ (`search: true`)。旧 URL には ?code=... 付きの
    // ディープリンクがあり、既定では捨てられてしまうため。
    throw redirect({ to: "/stages", search: true, replace: true });
  },
});
