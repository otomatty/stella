import { cn } from "@/lib/utils";
import type { CourseColor } from "@/data/types";

const colorClass: Record<CourseColor, string> = {
  indigo: "thumb-stripes-indigo",
  green: "thumb-stripes-green",
  amber: "thumb-stripes-amber",
  slate: "thumb-stripes-slate",
};

interface CourseThumbProps {
  color?: CourseColor;
  label?: string;
  className?: string;
}

export const CourseThumb = ({ color = "indigo", label, className }: CourseThumbProps) => (
  <div
    className={cn(
      "relative w-full aspect-[16/9] border-b border-border overflow-hidden",
      className,
    )}
  >
    <div className={cn("absolute inset-0", colorClass[color])} />
    {label ? (
      <div className="absolute inset-0 grid place-items-center text-ink-2 text-[11px] font-mono tracking-wider uppercase opacity-75">
        {label}
      </div>
    ) : null}
  </div>
);
