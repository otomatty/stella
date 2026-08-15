import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // DS (Sports Force) のボタンは全 variant がピル形。
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-bold transition-[color,background-color,border-color,filter] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-card border border-border-2 text-foreground hover:bg-sunken hover:border-border-strong",
        primary:
          "bg-primary text-primary-foreground border border-primary hover:bg-[oklch(30%_0.01_260)]",
        // シグネチャ CTA。 DS の primary = ブランドグラデーションのピル。
        accent:
          "sf-gradient-bg text-brand-foreground border border-transparent hover:brightness-105",
        ghost:
          "bg-transparent border border-transparent text-foreground hover:bg-sunken hover:border-border",
        outline:
          "bg-transparent border border-border-2 text-foreground hover:bg-sunken hover:border-border-strong",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive hover:opacity-90",
      },
      size: {
        default: "h-8 px-3.5 text-[13px]",
        sm: "h-7 px-2.5 text-xs",
        lg: "h-10 px-4.5 text-sm",
        icon: "h-8 w-8 p-0",
        "icon-sm": "h-7 w-7 p-0",
        full: "h-10 w-full px-4.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
