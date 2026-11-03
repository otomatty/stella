import { createFileRoute, redirect } from "@tanstack/react-router";

// 保存済みのリンクはホームへ戻す。学習の記録の画面は廃止。
export const Route = createFileRoute("/_app/records")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
