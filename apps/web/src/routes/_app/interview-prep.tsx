import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { InterviewPrepPage } from "@/components/learner/InterviewPrep";
import { InterviewPrepAssignmentsPage } from "@/components/instructor/InterviewPrepAssignments";

export const Route = createFileRoute("/_app/interview-prep")({
  component: InterviewPrep,
});

/**
 * 表示ロール (`s.role`) で画面を分ける。 staff が受講者シェルへ切り替えたときは
 * 練習画面を見せる (profileRole のまま割当画面に固定しない)。
 * 質問音声タブは admin のみ (Issue #202 / UX 再設計ブランチ)。
 */
function InterviewPrep() {
  const s = useAppShell();
  switch (s.role) {
    case "instructor":
    case "admin":
    case "sales":
      return (
        <InterviewPrepAssignmentsPage
          backendEnabled={s.backendEnabled}
          canEditSchedule={s.role === "admin" || s.role === "sales"}
        />
      );
    case "learner":
      return <InterviewPrepPage backendEnabled={s.backendEnabled} />;
    default: {
      const _exhaustive: never = s.role;
      return _exhaustive;
    }
  }
}
