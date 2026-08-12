import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import {
  Home,
  Book,
  Play,
  Award,
  Edit,
  Users,
  BarChart,
  Building,
  ClipboardList,
  FileText,
  Shield,
  Settings,
  LogOut,
  Code,
  GraduationCap,
} from '@/lib/icons';
import { Brand } from '@/components/common/Brand';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Role, User } from '@/data/types';
import type { ProfileRole } from '@falcon/shared/cms/types';
import { cn } from '@/lib/utils';

type LucideIcon = ComponentType<LucideProps>;

type NavId =
  | 'dash'
  | 'courses'
  | 'lesson'
  | 'cert'
  | 'review-queue'
  | 'gradebook'
  | 'students'
  | 'users'
  | 'enrollments'
  | 'orgs'
  | 'report'
  | 'audit'
  | 'assignments'
  | 'settings'
  | '__logout';

interface NavItem {
  id: NavId;
  label: string;
  icon: LucideIcon;
}

// バッジ件数はモック値を持たず、 App から実データ (counts prop) で渡す。
const NAV: Record<Role, NavItem[]> = {
  learner: [
    { id: 'dash', label: 'ダッシュボード', icon: Home },
    { id: 'courses', label: 'コース一覧', icon: Book },
    { id: 'lesson', label: '現在のレッスン', icon: Play },
    { id: 'cert', label: '修了証', icon: Award },
  ],
  instructor: [
    { id: 'dash', label: 'ダッシュボード', icon: Home },
    { id: 'review-queue', label: '添削待ち', icon: Edit },
    { id: 'gradebook', label: '成績台帳', icon: GraduationCap },
    { id: 'students', label: '担当受講者', icon: Users },
    { id: 'courses', label: 'コース', icon: Book },
  ],
  admin: [
    { id: 'dash', label: 'KPIダッシュボード', icon: BarChart },
    { id: 'courses', label: 'コース管理', icon: Book },
    { id: 'assignments', label: '課題管理', icon: Code },
    { id: 'enrollments', label: '受講登録', icon: ClipboardList },
    { id: 'gradebook', label: '成績台帳', icon: GraduationCap },
    { id: 'users', label: 'ユーザー管理', icon: Users },
    { id: 'report', label: 'レポート', icon: FileText },
    { id: 'audit', label: '監査ログ', icon: Shield },
  ],
};

const ORGS_NAV: NavItem = { id: 'orgs', label: '組織マスタ', icon: Building };

function navForRole(role: Role, profileRole?: ProfileRole): NavItem[] {
  const items = NAV[role];
  if (role !== 'admin' || profileRole !== 'platform_admin') return items;
  const usersIdx = items.findIndex((item) => item.id === 'users');
  const insertAt = usersIdx >= 0 ? usersIdx + 1 : items.length;
  return [...items.slice(0, insertAt), ORGS_NAV, ...items.slice(insertAt)];
}

interface SidebarProps {
  role: Role;
  page: string;
  setPage: (page: string) => void;
  user: User;
  /** ナビ ID ごとの実件数バッジ (添削待ち / 修了証 等)。 0 は非表示。 */
  counts?: Partial<Record<NavId, number>>;
  /** profiles.role — 組織マスタは platform_admin のみ表示 */
  profileRole?: ProfileRole;
}

export const Sidebar = ({
  role,
  page,
  setPage,
  user,
  counts,
  profileRole,
}: SidebarProps) => (
  <aside className="bg-card border-r border-border p-3 pb-4 flex flex-col gap-1 sticky top-0 h-screen overflow-y-auto w-[232px]">
    <div className="pt-1 px-2.5 pb-4 border-b border-border mb-3">
      <Brand size="sm" />
    </div>

    <div className="px-3 pt-3.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-ink-4">
      メニュー
    </div>
    {navForRole(role, profileRole).map((link) => {
      const count = counts?.[link.id];
      return (
        <SidebarLink
          key={link.id}
          icon={link.icon}
          label={link.label}
          count={typeof count === 'number' && count > 0 ? count : undefined}
          active={page === link.id}
          onClick={() => setPage(link.id)}
        />
      );
    })}

    <div className="px-3 pt-3.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-ink-4">
      一般
    </div>
    <SidebarLink
      icon={Settings}
      label="設定"
      active={page === 'settings'}
      onClick={() => setPage('settings')}
    />
    <SidebarLink
      icon={LogOut}
      label="ログアウト"
      active={false}
      onClick={() => setPage('__logout')}
    />

    <div className="mt-auto flex items-center gap-2.5 px-1.5 pt-2.5 pb-0.5 border-t border-border">
      <Avatar>
        {user.avatarUrl ? (
          // referrerPolicy: googleusercontent は Referer 付きだと 403 を返すことがある。
          <AvatarImage src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
        ) : null}
        <AvatarFallback>{user.initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 text-xs">
        <div className="font-medium text-foreground truncate">{user.name}</div>
        <div className="text-[11px] text-ink-3 truncate">{user.email}</div>
      </div>
    </div>
  </aside>
);

interface SidebarLinkProps {
  icon: LucideIcon;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}

const SidebarLink = ({ icon: Icon, label, count, active, onClick }: SidebarLinkProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex items-center gap-2.5 px-2.5 py-[7px] rounded-sm text-[13px] border cursor-pointer select-none text-left',
      'transition-colors',
      active
        ? 'bg-sunken text-foreground font-medium border-border'
        : 'text-ink-2 hover:bg-sunken hover:text-foreground border-transparent',
    )}
  >
    <Icon size={15} className="shrink-0" />
    <span className="flex-1 truncate">{label}</span>
    {typeof count === 'number' ? (
      <span
        className={cn(
          'ml-auto text-[11px] px-1.5 py-[1px] rounded-full font-medium',
          active ? 'bg-brand text-white' : 'bg-muted text-ink-2',
        )}
      >
        {count}
      </span>
    ) : null}
  </button>
);
