import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * 旧 URL 互換。Google ログインの戻り先だったが、ログインは Cloudflare Access に移った
 * (アプリは OAuth のコールバックを受けない)。ブックマークや開いたままのタブはホームへ送る。
 */
export const Route = createFileRoute("/auth/callback")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
