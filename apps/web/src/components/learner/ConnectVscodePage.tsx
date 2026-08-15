import { useState } from "react";
import { toast } from "sonner";
import { buildVscodeLinkUri } from "@falcon/shared";
import { Code, Loader2 } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { useLearnerPreviewReadOnly } from "@/components/shell/app-shell-context";

export function ConnectVscodePage() {
  const previewReadOnly = useLearnerPreviewReadOnly();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (previewReadOnly) {
      toast.message("受講者画面のプレビューでは VS Code に接続できません");
      return;
    }
    setConnecting(true);
    try {
      const { code } = await apiFetch<{ code: string; expires_at: string }>(
        "/api/auth/vscode-link",
        { method: "POST" },
      );
      window.location.assign(buildVscodeLinkUri(code));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "VS Code への接続に失敗しました");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <>
      <PageHeader title="VS Code" sub="拡張 FALCON INFORMAL を入れた VS Code が開きます。" />
      {previewReadOnly ? (
        <p className="text-[13px] text-ink-3 mb-3">
          プレビュー中のため VS Code への接続はできません。管理画面に戻ってから接続してください。
        </p>
      ) : null}
      <Button
        variant="accent"
        onClick={() => void handleConnect()}
        disabled={previewReadOnly || connecting}
      >
        {connecting ? <Loader2 size={14} className="animate-spin" /> : <Code size={14} />}
        VS Code に接続
      </Button>
    </>
  );
}
