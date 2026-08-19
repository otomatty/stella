/**
 * Sidebar — サイドバー本体の器。
 *
 * shadcn/ui の `Sidebar` を参考にした自前実装。 ビューポートで描画を切り替える。
 * - `lg` 未満: `Drawer` (左からのオーバーレイ)。 focus trap / Esc 閉じは Radix 任せ。
 * - `lg` 以上: `fixed` の常設カラム + 同じ幅のゴースト要素。 ゴーストが本文を押し出し、
 *   実体は `fixed` なので本文だけをスクロールさせられる。
 *
 * どちらで描くかは JS (`useSidebar().isMobile` = matchMedia) が唯一の判断者。
 * CSS の `lg:` と二重管理にすると、 開閉アニメーションの途中で両方出てしまう。
 *
 * `collapsible`:
 * - `offcanvas` … 畳むと画面外へ引っ込む (既定)
 * - `icon`      … 畳むとアイコン幅だけ残る
 * - `none`      … 畳めない固定カラム
 */

import * as React from "react";

import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

import { SIDEBAR_WIDTH_MOBILE, useSidebar } from "./sidebar-context";

export interface SidebarProps extends React.ComponentPropsWithoutRef<"div"> {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
  /** モバイル (ドロワー) のときだけ読み上げられる見出し。 */
  mobileTitle?: string;
  mobileDescription?: string;
}

export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      side = "left",
      variant = "sidebar",
      collapsible = "offcanvas",
      mobileTitle = "メインナビゲーション",
      mobileDescription,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

    if (collapsible === "none") {
      return (
        <div
          ref={ref}
          data-slot="sidebar"
          className={cn(
            "flex h-full w-[var(--sidebar-width)] flex-col bg-card text-foreground",
            className,
          )}
          {...props}
        >
          {children}
        </div>
      );
    }

    if (isMobile) {
      return (
        <Drawer open={openMobile} onOpenChange={setOpenMobile}>
          <DrawerContent
            ref={ref}
            direction={side}
            showHandle={false}
            data-slot="sidebar"
            data-mobile="true"
            style={{ "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE } as React.CSSProperties}
            className={cn("w-[var(--sidebar-width-mobile)] max-w-none rounded-none p-0", className)}
            {...props}
          >
            {/* Radix Dialog は Title を必須にしている。 見た目には出さず読み上げだけに使う。 */}
            <DrawerTitle className="sr-only">{mobileTitle}</DrawerTitle>
            {mobileDescription ? (
              <DrawerDescription className="sr-only">{mobileDescription}</DrawerDescription>
            ) : null}
            <div className="flex h-full w-full flex-col">{children}</div>
          </DrawerContent>
        </Drawer>
      );
    }

    // offcanvas で畳んだときはパネルごと画面外にあるので、 タブ順にも支援技術にも残さない。
    // (ずらすだけだと、 見えないナビ / ユーザーメニューに Tab で到達できてしまう)
    const offscreen = collapsible === "offcanvas" && state === "collapsed";

    return (
      <div
        ref={ref}
        className="group peer text-foreground"
        data-slot="sidebar"
        data-state={state}
        data-collapsible={state === "collapsed" ? collapsible : ""}
        data-variant={variant}
        data-side={side}
      >
        {/* 幅を確保するだけのゴースト。 実体は fixed なので、 これが無いと本文が下へ潜り込む。 */}
        <div
          className={cn(
            "relative h-dvh w-[var(--sidebar-width)] bg-transparent transition-[width] duration-200 ease-linear",
            "group-data-[collapsible=offcanvas]:w-0",
            variant === "floating" || variant === "inset"
              ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+1rem)]"
              : "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]",
          )}
        />
        <div
          className={cn(
            // z-30: 本文 / sticky ヘッダー (z-10) より上、 AI の FAB (z-90) より下。
            "fixed inset-y-0 z-30 flex h-dvh w-[var(--sidebar-width)] transition-[left,right,width] duration-200 ease-linear",
            side === "left"
              ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
              : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
            variant === "floating" || variant === "inset"
              ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+1rem)]"
              : "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]",
            offscreen ? "pointer-events-none" : undefined,
            className,
          )}
          inert={offscreen}
          {...props}
        >
          <div
            data-sidebar="sidebar"
            className={cn(
              // relative: `SidebarRail` (縁のクリック領域) の位置決めの基準。
              "relative flex h-full w-full flex-col bg-card",
              variant === "floating"
                ? "overflow-hidden rounded-xl border border-border shadow-sm"
                : variant === "inset"
                  ? "overflow-hidden rounded-xl"
                  : side === "left"
                    ? "border-r border-border"
                    : "border-l border-border",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    );
  },
);
Sidebar.displayName = "Sidebar";
