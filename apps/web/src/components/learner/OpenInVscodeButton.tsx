import { useState } from "react";
import { buildVscodeLessonUri } from "@falcon/shared";
import { Code, Loader2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

/**
 * 接続専用ページは持たない。 押した時にワンタイム接続コードを発行し、 レッスンの
 * ディープリンクに載せて渡すので、 拡張が未接続でも 1 クリックで VS Code が起動して
 * 接続 → レッスン表示まで進む。 コード発行に失敗しても (未ログイン等) レッスン
 * ディープリンクだけは開き、 接続済みの拡張ならそのまま動く。
 */
async function issueLinkCode(): Promise<string | undefined> {
  try {
    const { code } = await apiFetch<{ code: string; expires_at: string }>("/api/auth/vscode-link", {
      method: "POST",
    });
    return code;
  } catch {
    return undefined;
  }
}

export function OpenInVscodeButton({ stageId, lessonId }: { stageId: string; lessonId: string }) {
  const [opening, setOpening] = useState(false);

  const handleOpen = async () => {
    setOpening(true);
    try {
      const code = await issueLinkCode();
      location.assign(buildVscodeLessonUri(stageId, lessonId, code));
    } finally {
      setOpening(false);
    }
  };

  return (
    <Button type="button" variant="accent" onClick={() => void handleOpen()} disabled={opening}>
      {opening ? <Loader2 size={14} className="animate-spin" /> : <Code size={14} />}
      VS Code で開く
    </Button>
  );
}
