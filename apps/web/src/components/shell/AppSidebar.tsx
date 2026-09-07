/**
 * AppSidebar — LMS のメインナビゲーション。
 *
 * 器と挙動 (開閉 / ドロワー化 / ⌘B) は `@/components/ui/sidebar` の部品に任せ、
 * ここは「何を並べるか」だけを持つ。 ナビ定義は `sidebar-nav.ts`、
 * 受講者画面への切替は `SidebarViewSwitch.tsx` に分けてある。
 *
 * モバイル (lg 未満) ではドロワーとして開くので、 項目を押したら閉じる。
 * デスクトップでは常設カラムなので開いたままにする。
 */

import { Brand } from "@/components/common/Brand";
import { UserMenu } from "@/components/shell/UserMenu";
import { SidebarViewSwitch } from "@/components/shell/SidebarViewSwitch";
import { navForRole, type NavId } from "@/components/shell/sidebar-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import type { Role, User } from "@/data/types";
import type { ProfileRole } from "@stella/shared/cms/types";

interface AppSidebarProps {
  role: Role;
  page: string;
  setPage: (page: string) => void;
  user: User;
  /** ナビ ID ごとの実件数バッジ (添削待ち / 修了証 等)。 0 は非表示。 */
  counts?: Partial<Record<NavId, number>>;
  /** profiles.role — 組織マスタは platform_admin のみ表示 */
  profileRole?: ProfileRole;
  canSwitchToLearner?: boolean;
  onSwitchToLearner?: () => void;
  onReturnToStaff?: () => void;
}

export const AppSidebar = ({
  role,
  page,
  setPage,
  user,
  counts,
  profileRole,
  canSwitchToLearner,
  onSwitchToLearner,
  onReturnToStaff,
}: AppSidebarProps) => {
  const { isMobile, setOpenMobile } = useSidebar();

  /** ドロワーで開いているときは、 遷移させたら閉じる (背後の本文を見せる)。 */
  const withDrawerClose = (run?: () => void) => () => {
    if (isMobile) setOpenMobile(false);
    run?.();
  };

  const go = (key: string) => withDrawerClose(() => setPage(key))();

  const switchToLearner = withDrawerClose(onSwitchToLearner);
  const returnToStaff = withDrawerClose(onReturnToStaff);

  return (
    <Sidebar
      collapsible="offcanvas"
      mobileTitle="メインナビゲーション"
      mobileDescription="ロールに応じた画面へ移動します。"
    >
      <SidebarHeader className="h-[var(--shell-header-height)] justify-center border-b border-border px-5">
        <Brand size="sm" />
      </SidebarHeader>

      <SidebarContent className="px-3 pt-1">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            {navForRole(role, profileRole).map((link) => {
              const count = counts?.[link.id];
              const showBadge = typeof count === "number" && count > 0;
              const Icon = link.icon;
              return (
                <SidebarMenuItem key={link.id}>
                  <SidebarMenuButton
                    isActive={page === link.id}
                    tooltip={link.label}
                    onClick={() => go(link.id)}
                    // バッジはボタンに重ねて置くので、 長いラベルが潜り込まないよう余白を足す。
                    className={showBadge ? "pr-10" : undefined}
                  >
                    <Icon size={15} />
                    <span className="flex-1 truncate">{link.label}</span>
                  </SidebarMenuButton>
                  {showBadge ? <SidebarMenuBadge>{count}</SidebarMenuBadge> : null}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2.5 px-3 pb-4">
        {canSwitchToLearner ? (
          <SidebarViewSwitch
            viewingAsLearner={role === "learner"}
            profileRole={profileRole}
            onSwitchToLearner={switchToLearner}
            onReturnToStaff={returnToStaff}
          />
        ) : null}

        {/* 「設定」「ログアウト」はユーザーメニュー (アバター) 側に集約している。 */}
        <div className="border-t border-border pt-2.5">
          <UserMenu
            user={user}
            onOpenSettings={() => go("settings")}
            onLogout={() => go("__logout")}
            canSwitchToLearner={canSwitchToLearner}
            viewingAsLearner={role === "learner"}
            profileRole={profileRole}
            onSwitchToLearner={switchToLearner}
            onReturnToStaff={returnToStaff}
          />
        </div>
      </SidebarFooter>

      {/* デスクトップで縁をクリックしても開閉できるようにする。 */}
      <SidebarRail />
    </Sidebar>
  );
};
