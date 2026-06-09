import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import {
  Home,
  Book,
  Play,
  MessageCircle,
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
  ChevronsUpDown,
  Code,
  GraduationCap,
} from '@/lib/icons';
import { Brand } from '@/components/common/Brand';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Role, Tenant, User } from '@/data/types';
import { cn } from '@/lib/utils';

type LucideIcon = ComponentType<LucideProps>;

type NavId =
  | 'dash'
  | 'courses'
  | 'lesson'
  | 'qa'
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
  | '__logout'
  | '__switch_tenant';

interface NavItem {
  id: NavId;
  label: string;
  icon: LucideIcon;
  count?: number;
}

const NAV: Record<Role, NavItem[]> = {
  learner: [
    { id: 'dash', label: 'ダッシュボード', icon: Home },
    { id: 'courses', label: 'コース一覧', icon: Book },
    { id: 'lesson', label: '現在のレッスン', icon: Play },
    { id: 'qa', label: 'Q&A', icon: MessageCircle, count: 2 },
    { id: 'cert', label: '修了証', icon: Award, count: 1 },
  ],
  instructor: [
    { id: 'dash', label: 'ダッシュボード', icon: Home },
    { id: 'review-queue', label: '添削待ち', icon: Edit, count: 6 },
    { id: 'gradebook', label: '成績台帳', icon: GraduationCap },
    { id: 'students', label: '担当受講者', icon: Users },
    { id: 'qa', label: 'Q&A 未返信', icon: MessageCircle, count: 3 },
    { id: 'courses', label: 'コース', icon: Book },
  ],
  admin: [
    { id: 'dash', label: 'KPIダッシュボード', icon: BarChart },
    { id: 'courses', label: 'コース管理', icon: Book },
    { id: 'assignments', label: '課題管理', icon: Code },
    { id: 'enrollments', label: '受講登録', icon: ClipboardList },
    { id: 'gradebook', label: '成績台帳', icon: GraduationCap },
    { id: 'users', label: 'ユーザー管理', icon: Users },
    { id: 'orgs', label: '組織マスタ', icon: Building },
    { id: 'report', label: 'レポート', icon: FileText },
    { id: 'audit', label: '監査ログ', icon: Shield },
  ],
};

interface SidebarProps {
  role: Role;
  page: string;
  setPage: (page: string) => void;
  tenant: Tenant;
  user: User;
  /** 講師ロール時の添削待ち件数 (未指定時は NAV の既定値) */
  reviewQueueCount?: number;
}

export const Sidebar = ({
  role,
  page,
  setPage,
  tenant,
  user,
  reviewQueueCount,
}: SidebarProps) => (
  <aside className="bg-card border-r border-border p-3 pb-4 flex flex-col gap-1 sticky top-0 h-screen overflow-y-auto w-[232px]">
    <div className="pt-1 px-2.5 pb-4 border-b border-border mb-3">
      <Brand size="sm" />
    </div>

    <div className="px-3 pt-3.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-ink-4">
      メニュー
    </div>
    {NAV[role].map((link) => {
      const count =
        link.id === 'review-queue' && typeof reviewQueueCount === 'number'
          ? reviewQueueCount
          : link.count;
      return (
        <SidebarLink
          key={link.id}
          icon={link.icon}
          label={link.label}
          count={count}
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

    <button
      type="button"
      className="mt-auto p-2.5 border border-border rounded-md bg-background hover:border-border-strong transition-colors text-left"
      onClick={() => setPage('__switch_tenant')}
    >
      <div className="text-[10.5px] text-ink-3 uppercase tracking-wider font-semibold">
        現在のテナント
      </div>
      <div className="font-semibold text-[13px] mt-0.5 flex items-center gap-1.5">
        <span>{tenant.name}</span>
        <ChevronsUpDown size={13} className="ml-auto text-ink-4" />
      </div>
    </button>

    <div className="flex items-center gap-2.5 px-1.5 pt-2.5 pb-0.5 mt-2">
      <Avatar>
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
