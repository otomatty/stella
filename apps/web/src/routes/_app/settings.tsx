import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { SettingsPage } from '@/components/shell/SettingsPage';

export const Route = createFileRoute('/_app/settings')({
  component: Settings,
});

function Settings() {
  const s = useAppShell();
  return (
    <SettingsPage
      role={s.role}
      profile={s.profile}
      tenantName={s.tenantName}
      backendEnabled={s.backendEnabled}
      onProfileUpdated={s.onProfileUpdated}
    />
  );
}
