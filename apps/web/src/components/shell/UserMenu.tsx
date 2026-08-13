/**
 * ユーザーメニュー。 アバターとユーザー名のボタンを押すと
 * 「設定」「ログアウト」がドロップダウンで開く。
 */

import { ChevronsUpDown, LogOut, Settings } from '@/lib/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { User } from '@/data/types';

interface UserMenuProps {
  user: User;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const UserMenu = ({ user, onOpenSettings, onLogout }: UserMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      className="flex w-full items-center gap-2.5 rounded-sm border border-transparent px-1.5 py-1.5 text-left transition-colors hover:bg-sunken hover:border-border data-[state=open]:bg-sunken data-[state=open]:border-border"
      aria-label="ユーザーメニュー"
    >
      <Avatar>
        {user.avatarUrl ? (
          // referrerPolicy: googleusercontent は Referer 付きだと 403 を返すことがある。
          <AvatarImage src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
        ) : null}
        <AvatarFallback>{user.initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 text-xs">
        <div className="truncate font-medium text-foreground">{user.name}</div>
        <div className="truncate text-[11px] text-ink-3">{user.email}</div>
      </div>
      <ChevronsUpDown size={13} className="shrink-0 text-ink-3" />
    </DropdownMenuTrigger>

    <DropdownMenuContent side="top" align="start">
      <DropdownMenuLabel>
        <div className="truncate font-medium text-foreground">{user.name}</div>
        <div className="truncate text-[11px] font-normal text-ink-3">
          {user.email}
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem icon={Settings} onClick={onOpenSettings}>
        設定
      </DropdownMenuItem>
      <DropdownMenuItem icon={LogOut} tone="danger" onClick={onLogout}>
        ログアウト
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
