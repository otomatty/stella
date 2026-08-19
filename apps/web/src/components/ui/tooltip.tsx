/**
 * Tooltip — `@radix-ui/react-tooltip` の薄いラッパー (shadcn/ui 準拠)。
 *
 * サイドバーをアイコン幅まで畳んだときのラベル表示など、 文字が入らない UI の
 * 補助に使う。 ポインタ / フォーカスの両方で開くので、 `title` 属性と違って
 * キーボード操作でも読める。
 */

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-[110] rounded-md border border-border bg-popover px-2 py-1 text-[12px] text-foreground shadow-md",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
