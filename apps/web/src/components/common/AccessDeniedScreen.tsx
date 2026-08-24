/**
 * 403 画面。 ロール外のページを URL 直叩きで開いたときに RoleGuard が表示する。
 *
 * 「存在しない」 (404) と 「権限が無い」 (403) は原因も対処も違うので画面を分けている。
 */

import { useContext } from "react";
import { useRouter } from "@tanstack/react-router";
import { Lock, HelpCircle } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { StatusScreen, type StatusScreenLink } from "@/components/common/StatusScreen";
import { AppShellContext } from "@/components/shell/app-shell-context";
import type { Role } from "@/data/types";

const ROLE_LABELS: Record<Role, string> = {
  learner: "受講者",
  instructor: "講師",
  admin: "管理者",
  sales: "営業",
};

const formatRoles = (roles: Role[]) => roles.map((r) => ROLE_LABELS[r]).join(" / ");

export const AccessDeniedScreen = ({ allow }: { allow: Role[] }) => {
  const shell = useContext(AppShellContext);
  const router = useRouter();

  const links: StatusScreenLink[] = [
    {
      label: "サポート窓口",
      description: "権限の付与を依頼する",
      icon: HelpCircle,
      onSelect: () => void router.navigate({ to: "/support" }),
    },
  ];

  return (
    <StatusScreen
      standalone={!shell}
      code="403"
      icon={Lock}
      title="このページを開く権限がありません"
      description={
        <>
          {allow.length ? `${formatRoles(allow)}向けのページです` : "アクセスが制限されています"}
          {shell ? `（現在のロール: ${ROLE_LABELS[shell.role]}）` : ""}。
          <br />
          権限が必要な場合はテナント管理者にお問い合わせください。
        </>
      }
      actions={
        <>
          <Button variant="default" onClick={() => router.history.back()}>
            前のページに戻る
          </Button>
          <Button
            variant="primary"
            onClick={() => (shell ? shell.setPage("dash") : void router.navigate({ to: "/" }))}
          >
            ダッシュボードへ
          </Button>
        </>
      }
      links={links}
    />
  );
};
