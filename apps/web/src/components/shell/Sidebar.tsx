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
  Code,
  GraduationCap,
  MessageCircle,
} from '@/lib/icons';
import { Brand } from '@/components/common/Brand';
import { UserMenu } from '@/components/shell/UserMenu';
import type { Role, User } from '@/data/types';
import type { ProfileRole } from '@falcon/shared/cms/types';
import { cn } from '@/lib/utils';

type LucideIcon = ComponentType<LucideProps>;

type NavId =
  | 'dash'
  | 'courses'
  | 'lesson'
  | 'cert'
  | 'interview-prep'
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
    { id: 'interview-prep', label: '面談対策', icon: MessageCircle },
    { id: 'cert', label: '修了証', icon: Award },
  ],
  instructor: [
    { id: 'dash', label: 'ダッシュボード', icon: Home },
    { id: 'review-queue', label: '添削待ち', icon: Edit },
    { id: 'gradebook', label: '成績台帳', icon: GraduationCap },
    { id: 'students', label: '担当受講者', icon: Users },
    { id: 'interview-prep', label: '面談対策', icon: MessageCircle },
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
  <aside className="bg-card border-r border-border px-3 pt-3.5 pb-4 flex flex-col gap-0.5 sticky top-0 h-screen overflow-y-auto w-[236px]">
    <div className="pt-1 px-2.5 pb-4 border-b border-border mb-3">
      <Brand size="sm" />
    </div>

    <div className="px-3.5 pt-2.5 pb-2 font-display text-[10.5px] font-bold uppercase tracking-[0.22em] text-ink-4">
      Menu
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

    {/* 「設定」「ログアウト」はユーザーメニュー (アバター) 側に集約している。 */}
    <div className="mt-auto pt-2.5 border-t border-border">
      <UserMenu
        user={user}
        onOpenSettings={() => setPage('settings')}
        onLogout={() => setPage('__logout')}
      />
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
      'flex items-center gap-2.5 px-3.5 py-2 rounded-full text-[13px] cursor-pointer select-none text-left',
      'transition-colors',
      active
        ? 'bg-ink text-white font-bold'
        : 'text-ink-2 font-medium hover:bg-sunken hover:text-foreground',
    )}
  >
    <Icon size={15} className="shrink-0" />
    <span className="flex-1 truncate">{label}</span>
    {typeof count === 'number' ? (
      <span
        className={cn(
          'ml-auto text-[11px] px-[7px] py-[1px] rounded-full font-bold',
          active ? 'bg-white/20 text-white' : 'bg-muted text-ink-2',
        )}
      >
        {count}
      </span>
    ) : null}
  </button>
);
