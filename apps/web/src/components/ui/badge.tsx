import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border leading-tight whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-muted text-ink-2 border-border",
        success: "bg-success-soft text-success border-transparent",
        warning: "bg-warning-soft text-warning border-transparent",
        danger: "bg-danger-soft text-danger border-transparent",
        info: "bg-info-soft text-info border-transparent",
        accent: "bg-brand-soft text-brand-ink border-transparent",
        solid: "bg-ink text-card border-ink",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant, className }))} {...props} />
  ),
);
Badge.displayName = "Badge";

export { badgeVariants };
