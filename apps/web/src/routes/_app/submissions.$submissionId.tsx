import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { ReviewResultView } from "@/components/learner/ReviewResultView";

export const Route = createFileRoute("/_app/submissions/$submissionId")({
  component: SubmissionResultPage,
});

function SubmissionResultPage() {
  const s = useAppShell();
  const { submissionId } = Route.useParams();
  const hasLessons = s.stages.some((stage) =>
    stage.sections?.some((section) => section.lessons.length),
  );
  return (
    <ReviewResultView
      submissionId={submissionId}
      setPage={s.setPage}
      {...(s.role === "learner"
        ? {
            back: hasLessons
              ? { page: "lesson", label: "現在のレッスンに戻る" }
              : { page: "dash", label: "ホームに戻る" },
          }
        : {})}
    />
  );
}
