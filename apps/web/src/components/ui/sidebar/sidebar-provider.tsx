/**
 * SidebarProvider — サイドバーの開閉状態を配下へ配る。
 *
 * shadcn/ui の `SidebarProvider` 相当。 やっていることは 4 つ。
 * - デスクトップ (`open`) / モバイル (`openMobile`) の開閉を持つ
 * - `lg` 未満かどうか (`useIsNarrowViewport`) を `isMobile` として配る
 * - 非制御のときは開閉を localStorage に覚える
 * - ⌘B / Ctrl+B でトグルする
 *
 * 幅は CSS 変数 (`--sidebar-width` / `--sidebar-width-icon`) としてここで定義し、
 * `Sidebar` と `SidebarInset` が同じ値を参照する。 呼び出し側が `style` で
 * 上書きすれば画面ごとに幅を変えられる。
 */

import * as React from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsNarrowViewport } from "@/hooks/useIsNarrowViewport";
import { cn } from "@/lib/utils";

import {
  SIDEBAR_KEYBOARD_SHORTCUT,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
  SidebarContext,
  type SidebarContextValue,
} from "./sidebar-context";
import { readSidebarOpen, writeSidebarOpen } from "./sidebar-storage";

/** 入力欄 / contenteditable にフォーカスがあるか。 ショートカットを譲る判定に使う。 */
function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  const tag = el?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || Boolean(el?.isContentEditable);
}

export interface SidebarProviderProps extends React.ComponentPropsWithoutRef<"div"> {
  /** 非制御時の初期開閉。 保存済みの状態があればそちらが優先される。 */
  defaultOpen?: boolean;
  /** 制御したいとき。 渡すと localStorage への保存は行わない。 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 非制御時に開閉を localStorage へ保存するか。 既定は保存する。 */
  persist?: boolean;
}

export const SidebarProvider = React.forwardRef<HTMLDivElement, SidebarProviderProps>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange,
      persist = true,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const isMobile = useIsNarrowViewport();
    const [openMobile, setOpenMobile] = React.useState(false);
    const [internalOpen, setInternalOpen] = React.useState(() =>
      persist ? readSidebarOpen(defaultOpen) : defaultOpen,
    );

    const controlled = openProp !== undefined;
    const open = openProp ?? internalOpen;

    const setOpen = React.useCallback(
      (next: boolean) => {
        onOpenChange?.(next);
        if (controlled) return;
        setInternalOpen(next);
        if (persist) writeSidebarOpen(next);
      },
      [controlled, onOpenChange, persist],
    );

    const toggleSidebar = React.useCallback(() => {
      if (isMobile) {
        setOpenMobile((prev) => !prev);
        return;
      }
      setOpen(!open);
    }, [isMobile, open, setOpen]);

    // デスクトップ幅へ戻ったらドロワーは閉じておく。 開いたままだと、 常設カラムと
    // オーバーレイが二重に出る。
    React.useEffect(() => {
      if (!isMobile) setOpenMobile(false);
    }, [isMobile]);

    // ⌘B / Ctrl+B でトグル。 入力中は何もしない (エディタの太字やブラウザ既定を奪わない)。
    React.useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key.toLowerCase() !== SIDEBAR_KEYBOARD_SHORTCUT) return;
        if (!event.metaKey && !event.ctrlKey) return;
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
        toggleSidebar();
      };
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, [toggleSidebar]);

    const value = React.useMemo<SidebarContextValue>(
      () => ({
        state: open ? "expanded" : "collapsed",
        open,
        setOpen,
        openMobile,
        setOpenMobile,
        isMobile,
        toggleSidebar,
      }),
      [isMobile, open, openMobile, setOpen, toggleSidebar],
    );

    return (
      <SidebarContext.Provider value={value}>
        {/* 吹き出し (畳んだアイコンのラベル) の Provider は木に 1 つで足りる。 */}
        <TooltipProvider delayDuration={200}>
          <div
            ref={ref}
            data-slot="sidebar-wrapper"
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH,
                "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                ...style,
              } as React.CSSProperties
            }
            className={cn("group/sidebar-wrapper flex min-h-dvh w-full", className)}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    );
  },
);
SidebarProvider.displayName = "SidebarProvider";
