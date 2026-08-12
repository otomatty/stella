import { createFileRoute } from '@tanstack/react-router';
import { AuthCallback } from '@/components/shell/AuthCallback';

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallback,
});
