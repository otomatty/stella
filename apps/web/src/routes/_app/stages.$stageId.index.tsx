import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { StageNotFoundNotice, EmptyStagesNotice } from "@/components/shell/AppShell";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { StageDetail } from "@/components/learner/StageDetail";

export const Route = createFileRoute("/_app/stages/$stageId/")({
  component: StageDetailPage,
});

function StageDetailPage() {
  const s = useAppShell();
  const { stageId } = Route.useParams();
  const target = s.stages.find((c) => c.id === stageId);
  return (
    <RoleGuard allow={["learner"]}>
      {target ? (
        <StageDetail
          stage={target}
          setPage={s.setPage}
          onOpenLesson={(lessonId) => s.onOpenLesson(target, lessonId)}
          onOpenSubmission={s.onOpenSubmission}
        />
      ) : s.stages.length === 0 ? (
        // ステージ取得前 (リロード直後) と受講ステージゼロはこの表示 (旧挙動どおり)
        <EmptyStagesNotice setPage={s.setPage} />
      ) : (
        <StageNotFoundNotice setPage={s.setPage} />
      )}
    </RoleGuard>
  );
}
