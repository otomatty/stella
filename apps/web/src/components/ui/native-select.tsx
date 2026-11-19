import * as React from "react";
import { cn } from "@/lib/utils";

type NativeSelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  /** 高さは sm が 32px、md が 36px、lg が 40px。幅は呼び出し側が決める。 */
  size?: "sm" | "md" | "lg";
};

const selectSizes = {
  sm: "h-8 px-2 text-[12.5px]",
  md: "h-9 px-2 text-[13px]",
  lg: "h-10 px-3 text-sm",
};

export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ size = "md", className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "min-w-0 max-w-full rounded-sm border border-input bg-card text-foreground",
        "transition-[border-color,box-shadow] focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand-soft",
        "disabled:cursor-not-allowed disabled:opacity-50",
        selectSizes[size],
        className,
      )}
      {...props}
    />
  ),
);
NativeSelect.displayName = "NativeSelect";
