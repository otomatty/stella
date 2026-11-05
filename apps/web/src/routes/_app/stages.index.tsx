import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { StageManagementPage } from "@/components/staff/StageManagementPage";

export const Route = createFileRoute("/_app/stages/")({
  component: StagesPage,
});

function StagesPage() {
  return (
    <RoleGuard allow={["learner", "instructor", "admin"]}>
      <StagesPageBody />
    </RoleGuard>
  );
}

function StagesPageBody() {
  const s = useAppShell();
  if (s.role === "learner") {
    // 受講者のステージ一覧はホームのスキルツリーへ集約した。
    return <Navigate to="/" replace />;
  }
  return (
    <StageManagementPage
      role={s.role}
      backendEnabled={s.backendEnabled}
      currentUserId={s.currentUserId}
      highlightStage={s.highlightStage}
    />
  );
}
