import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex w-full min-h-[80px] px-3 py-2 text-sm",
      "bg-card border border-input rounded-sm",
      "placeholder:text-ink-4",
      "resize-y",
      "transition-[border-color,box-shadow]",
      "focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand-soft",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
