import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { ReviewResultView } from "@/components/learner/ReviewResultView";

export const Route = createFileRoute("/_app/submissions/$submissionId")({
  component: SubmissionResultPage,
});

function SubmissionResultPage() {
  const s = useAppShell();
  const { submissionId } = Route.useParams();
  return (
    <ReviewResultView
      submissionId={submissionId}
      setPage={s.setPage}
      // 受講者の提出一覧はホームから「学習の記録」へ移した。
      {...(s.role === "learner" ? { back: { page: "records", label: "学習の記録に戻る" } } : {})}
    />
  );
}
