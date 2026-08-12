import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { ReviewResultView } from '@/components/learner/ReviewResultView';

export const Route = createFileRoute('/_app/submissions/$submissionId')({
  component: SubmissionResultPage,
});

function SubmissionResultPage() {
  const s = useAppShell();
  const { submissionId } = Route.useParams();
  return <ReviewResultView submissionId={submissionId} setPage={s.setPage} />;
}
