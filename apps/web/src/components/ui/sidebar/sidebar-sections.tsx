/**
 * サイドバーの区画。 上から `SidebarHeader` / `SidebarContent` / `SidebarFooter`、
 * `SidebarContent` の中を `SidebarGroup` で章立てする、 という構成を想定している
 * (shadcn/ui の Sidebar と同じ組み立て)。
 *
 * スクロールするのは `SidebarContent` だけ。 ヘッダー / フッターは常に見える。
 * `collapsible="icon"` で畳んだときは、 ラベル類は幅ごと消して座らせない。
 */

import * as React from "react";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="sidebar-header"
    className={cn("flex shrink-0 flex-col gap-2 p-3", className)}
    {...props}
  />
));
SidebarHeader.displayName = "SidebarHeader";

export const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="sidebar-footer"
    className={cn("flex shrink-0 flex-col gap-2 p-3", className)}
    {...props}
  />
));
SidebarFooter.displayName = "SidebarFooter";

export const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="sidebar-content"
    className={cn(
      "flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden",
      // アイコン幅まで畳んだら、 横スクロールが出ないように切る。
      "group-data-[collapsible=icon]:overflow-hidden",
      className,
    )}
    {...props}
  />
));
SidebarContent.displayName = "SidebarContent";

export const SidebarSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentPropsWithoutRef<typeof Separator>
>(({ className, ...props }, ref) => (
  <Separator
    ref={ref}
    data-slot="sidebar-separator"
    className={cn("mx-3 w-auto shrink-0 bg-border", className)}
    {...props}
  />
));
SidebarSeparator.displayName = "SidebarSeparator";

export const SidebarGroup = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="sidebar-group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  ),
);
SidebarGroup.displayName = "SidebarGroup";

export const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="sidebar-group-label"
    className={cn(
      "flex h-8 shrink-0 items-center px-3.5 font-display text-[10.5px] font-bold uppercase tracking-[0.22em] text-ink-4",
      // 畳んだ幅ではラベルが読めないので、 高さごと畳んで消す。
      "transition-[margin,opacity] duration-200 ease-linear",
      "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
      className,
    )}
    {...props}
  />
));
SidebarGroupLabel.displayName = "SidebarGroupLabel";

export const SidebarGroupAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button">
>(({ className, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    data-slot="sidebar-group-action"
    className={cn(
      "absolute right-3 top-3.5 grid size-5 place-items-center rounded-md text-ink-3",
      "hover:bg-sunken hover:text-foreground",
      "group-data-[collapsible=icon]:hidden",
      className,
    )}
    {...props}
  />
));
SidebarGroupAction.displayName = "SidebarGroupAction";

export const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="sidebar-group-content"
    className={cn("w-full min-w-0 text-[13px]", className)}
    {...props}
  />
));
SidebarGroupContent.displayName = "SidebarGroupContent";
