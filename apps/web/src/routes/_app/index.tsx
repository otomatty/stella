import { createFileRoute, redirect } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { LearnerDashboard } from '@/components/learner/LearnerDashboard';
import { InstructorDashboard } from '@/components/instructor/InstructorDashboard';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export const Route = createFileRoute('/_app/')({
  validateSearch: (search: Record<string, unknown>): { cert?: string } =>
    typeof search.cert === 'string' ? { cert: search.cert } : {},
  beforeLoad: ({ search }) => {
    // 既発行の修了証URL /?cert=CODE の互換リダイレクト (Issue #26)
    if (search.cert) {
      throw redirect({ to: '/verify/$certCode', params: { certCode: search.cert } });
    }
  },
  component: DashboardPage,
});

function DashboardPage() {
  const s = useAppShell();
  if (s.role === 'instructor') {
    return (
      <InstructorDashboard
        tenantId={s.tenantId}
        setPage={s.setPage}
        onOpenReview={s.onOpenReview}
        backendEnabled={s.backendEnabled}
      />
    );
  }
  if (s.role === 'admin') {
    return <AdminDashboard tenantId={s.tenantId} backendEnabled={s.backendEnabled} />;
  }
  return (
    <LearnerDashboard
      setPage={s.setPage}
      onOpenLesson={s.onOpenLesson}
      courses={s.courses}
      announcementsHook={s.announcementsHook}
      coursesError={s.coursesError}
      onOpenSubmission={s.onOpenSubmission}
      studentName={s.studentName}
      currentUserId={s.currentUserId}
      backendEnabled={s.backendEnabled}
    />
  );
}
