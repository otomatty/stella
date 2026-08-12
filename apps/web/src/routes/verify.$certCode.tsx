import { createFileRoute } from '@tanstack/react-router';
import { PublicCertificateVerify } from '@/components/public/PublicCertificateVerify';

export const Route = createFileRoute('/verify/$certCode')({
  component: VerifyPage,
});

function VerifyPage() {
  const { certCode } = Route.useParams();
  return <PublicCertificateVerify certCode={certCode} />;
}
