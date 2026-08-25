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
 * 質問音声タブは admin のみ (生成コストが乗るため)。 面談日編集 (Issue #205) と
 * 質問文の編集 (Issue #237) は sales/admin — 面談で実際に聞かれた言い回しを
 * 知っているのは営業なので、 質問バンクの文面は営業も直せる。
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
          canManageAudio={s.role === "admin"}
          canEditQuestions={s.role === "admin" || s.role === "sales"}
        />
      );
    case "learner":
      // profileRole は認証済みの実ロール。 staff が受講者シェルを覗いているだけの
      // ときは進捗 API が 403 を返すので、 記録系の操作を出さない判定に使う。
      return (
        <InterviewPrepPage
          backendEnabled={s.backendEnabled}
          profileId={s.currentUserId}
          profileRole={s.profileRole}
          shellRole={s.role}
        />
      );
    default: {
      const _exhaustive: never = s.role;
      return _exhaustive;
    }
  }
}
