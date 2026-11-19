import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  className?: string;
  children: ReactNode;
}

interface FilterFieldProps extends FilterBarProps {
  label: ReactNode;
  htmlFor?: string;
  wide?: boolean;
}

// 絞り込みの入力をまとめる。狭幅は 2 列の格子、sm 以上は横並びにする。
export function FilterBar({ className, children }: FilterBarProps) {
  return (
    <div className={cn("grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap", className)}>
      {children}
    </div>
  );
}

// 狭幅で格子からはみ出さないよう、入力には w-full sm:w-auto を付け、最小幅は sm 以上で指定する。
export function FilterField({ label, htmlFor, wide, className, children }: FilterFieldProps) {
  return (
    <div
      className={cn("flex min-w-0 flex-col gap-1", wide && "col-span-2 sm:col-span-1", className)}
    >
      {htmlFor === undefined ? (
        <span className="text-[11px] text-ink-3">{label}</span>
      ) : (
        <label htmlFor={htmlFor} className="text-[11px] text-ink-3">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

export function FilterBarAside({ className, children }: FilterBarProps) {
  return (
    <div className={cn("col-span-2 flex items-center justify-end gap-3 sm:ml-auto", className)}>
      {children}
    </div>
  );
}
