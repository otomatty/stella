import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { LearnerRecords } from "@/components/learner/LearnerRecords";

export const Route = createFileRoute("/_app/records")({
  component: RecordsPage,
});

/** 学習の記録 (受講者)。ホームから移した、今日の行動に直結しない記録の置き場。 */
function RecordsPage() {
  const s = useAppShell();
  return (
    <RoleGuard allow={["learner"]}>
      <LearnerRecords
        stages={s.stages}
        announcementsHook={s.announcementsHook}
        onOpenSubmission={s.onOpenSubmission}
        currentUserId={s.currentUserId}
        backendEnabled={s.backendEnabled}
      />
    </RoleGuard>
  );
}
