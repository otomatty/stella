import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/shell/AppShell';

// 認証済みシェル (Sidebar + Topbar)。 AppShell が内部で <Outlet /> を描画する。
export const Route = createFileRoute('/_app')({
  component: AppShell,
});
