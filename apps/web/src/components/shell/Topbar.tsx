import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { ChevronRight, Search, Bell, HelpCircle } from '@/lib/icons';

interface TopbarProps {
  crumbs: ReactNode[];
  actions?: ReactNode;
}

export const Topbar = ({ crumbs, actions }: TopbarProps) => (
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
    <button
      className="w-8 h-8 rounded-sm grid place-items-center text-ink-2 hover:bg-sunken border border-transparent hover:border-border relative"
      title="お知らせ"
      type="button"
    >
      <Bell size={16} />
      <span className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-brand border-[1.5px] border-card" />
    </button>
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
