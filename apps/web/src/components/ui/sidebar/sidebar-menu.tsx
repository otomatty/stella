/**
 * サイドバーのメニュー部品 (shadcn/ui の Sidebar 相当)。
 *
 * `SidebarMenu` (ul) > `SidebarMenuItem` (li) > `SidebarMenuButton` が基本形。
 * 見た目はこの DS のピル型ナビに合わせてあり、 選択中は `data-active` で反転する。
 *
 * `SidebarMenuButton` は `asChild` を受け取るので、 ルーターの `<Link>` を包めば
 * そのままアンカーとして描ける (この LMS では `setPage` 経由なので button のまま)。
 * `tooltip` を渡すと、 `collapsible="icon"` で畳んでいる間だけラベルを吹き出しで出す。
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useSidebar } from "./sidebar-context";

export const SidebarMenu = React.forwardRef<HTMLUListElement, React.ComponentPropsWithoutRef<"ul">>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      data-slot="sidebar-menu"
      className={cn("flex w-full min-w-0 flex-col gap-0.5", className)}
      {...props}
    />
  ),
);
SidebarMenu.displayName = "SidebarMenu";

export const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-slot="sidebar-menu-item"
    className={cn("group/menu-item relative", className)}
    {...props}
  />
));
SidebarMenuItem.displayName = "SidebarMenuItem";

const sidebarMenuButtonVariants = cva(
  cn(
    "peer/menu-button flex w-full items-center gap-2.5 overflow-hidden rounded-full text-left",
    "cursor-pointer select-none transition-colors outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
    "[&>svg]:shrink-0",
    // アイコン幅まで畳んだらラベルを落として正方形にする。
    "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
    "group-data-[collapsible=icon]:w-9",
  ),
  {
    variants: {
      variant: {
        default: cn(
          "font-medium text-ink-2 hover:bg-sunken hover:text-foreground",
          "data-[active=true]:bg-ink data-[active=true]:font-bold data-[active=true]:text-card",
        ),
        outline: cn(
          "border border-border-2 font-medium text-ink-2",
          "hover:border-border-strong hover:bg-sunken hover:text-foreground",
          "data-[active=true]:border-ink data-[active=true]:bg-ink data-[active=true]:text-card",
        ),
      },
      size: {
        default: "px-3.5 py-2 text-[13px]",
        sm: "px-3 py-1.5 text-xs",
        lg: "px-3.5 py-2.5 text-sm",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface SidebarMenuButtonProps
  extends React.ComponentPropsWithoutRef<"button">,
    VariantProps<typeof sidebarMenuButtonVariants> {
  asChild?: boolean;
  isActive?: boolean;
  /** 畳んでいる間に出す吹き出しラベル。 展開中は出さない。 */
  tooltip?: string;
}

export const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  (
    { asChild = false, isActive = false, tooltip, variant, size, className, type, ...props },
    ref,
  ) => {
    const { isMobile, state } = useSidebar();
    const Comp = asChild ? Slot : "button";

    const button = (
      <Comp
        ref={ref}
        // asChild のときは中身 (Link など) 自身のタグに任せる。
        type={asChild ? undefined : (type ?? "button")}
        data-slot="sidebar-menu-button"
        data-active={isActive}
        data-size={size ?? "default"}
        className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
        {...props}
      />
    );

    // 展開中 / モバイル (ドロワーは常に展開幅) はラベルが読めるので出さない。
    if (!tooltip || isMobile || state !== "collapsed") {
      return button;
    }

    // Provider は `SidebarProvider` 側に 1 つだけ置いてある。
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" align="center">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  },
);
SidebarMenuButton.displayName = "SidebarMenuButton";

/** 行の右端に出す件数バッジ。 ボタンの `data-active` に追従して色を変える。 */
export const SidebarMenuBadge = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    data-slot="sidebar-menu-badge"
    className={cn(
      "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none",
      "rounded-full px-[7px] py-[1px] text-[11px] font-bold",
      "bg-muted text-ink-2 peer-data-[active=true]/menu-button:bg-card/20",
      "peer-data-[active=true]/menu-button:text-card",
      "group-data-[collapsible=icon]:hidden",
      className,
    )}
    {...props}
  />
));
SidebarMenuBadge.displayName = "SidebarMenuBadge";

/** 行の右端に置く補助操作 (「…」メニュー等)。 hover / focus で出す。 */
export const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button"> & { showOnHover?: boolean }
>(({ className, showOnHover = false, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    data-slot="sidebar-menu-action"
    className={cn(
      "absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full",
      "text-ink-3 hover:bg-sunken hover:text-foreground",
      "group-data-[collapsible=icon]:hidden",
      showOnHover
        ? "opacity-0 focus-visible:opacity-100 group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100"
        : undefined,
      className,
    )}
    {...props}
  />
));
SidebarMenuAction.displayName = "SidebarMenuAction";

/** ナビ項目のロード中プレースホルダ。 幅は行ごとに散らして単調に見せない。 */
const SKELETON_WIDTHS = ["62%", "78%", "54%", "70%", "58%"] as const;

export function SidebarMenuSkeleton({
  rows = 4,
  showIcon = true,
  className,
}: {
  rows?: number;
  showIcon?: boolean;
  className?: string;
}) {
  return (
    <ul
      aria-busy="true"
      aria-live="polite"
      className={cn("flex w-full min-w-0 flex-col gap-0.5", className)}
    >
      {SKELETON_WIDTHS.slice(0, Math.max(0, rows)).map((width) => (
        <li key={width} className="flex h-9 items-center gap-2.5 px-3.5">
          {showIcon ? <Skeleton className="size-4 shrink-0 rounded-md" /> : null}
          <Skeleton className="h-3.5 rounded-full" style={{ width }} />
        </li>
      ))}
    </ul>
  );
}

/** 入れ子のナビ (コース > レッスン など)。 畳んでいる間は出さない。 */
export const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.ComponentPropsWithoutRef<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-slot="sidebar-menu-sub"
    className={cn(
      "ml-5 flex min-w-0 flex-col gap-0.5 border-l border-border py-0.5 pl-2",
      "group-data-[collapsible=icon]:hidden",
      className,
    )}
    {...props}
  />
));
SidebarMenuSub.displayName = "SidebarMenuSub";

export const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-slot="sidebar-menu-sub-item"
    className={cn("group/menu-sub-item relative", className)}
    {...props}
  />
));
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";

export interface SidebarMenuSubButtonProps extends React.ComponentPropsWithoutRef<"button"> {
  asChild?: boolean;
  isActive?: boolean;
}

export const SidebarMenuSubButton = React.forwardRef<HTMLButtonElement, SidebarMenuSubButtonProps>(
  ({ asChild = false, isActive = false, className, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        data-slot="sidebar-menu-sub-button"
        data-active={isActive}
        className={cn(
          "flex w-full items-center gap-2 overflow-hidden rounded-full px-3 py-1.5 text-left text-xs",
          "cursor-pointer text-ink-2 transition-colors outline-none",
          "hover:bg-sunken hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
          "data-[active=true]:bg-sunken data-[active=true]:font-bold data-[active=true]:text-foreground",
          "[&>svg]:shrink-0",
          className,
        )}
        {...props}
      />
    );
  },
);
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";
