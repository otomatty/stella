import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Eye, HelpCircle, Menu, Moon, Search, Sun } from "@/lib/icons";
import { useTheme } from "@/hooks/useTheme";
import { NotificationCenter } from "@/components/shell/NotificationCenter";
import { SearchPalette } from "@/components/shell/SearchPalette";
import type { NotificationRow, ProfileRole } from "@falcon/shared/cms/types";
import type { SearchResult } from "@falcon/shared/search/types";
import { staffHomeLabel } from "@/lib/ui-role";
import type { Course, Role, Tenant } from "@/data/types";

interface TopbarProps {
  actions?: ReactNode;
  /** lg 未満で表示するナビゲーションドロワーを開く。 */
  onOpenNav?: () => void;
  /** 検索パレットで選ばれたコース / レッスンへの遷移 (Issue #77)。 */
  onSearchSelect: (result: SearchResult) => void;
  /** 受講者プレビュー時は公開講座に検索を限定する。 */
  searchCourseIds?: ReadonlySet<string> | null;
  /** staff が受講者画面を表示中のバッジ。 押すとスタッフ画面へ戻る。 */
  learnerPreview?: {
    profileRole?: ProfileRole;
    onReturnToStaff: () => void;
  } | null;
  /** 通知センター用のコンテキスト / データ / ハンドラ。 */
  notify: {
    role: Role;
    tenantId: Tenant["id"];
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
  if (typeof navigator === "undefined") return "⌘K";
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘K" : "Ctrl K";
}

export const Topbar = ({
  actions,
  notify,
  onOpenNav,
  onSearchSelect,
  searchCourseIds = null,
  learnerPreview = null,
}: TopbarProps) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // ⌘K / Ctrl+K で検索パレットを開く。 入力欄にフォーカスがあっても効かせる
  // (修飾キー付きなので通常の入力を妨げない)。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex items-center gap-2 sm:gap-3.5 px-4 sm:px-7 py-3 bg-card border-b border-border sticky top-0 z-10 h-[var(--shell-header-height)]">
      {onOpenNav ? (
        <button
          type="button"
          onClick={onOpenNav}
          className="lg:hidden w-[34px] h-[34px] shrink-0 rounded-full grid place-items-center text-ink-2 hover:bg-sunken border border-transparent hover:border-border"
          title="メニュー"
          aria-label="メニューを開く"
        >
          <Menu size={18} />
        </button>
      ) : null}
      {/* 受講者画面を表示中はどの画面でも分かるようにし、 1 タップで戻れるようにする。 */}
      {learnerPreview ? (
        <button
          type="button"
          onClick={learnerPreview.onReturnToStaff}
          className="flex min-w-0 items-center gap-1.5 rounded-full border border-brand/40 bg-brand-soft px-2.5 py-[5px] text-[11.5px] font-bold text-brand hover:brightness-105"
          title={staffHomeLabel(learnerPreview.profileRole)}
          aria-label={`受講者画面を表示中 — ${staffHomeLabel(learnerPreview.profileRole)}`}
        >
          <Eye size={13} className="shrink-0" />
          <span className="truncate">受講者画面</span>
          <span className="hidden truncate font-medium text-brand/80 sm:inline">
            · {staffHomeLabel(learnerPreview.profileRole)}
          </span>
        </button>
      ) : null}
      <div className="flex-1" />
      {/* 狭幅では検索ラベル / ショートカット表記を落としてアイコンボタンに縮退する。 */}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="flex items-center gap-2 bg-sunken border border-border-2 rounded-full py-[7px] px-2 sm:pl-3.5 sm:pr-2 w-[34px] sm:w-[280px] justify-center sm:justify-start shrink-0 text-ink-3 text-[12.5px] hover:border-border-strong hover:text-ink-2"
        aria-label="コース・レッスンを検索"
      >
        <Search size={14} className="shrink-0" />
        <span className="hidden sm:block flex-1 min-w-0 text-left truncate">
          コース・レッスンを検索…
        </span>
        <span className="hidden sm:block font-display text-[10px] font-bold text-ink-3 border border-border-2 rounded-full px-2 py-[2px] bg-card">
          {shortcutLabel()}
        </span>
      </button>
      <SearchPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={onSearchSelect}
        allowedCourseIds={searchCourseIds}
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
      {/* ライト / ダークの切り替え。 未選択のうちは OS 設定に追従し、 押した時点で固定される。 */}
      <button
        type="button"
        onClick={toggleTheme}
        className="w-[34px] h-[34px] rounded-full grid place-items-center text-ink-2 hover:bg-sunken border border-transparent hover:border-border"
        title={theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
        aria-label={theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      {/* ハンドラの無いスタブだったヘルプボタンを、 既存の公開サポートページに繋いだ。
          学習中の状態を失わないよう別タブで開く。 */}
      <a
        href="/support"
        target="_blank"
        rel="noreferrer"
        className="w-[34px] h-[34px] rounded-full grid place-items-center text-ink-2 hover:bg-sunken border border-transparent hover:border-border"
        title="ヘルプ・サポート"
        aria-label="ヘルプ・サポート"
      >
        <HelpCircle size={16} />
      </a>
      {actions}
    </div>
  );
};
