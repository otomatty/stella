import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * 旧スキルツリー画面。受講者のホーム (`/`) がスキルツリーそのものになったので、
 * 既存のリンク・ブックマークはホームへ送る (staff は各自のダッシュボードに着く)。
 */
export const Route = createFileRoute("/_app/skill-tree")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
