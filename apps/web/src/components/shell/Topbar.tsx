import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { HelpCircle, Search } from '@/lib/icons';
import { NotificationCenter } from '@/components/shell/NotificationCenter';
import { SearchPalette } from '@/components/shell/SearchPalette';
import type { NotificationRow } from '@falcon/shared/cms/types';
import type { SearchResult } from '@falcon/shared/search/types';
import type { Course, Role, Tenant } from '@/data/types';

interface TopbarProps {
  actions?: ReactNode;
  /** 検索パレットで選ばれたコース / レッスンへの遷移 (Issue #77)。 */
  onSearchSelect: (result: SearchResult) => void;
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
    onOpenSubmission?: (submissionId: string) => void;
  };
}

/** macOS 系なら ⌘、 それ以外は Ctrl 表記にする。 */
function shortcutLabel(): string {
  if (typeof navigator === 'undefined') return '⌘K';
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
    ? '⌘K'
    : 'Ctrl K';
}

export const Topbar = ({ actions, notify, onSearchSelect }: TopbarProps) => {
  const [searchOpen, setSearchOpen] = useState(false);

  // ⌘K / Ctrl+K で検索パレットを開く。 入力欄にフォーカスがあっても効かせる
  // (修飾キー付きなので通常の入力を妨げない)。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex items-center gap-3.5 px-7 py-3 bg-card border-b border-border sticky top-0 z-10 h-[57px]">
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="flex items-center gap-2 bg-background border border-border rounded-md px-2.5 py-1.5 w-[280px] text-ink-3 text-[12.5px] hover:border-border-strong hover:text-foreground"
      >
        <Search size={14} />
        <span className="flex-1 min-w-0 text-left truncate">
          コース・レッスンを検索…
        </span>
        <span className="font-mono text-[10px] text-ink-3 border border-border rounded-[3px] px-1.5 py-[1px] bg-card">
          {shortcutLabel()}
        </span>
      </button>
      <SearchPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={onSearchSelect}
      />
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
        onOpenSubmission={notify.onOpenSubmission}
      />
      {/* ハンドラの無いスタブだったヘルプボタンを、 既存の公開サポートページに繋いだ。
          学習中の状態を失わないよう別タブで開く。 */}
      <a
        href="/support"
        target="_blank"
        rel="noreferrer"
        className="w-8 h-8 rounded-sm grid place-items-center text-ink-2 hover:bg-sunken border border-transparent hover:border-border"
        title="ヘルプ・サポート"
        aria-label="ヘルプ・サポート"
      >
        <HelpCircle size={16} />
      </a>
      {actions}
    </div>
  );
};
