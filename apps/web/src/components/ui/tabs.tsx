import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    // 狭幅ではタブ名が 1 文字ずつに折り返されるため、 縮めずに横スクロールさせる。
    // スクロールバーは邪魔になるので隠す (スワイプ / トラックパッドで送れる)。
    className={cn(
      "inline-flex max-w-full items-center gap-1 overflow-x-auto border-b border-border -mb-px",
      "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

type TabsTriggerProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
  /** 先頭に置くアイコン。サイズ指定は不要（14px に揃う）。 */
  icon?: React.ReactNode;
  /** 末尾の件数バッジ。undefined ならバッジごと出さない（ロード中に使う）。 */
  count?: number;
};

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, icon, count, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "group relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 py-2",
      "text-[13px] font-medium text-ink-3 rounded-t-sm transition-colors",
      "[&_svg]:size-3.5 [&_svg]:shrink-0",
      "hover:bg-sunken hover:text-ink",
      "data-[state=active]:text-sf-magenta data-[state=active]:font-bold",
      // アクティブ下線 (Sports Force グラデーション)。list の border-b に重ねるので -bottom-px。
      "after:absolute after:inset-x-0 after:-bottom-px after:h-[2.5px] after:rounded-full",
      "after:[background:var(--sf-gradient)] after:origin-left after:scale-x-0",
      "after:transition-transform after:duration-200 data-[state=active]:after:scale-x-100",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      "disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {icon}
    {children}
    {count === undefined ? null : (
      <span
        className={cn(
          "ml-0.5 rounded-full bg-muted px-1.5 text-[11px] font-medium text-ink-2",
          "transition-colors",
          "group-data-[state=active]:bg-sf-magenta-soft group-data-[state=active]:text-sf-magenta-ink",
        )}
      >
        {count}
      </span>
    )}
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
