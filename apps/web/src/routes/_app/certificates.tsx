import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { RoleGuard } from '@/components/shell/RoleGuard';
import { CertificatePage } from '@/components/learner/Certificate';

export const Route = createFileRoute('/_app/certificates')({
  component: Certificates,
});

function Certificates() {
  const s = useAppShell();
  return (
    <RoleGuard allow={['learner']} page="cert">
      <CertificatePage
        courses={s.courses}
        currentUserId={s.currentUserId}
        studentName={s.studentName}
        studentInitials={s.studentInitials}
        tenantName={s.tenantName}
        backendEnabled={s.backendEnabled}
      />
    </RoleGuard>
  );
}
