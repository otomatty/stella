/**
 * 想定外の描画エラーの受け皿 (エラーバウンダリ)。
 *
 * ルーターの `defaultErrorComponent` として登録しているため、 各ページで throw された
 * 例外はページ枠の中で捕捉され、 サイドバー / トップバーは生きたまま残る。
 * AppShell 自体が落ちた場合だけ単独画面 (Brand 付き) になる。
 */

import { useContext, useEffect } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { AlertTriangle, HelpCircle, Home, RefreshCw } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { StatusScreen, type StatusScreenLink } from "@/components/common/StatusScreen";
import { AppShellContext } from "@/components/shell/app-shell-context";

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "不明なエラー";
}

export const AppErrorScreen = ({ error, reset }: ErrorComponentProps) => {
  const shell = useContext(AppShellContext);
  const router = useRouter();

  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  const links: StatusScreenLink[] = [
    shell
      ? { label: "ダッシュボードへ", icon: Home, onSelect: () => shell.setPage("dash") }
      : { label: "トップへ戻る", icon: Home, onSelect: () => void router.navigate({ to: "/" }) },
    {
      label: "サポート窓口",
      description: "解消しない場合は下記の内容を添えてご連絡ください",
      icon: HelpCircle,
      onSelect: () => void router.navigate({ to: "/support" }),
    },
  ];

  return (
    <StatusScreen
      standalone={!shell}
      code="ERROR"
      icon={AlertTriangle}
      title="予期しないエラーが発生しました"
      description="画面の描画中に問題が発生しました。 再試行しても直らない場合は、 ページを再読み込みしてください。"
      actions={
        <>
          <Button
            variant="primary"
            onClick={() => {
              reset();
              void router.invalidate();
            }}
          >
            <RefreshCw size={14} />
            再試行
          </Button>
          <Button variant="default" onClick={() => window.location.reload()}>
            ページを再読み込み
          </Button>
        </>
      }
      links={links}
      detail={
        <div className="rounded-lg border border-border bg-sunken px-4 py-3">
          <div className="text-[11.5px] text-ink-3 mb-1">エラー内容</div>
          <div className="font-mono text-[12px] break-all whitespace-pre-wrap">
            {messageOf(error)}
          </div>
        </div>
      }
    />
  );
};
