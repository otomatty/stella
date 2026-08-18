import { createFileRoute } from "@tanstack/react-router";
import { NotFoundScreen } from "@/components/common/NotFoundScreen";

/**
 * 認証済みシェル配下のキャッチオール。 どのルートにも一致しない URL をここで受け、
 * サイドバー / トップバーを保ったまま 404 を表示する (他ルートが優先されるため
 * 既存ページの解決には影響しない)。
 */
export const Route = createFileRoute("/_app/$")({
  component: NotFoundScreen,
});
