/**
 * ユーザーメニュー。 アバターとユーザー名のボタンを押すと
 * 「設定」「ログアウト」がドロップダウンで開く。
 * staff はここから受講者画面へ切り替えられる。
 */

import { ChevronsUpDown, Eye, GraduationCap, LogOut, Settings } from "@/lib/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { staffHomeLabel } from "@/lib/ui-role";
import type { User } from "@/data/types";
import type { ProfileRole } from "@falcon/shared/cms/types";

interface UserMenuProps {
  user: User;
  onOpenSettings: () => void;
  onLogout: () => void;
  canSwitchToLearner?: boolean;
  /** 受講者シェルを表示中 (staff のみ true になりうる)。 */
  viewingAsLearner?: boolean;
  profileRole?: ProfileRole;
  onSwitchToLearner?: () => void;
  onReturnToStaff?: () => void;
}

export const UserMenu = ({
  user,
  onOpenSettings,
  onLogout,
  canSwitchToLearner = false,
  viewingAsLearner = false,
  profileRole,
  onSwitchToLearner,
  onReturnToStaff,
}: UserMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      className="flex w-full items-center gap-2.5 rounded-xl border border-transparent px-1.5 py-1.5 text-left transition-colors hover:bg-sunken hover:border-border data-[state=open]:bg-sunken data-[state=open]:border-border"
      aria-label="ユーザーメニュー"
    >
      <Avatar>
        {user.avatarUrl ? (
          // referrerPolicy: googleusercontent は Referer 付きだと 403 を返すことがある。
          <AvatarImage src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
        ) : null}
        <AvatarFallback className="bg-ink text-card font-display text-[11px] font-bold">
          {user.initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 text-xs">
        <div className="truncate font-bold text-foreground">{user.name}</div>
        <div className="truncate text-[11px] text-ink-3">{user.email}</div>
      </div>
      <ChevronsUpDown size={13} className="shrink-0 text-ink-3" />
    </DropdownMenuTrigger>

    <DropdownMenuContent side="top" align="start">
      <DropdownMenuLabel>
        <div className="truncate font-medium text-foreground">{user.name}</div>
        <div className="truncate text-[11px] font-normal text-ink-3">{user.email}</div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {canSwitchToLearner ? (
        viewingAsLearner ? (
          <DropdownMenuItem icon={GraduationCap} onClick={onReturnToStaff}>
            {staffHomeLabel(profileRole)}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem icon={Eye} onClick={onSwitchToLearner}>
            受講者画面を表示
          </DropdownMenuItem>
        )
      ) : null}
      <DropdownMenuItem icon={Settings} onClick={onOpenSettings}>
        設定
      </DropdownMenuItem>
      <DropdownMenuItem icon={LogOut} tone="danger" onClick={onLogout}>
        ログアウト
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
