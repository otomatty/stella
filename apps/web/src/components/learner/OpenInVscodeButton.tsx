import { useState } from "react";
import { Code, Loader2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { useIsHandheld } from "@/hooks/useIsHandheld";
import { openInVscode } from "@/lib/vscode-launch";
import { PcHandoffButton } from "./PcHandoffButton";

/**
 * 接続コード付きの URI で、指定されたレッスンまたはタスクを VS Code に開く (`lib/vscode-launch.ts`)。
 * 拡張機能が入っていなければ VS Code がインストールを尋ね、そのまま課題文まで開く。
 * 提出済みの問題を見直すときは、呼び出し側からラベルとボタンの見た目を指定できる。
 *
 * スマートフォン・タブレットでは VS Code を開けないので、接続コードを発行せず、
 * ページのリンクをパソコンへ送るボタン (`PcHandoffButton`) に替える。
 */
export function OpenInVscodeButton(
  props: ({ stageId: string; lessonId: string } | { taskId: string; problemId?: string }) & {
    label?: string;
    variant?: "accent" | "outline";
  },
) {
  const handheld = useIsHandheld();
  const [opening, setOpening] = useState(false);
  if (handheld) return <PcHandoffButton />;

  const handleOpen = async () => {
    setOpening(true);
    try {
      await openInVscode(props);
    } finally {
      setOpening(false);
    }
  };

  return (
    <Button
      data-testid="open-in-vscode"
      type="button"
      variant={props.variant ?? "accent"}
      onClick={() => void handleOpen()}
      disabled={opening}
    >
      {opening ? <Loader2 size={14} className="animate-spin" /> : <Code size={14} />}
      {props.label ?? "VS Code で開く"}
    </Button>
  );
}
