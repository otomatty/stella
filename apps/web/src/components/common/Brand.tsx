import { cn } from "@/lib/utils";

interface BrandProps {
  /** 32px for login, 28px for sidebar */
  size?: "sm" | "md";
  title?: string;
  subtitle?: string;
  inverted?: boolean;
  className?: string;
}

export const Brand = ({
  size = "sm",
  title = "FALCON INFORMAL",
  subtitle = "",
  inverted = false,
  className,
}: BrandProps) => {
  const markSize = size === "md" ? "w-8 h-8 text-sm" : "w-[30px] h-[30px] text-sm";
  // inverted は暗い面に載せる用途 (ログイン画面のアート面) なので、 テーマに追従させず白で固定する。
  const markBg = inverted ? "bg-white text-[#141418]" : "sf-gradient-135-bg text-white";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "grid place-items-center rounded-[9px] font-display font-extrabold shrink-0",
          markSize,
          markBg,
        )}
      >
        F
      </div>
      <div className="leading-tight">
        <div className="font-display font-bold text-[13px] tracking-[0.04em]">{title}</div>
        {subtitle && <div className="text-[11px] text-ink-3">{subtitle}</div>}
      </div>
    </div>
  );
};
