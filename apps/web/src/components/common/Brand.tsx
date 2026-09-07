import { cn } from "@/lib/utils";
import { DISPLAY_NAME } from "@stella/shared/brand/display";
import { BrandMark } from "@/components/common/BrandMark";

interface BrandProps {
  /** 32px for login, 28px for sidebar */
  size?: "sm" | "md";
  title?: string;
  subtitle?: string;
  className?: string;
}

export const Brand = ({
  size = "sm",
  title = DISPLAY_NAME,
  subtitle = "",
  className,
}: BrandProps) => {
  const markSize = size === "md" ? "w-8 h-8" : "w-[30px] h-[30px]";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "grid place-items-center rounded-[9px] shrink-0 sf-gradient-135-bg text-white",
          markSize,
        )}
      >
        <BrandMark className="w-[62%] h-[62%]" />
      </div>
      {(title || subtitle) && (
        <div className="leading-tight">
          {title && (
            <div className="font-display font-bold text-[13px] tracking-[0.04em]">{title}</div>
          )}
          {subtitle && <div className="text-[11px] text-ink-3">{subtitle}</div>}
        </div>
      )}
    </div>
  );
};
