/**
 * SidebarInset — サイドバーの隣に置く本文カラム。
 *
 * `Sidebar` が確保した幅の残りを埋める。 `min-w-0` は必須で、 これが無いと
 * 中の表 / コードブロックが縮まずに本文全体が横に伸びる。
 */

import * as React from "react";

import { cn } from "@/lib/utils";

export const SidebarInset = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="sidebar-inset"
      className={cn("relative flex min-h-dvh min-w-0 flex-1 flex-col bg-background", className)}
      {...props}
    />
  ),
);
SidebarInset.displayName = "SidebarInset";
