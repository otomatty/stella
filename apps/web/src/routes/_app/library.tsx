import { createFileRoute, redirect } from "@tanstack/react-router";

// 保存済みのリンクはホームへ戻す。本棚の画面は廃止。
export const Route = createFileRoute("/_app/library")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
