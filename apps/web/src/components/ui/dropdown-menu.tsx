/**
 * ドロップダウンメニュー (基本コンポーネント)。
 *
 * 位置決め / Portal / 外側クリック / Esc / トリガーへのフォーカス復帰は
 * 導入済みの Radix Popover に任せ、 ここは menu のセマンティクス
 * (role=menu / menuitem、 ↑↓ Home End での項目移動、 選択で閉じる) だけを足す。
 */

import * as React from "react";
import type { LucideProps } from "lucide-react";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const DropdownMenu = Popover;

// Popover のトリガーは aria-haspopup="dialog" を付ける。 中身は menu なので上書きする
// (Radix はユーザー props を後から展開するため、 こちらが勝つ)。
export const DropdownMenuTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverTrigger>,
  React.ComponentPropsWithoutRef<typeof PopoverTrigger>
>((props, ref) => <PopoverTrigger ref={ref} aria-haspopup="menu" {...props} />);
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

/** ↑↓ / Home / End で項目間を移動する。 Popover 自体は menu のキー操作を持たない。 */
function moveFocus(e: React.KeyboardEvent<HTMLDivElement>) {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
  const items = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'),
  );
  if (items.length === 0) return;
  e.preventDefault();
  const cur = items.indexOf(document.activeElement as HTMLElement);
  const next =
    e.key === "Home"
      ? 0
      : e.key === "End"
        ? items.length - 1
        : e.key === "ArrowDown"
          ? (cur + 1) % items.length
          : cur <= 0
            ? items.length - 1
            : cur - 1;
  items[next]?.focus();
}

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof PopoverContent>,
  React.ComponentPropsWithoutRef<typeof PopoverContent>
>(({ className, align = "start", sideOffset = 6, onKeyDown, ...props }, ref) => (
  <PopoverContent
    ref={ref}
    role="menu"
    align={align}
    sideOffset={sideOffset}
    onKeyDown={(e) => {
      onKeyDown?.(e);
      if (!e.defaultPrevented) moveFocus(e);
    }}
    className={cn("w-56 p-1 shadow-md", className)}
    {...props}
  />
));
DropdownMenuContent.displayName = "DropdownMenuContent";

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ComponentType<LucideProps>;
  /** 破壊的な操作 (ログアウト / 削除など) を赤系で出す。 */
  tone?: "default" | "danger";
}

export const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  ({ className, icon: Icon, tone = "default", children, onMouseEnter, ...props }, ref) => (
    // 選択したらメニューを閉じ、 フォーカスをトリガーへ戻す。
    <PopoverClose asChild>
      <button
        ref={ref}
        type="button"
        role="menuitem"
        // ホバーした項目へフォーカスも移す。 マウスとキーボードで選択位置がずれると、
        // 設定を指しているつもりで Enter がログアウトを撃つ、 といった事故になる。
        onMouseEnter={(e) => {
          onMouseEnter?.(e);
          e.currentTarget.focus();
        }}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-[7px] text-left text-[13px]",
          "transition-colors outline-none hover:bg-sunken focus-visible:bg-sunken",
          "disabled:opacity-50 disabled:pointer-events-none",
          tone === "danger"
            ? "text-destructive hover:bg-danger-soft focus-visible:bg-danger-soft"
            : "text-ink-2 hover:text-foreground focus-visible:text-foreground",
          className,
        )}
        {...props}
      >
        {Icon ? <Icon size={15} className="shrink-0" /> : null}
        <span className="flex-1 truncate">{children}</span>
      </button>
    </PopoverClose>
  ),
);
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuLabel = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-2.5 py-1.5 text-xs", className)} {...props} />
);

export const DropdownMenuSeparator = ({ className }: { className?: string }) => (
  <hr className={cn("-mx-1 my-1 h-px border-0 bg-border", className)} />
);
