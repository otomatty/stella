import { createFileRoute } from "@tanstack/react-router";
import { CertificateDetail } from "@/components/learner/CertificateDetail";
import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";

type CertificateDetailSearch = {
  print?: "1";
};

export const Route = createFileRoute("/_app/certificates/$certId")({
  validateSearch: (search: Record<string, unknown>): CertificateDetailSearch =>
    search.print === "1" ? { print: "1" } : {},
  component: CertificateDetailRoute,
});

function CertificateDetailRoute() {
  const { certId } = Route.useParams();
  const { print } = Route.useSearch();
  const s = useAppShell();
  return (
    <RoleGuard allow={["learner"]}>
      <CertificateDetail
        certId={certId}
        userId={s.currentUserId}
        backendEnabled={s.backendEnabled}
        autoPrint={print === "1"}
      />
    </RoleGuard>
  );
}
