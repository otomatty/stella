import { useState } from 'react';
import { toast } from 'sonner';
import { buildVscodeLinkUri } from '@falcon/shared';
import { Code, Loader2 } from '@/lib/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';

export function ConnectVscodePage() {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { code } = await apiFetch<{ code: string; expires_at: string }>(
        '/api/auth/vscode-link',
        { method: 'POST' },
      );
      window.location.assign(buildVscodeLinkUri(code));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'VS Code への接続に失敗しました',
      );
    } finally {
      setConnecting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="VS Code"
        sub="拡張 FALCON INFORMAL を入れた VS Code が開きます。"
      />
      <Button
        variant="accent"
        onClick={() => void handleConnect()}
        disabled={connecting}
      >
        {connecting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Code size={14} />
        )}
        VS Code に接続
      </Button>
    </>
  );
}
