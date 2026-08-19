/**
 * SidebarTrigger / SidebarRail — サイドバーを開閉する操作子。
 *
 * - `SidebarTrigger` … ヘッダーに置くボタン。 モバイルではドロワー、
 *   デスクトップでは常設カラムをトグルする (どちらを切るかは context 側の判断)。
 * - `SidebarRail` … サイドバーの縁に沿う細い当たり判定。 ポインタ操作の近道で、
 *   キーボードからは `SidebarTrigger` と ⌘B があるので tab 順からは外す。
 */

import * as React from "react";

import { PanelLeft } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { useSidebar } from "./sidebar-context";

export interface SidebarTriggerProps extends React.ComponentPropsWithoutRef<"button"> {
  /** 開いているときのラベル。 閉じているときは `openLabel`。 */
  closeLabel?: string;
  openLabel?: string;
}

export const SidebarTrigger = React.forwardRef<HTMLButtonElement, SidebarTriggerProps>(
  (
    { className, onClick, closeLabel = "メニューを閉じる", openLabel = "メニューを開く", ...props },
    ref,
  ) => {
    const { toggleSidebar, isMobile, open, openMobile } = useSidebar();
    const expanded = isMobile ? openMobile : open;
    const label = expanded ? closeLabel : openLabel;

    return (
      <button
        ref={ref}
        type="button"
        data-slot="sidebar-trigger"
        aria-label={label}
        aria-expanded={expanded}
        title={label}
        onClick={(event) => {
          onClick?.(event);
          toggleSidebar();
        }}
        className={cn(
          "grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full border border-transparent text-ink-2",
          "hover:border-border hover:bg-sunken",
          className,
        )}
        {...props}
      >
        <PanelLeft size={18} />
      </button>
    );
  },
);
SidebarTrigger.displayName = "SidebarTrigger";

export const SidebarRail = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button">
>(({ className, ...props }, ref) => {
  const { isMobile, toggleSidebar } = useSidebar();

  // ドロワーで開いているときは縁が画面端に無いので出さない。
  if (isMobile) return null;

  return (
    <button
      ref={ref}
      type="button"
      data-slot="sidebar-rail"
      // キーボードからは `SidebarTrigger` と ⌘B があるので、 タブ順には入れない。
      // ただしクリックでフォーカスは当たるため、 aria-hidden ではなく名前を付ける。
      tabIndex={-1}
      aria-label="サイドバーの開閉"
      onClick={toggleSidebar}
      className={cn(
        "absolute inset-y-0 z-20 flex w-4 -translate-x-1/2 transition-colors",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-border-strong",
        "group-data-[side=left]:-right-4 group-data-[side=right]:left-0",
        className,
      )}
      {...props}
    />
  );
});
SidebarRail.displayName = "SidebarRail";
