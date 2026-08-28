import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { StageList } from "@/components/learner/StageList";
import { InstructorGeneric } from "@/components/instructor/InstructorGeneric";
import { AdminStagesPage } from "@/components/admin/AdminStagesPage";

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
  if (s.role === "admin") {
    return (
      <AdminStagesPage
        // seq を含めることで、 同じステージを選び直したときも再マウントされ
        // StageEditor を閉じた後に開き直せる。
        key={s.highlightStage ? `${s.highlightStage.id}:${s.highlightStage.seq}` : "list"}
        tenantId={s.tenantId}
        initialStageId={s.highlightStage?.id ?? null}
      />
    );
  }
  if (s.role === "instructor") {
    return (
      <InstructorGeneric
        page="stages"
        tenantId={s.tenantId}
        backendEnabled={s.backendEnabled}
        highlightStageId={s.highlightStage?.id ?? null}
        highlightSeq={s.highlightStage?.seq ?? 0}
      />
    );
  }
  return (
    <StageList
      setPage={s.setPage}
      stages={s.stages}
      setCurrentStage={s.setCurrentStage}
      currentUserId={s.currentUserId}
      backendEnabled={s.backendEnabled}
    />
  );
}
