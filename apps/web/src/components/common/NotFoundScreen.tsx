/**
 * 404 画面。
 *
 * ルーターに一致するルートが無いとき (`_app/$` のキャッチオール、 および
 * `__root` の notFoundComponent) に表示する。 AppShell の内側で描画された場合は
 * ロール別の導線を出し、 外側 (未ログイン / 公開ページ) では Brand 付きの単独画面になる。
 */

import { useContext } from "react";
import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { Award, Book, Compass, Edit, HelpCircle, Home, MessageCircle, Users } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { StatusScreen, type StatusScreenLink } from "@/components/common/StatusScreen";
import { AppShellContext } from "@/components/shell/app-shell-context";
import type { Role } from "@/data/types";

/** ロール別の「ここから探せます」導線。 サイドバーの主要項目と揃える。 */
export function linksForRole(role: Role, setPage: (page: string) => void): StatusScreenLink[] {
  switch (role) {
    case "instructor":
      return [
        { label: "ダッシュボード", icon: Home, onSelect: () => setPage("dash") },
        {
          label: "添削待ち",
          description: "提出物のレビュー",
          icon: Edit,
          onSelect: () => setPage("review-queue"),
        },
        { label: "担当受講者", icon: Users, onSelect: () => setPage("students") },
      ];
    case "admin":
      return [
        { label: "KPIダッシュボード", icon: Home, onSelect: () => setPage("dash") },
        { label: "コース管理", icon: Book, onSelect: () => setPage("courses") },
        { label: "ユーザー管理", icon: Users, onSelect: () => setPage("users") },
      ];
    case "sales":
      return [
        { label: "ダッシュボード", icon: Home, onSelect: () => setPage("dash") },
        {
          label: "面談対策",
          description: "案件種別の割当と準備状況",
          icon: MessageCircle,
          onSelect: () => setPage("interview-prep"),
        },
      ];
    case "learner":
      return [
        { label: "ダッシュボード", icon: Home, onSelect: () => setPage("dash") },
        {
          label: "コース一覧",
          description: "受講中のコースを開く",
          icon: Book,
          onSelect: () => setPage("courses"),
        },
        { label: "修了証", icon: Award, onSelect: () => setPage("cert") },
      ];
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export const NotFoundScreen = () => {
  const shell = useContext(AppShellContext);
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const description = (
    <>
      お探しのページは移動または削除された可能性があります。
      <br />
      <span className="font-mono text-[12px] break-all">{pathname}</span>
    </>
  );

  if (shell) {
    return (
      <StatusScreen
        code="404"
        icon={Compass}
        title="ページが見つかりません"
        description={description}
        actions={
          <>
            <Button variant="default" onClick={() => router.history.back()}>
              前のページに戻る
            </Button>
            <Button variant="primary" onClick={() => shell.setPage("dash")}>
              ダッシュボードへ
            </Button>
          </>
        }
        links={linksForRole(shell.role, shell.setPage)}
      />
    );
  }

  return (
    <StatusScreen
      standalone
      code="404"
      icon={Compass}
      title="ページが見つかりません"
      description={description}
      actions={
        <>
          <Button variant="default" onClick={() => router.history.back()}>
            前のページに戻る
          </Button>
          <Button variant="primary" onClick={() => void navigate({ to: "/" })}>
            トップへ戻る
          </Button>
        </>
      }
      links={[
        {
          label: "サポート窓口",
          description: "ログインできない・リンクが切れている場合",
          icon: HelpCircle,
          onSelect: () => void navigate({ to: "/support" }),
        },
      ]}
    />
  );
};
