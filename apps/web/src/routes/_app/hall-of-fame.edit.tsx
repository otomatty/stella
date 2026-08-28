import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { HallOfFameEdit } from "@/components/hall-of-fame/HallOfFameEdit";

/**
 * 殿堂の記入画面 (`/hall-of-fame/edit`)。招待を受けた本人だけが使う。
 *
 * ここは受講者の画面なので `RoleGuard` は learner に絞る。実際の門番はサーバで、
 * 招待の無い呼び出しは 404 になる (画面は「招待はありません」を出す)。
 */
export const Route = createFileRoute("/_app/hall-of-fame/edit")({
  component: HallOfFameEditPage,
});

function HallOfFameEditPage() {
  const s = useAppShell();
  return (
    <RoleGuard allow={["learner"]}>
      <HallOfFameEdit studentName={s.studentName} />
    </RoleGuard>
  );
}
