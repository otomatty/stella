import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { InterviewPrepPage } from "@/components/learner/InterviewPrep";
import { InterviewPrepAssignmentsPage } from "@/components/instructor/InterviewPrepAssignments";

export const Route = createFileRoute("/_app/interview-prep")({
  component: InterviewPrep,
});

/** learner は練習画面、 staff (instructor/admin) は割当管理画面。 */
function InterviewPrep() {
  const s = useAppShell();
  if (s.role === "instructor" || s.role === "admin") {
    return <InterviewPrepAssignmentsPage backendEnabled={s.backendEnabled} />;
  }
  return <InterviewPrepPage backendEnabled={s.backendEnabled} />;
}
