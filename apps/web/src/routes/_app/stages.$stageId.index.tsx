import { createFileRoute, type SearchSchemaInput } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { StageNotFoundNotice, EmptyStagesNotice } from "@/components/shell/AppShell";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { StageDetail, StageDetailSkeleton } from "@/components/learner/StageDetail";

import { StaffStageDetail } from "@/components/staff/StaffStageDetail";
import { parseStaffStageTab } from "@/components/staff/staff-stage-detail";

export const Route = createFileRoute("/_app/stages/$stageId/")({
  validateSearch: (search: { tab?: unknown } & SearchSchemaInput) => ({
    tab: parseStaffStageTab(search.tab),
  }),
  component: StageDetailPage,
});

function StageDetailPage() {
  const s = useAppShell();
  const { stageId } = Route.useParams();
  const target = s.stages.find((c) => c.id === stageId);
  return (
    <RoleGuard allow={["learner", "admin"]}>
      {s.role !== "learner" ? (
        <StaffStageDetail key={stageId} stageId={stageId} />
      ) : target ? (
        <StageDetail
          currentUserId={s.currentUserId}
          stage={target}
          setPage={s.setPage}
          onOpenLesson={(lessonId) => s.onOpenLesson(target, lessonId)}
          onOpenSubmission={s.onOpenSubmission}
        />
      ) : s.stagesLoading ? (
        <StageDetailSkeleton onBack={() => s.setPage("dash")} />
      ) : s.stages.length === 0 ? (
        // 読み込み後に受講ステージが無いとき (旧挙動どおり)。見つからない表示も読み込み後だけ。
        <EmptyStagesNotice setPage={s.setPage} />
      ) : (
        <StageNotFoundNotice setPage={s.setPage} />
      )}
    </RoleGuard>
  );
}
