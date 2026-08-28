import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { SkillTreePage } from "@/components/learner/tree/SkillTreePage";

export const Route = createFileRoute("/_app/skill-tree")({
  component: SkillTree,
});

/**
 * スキルツリーは受講者の画面 (Phase 3a)。staff は従来どおりの管理画面のままで、
 * 「自分の星」を持たない (staff が見たいなら受講者シェルへ切り替える)。
 */
function SkillTree() {
  const s = useAppShell();
  return (
    <RoleGuard allow={["learner"]}>
      <SkillTreePage
        currentUserId={s.currentUserId}
        backendEnabled={s.backendEnabled}
        refetchStages={s.refetchStages}
      />
    </RoleGuard>
  );
}
