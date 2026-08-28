import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { HallOfFameDetail } from "@/components/hall-of-fame/HallOfFameDetail";

/**
 * 殿堂の詳細 (`/hall-of-fame/$entryId`)。全ロールが読める。
 *
 * 「この道をたどる」CTA は受講者の画面にだけ出す (staff は自分の学習を進める画面では
 * ないため)。行き先そのものはサーバが閲覧者のスキルマップから決める。
 */
export const Route = createFileRoute("/_app/hall-of-fame/$entryId")({
  component: HallOfFameDetailPage,
});

function HallOfFameDetailPage() {
  const { entryId } = Route.useParams();
  const s = useAppShell();
  return <HallOfFameDetail entryId={entryId} canFollow={s.role === "learner"} />;
}
