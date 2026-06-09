import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { ChevronRight, Search, HelpCircle } from '@/lib/icons';
import { NotificationCenter } from '@/components/shell/NotificationCenter';
import type { NotificationRow } from '@falcon/shared/cms/types';
import type { Course, Role, Tenant } from '@/data/types';

interface TopbarProps {
  crumbs: ReactNode[];
  actions?: ReactNode;
  /** 通知センター用のコンテキスト / データ / ハンドラ。 */
  notify: {
    role: Role;
    tenantId: Tenant['id'];
    notifications: NotificationRow[];
    unreadCount: number;
    loading: boolean;
    onMarkRead: (id: string) => void;
    onMarkAllRead: () => void;
    onAfterCreateAnnouncement: () => void;
    courses: Course[];
  };
}

export const Topbar = ({ crumbs, actions, notify }: TopbarProps) => (
  <div className="flex items-center gap-3.5 px-7 py-3 bg-card border-b border-border sticky top-0 z-10 h-[57px]">
    <div className="flex items-center gap-1.5 text-[13px] text-ink-3">
      {crumbs.map((c, i) => (
        <Fragment key={i}>
          {i > 0 ? (
            <span className="text-ink-4">
              <ChevronRight size={12} />
            </span>
          ) : null}
          <span className={i === crumbs.length - 1 ? 'text-foreground font-medium' : ''}>{c}</span>
        </Fragment>
      ))}
    </div>
    <div className="flex-1" />
    <div className="flex items-center gap-2 bg-background border border-border rounded-md px-2.5 py-1.5 w-[280px] text-ink-3 text-[12.5px]">
      <Search size={14} />
      <input
        className="flex-1 min-w-0 bg-transparent border-none outline-none placeholder:text-ink-3"
        placeholder="コース、レッスン、受講者を検索…"
      />
      <span className="font-mono text-[10px] text-ink-3 border border-border rounded-[3px] px-1.5 py-[1px] bg-card">
        ⌘K
      </span>
    </div>
    <NotificationCenter
      role={notify.role}
      tenantId={notify.tenantId}
      notifications={notify.notifications}
      unreadCount={notify.unreadCount}
      loading={notify.loading}
      onMarkRead={notify.onMarkRead}
      onMarkAllRead={notify.onMarkAllRead}
      onAfterCreateAnnouncement={notify.onAfterCreateAnnouncement}
      courses={notify.courses}
    />
    <button
      className="w-8 h-8 rounded-sm grid place-items-center text-ink-2 hover:bg-sunken border border-transparent hover:border-border"
      title="ヘルプ"
      type="button"
    >
      <HelpCircle size={16} />
    </button>
    {actions}
  </div>
);
