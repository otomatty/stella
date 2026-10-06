import { createFileRoute } from "@tanstack/react-router";
import { PublicStartPage } from "@/components/public/PublicStart";

// ログインなしで読める導入案内 (Issue #41)。認証付きのシェル (`_app`) の外に置く。
export const Route = createFileRoute("/start/")({
  component: PublicStartPage,
});
