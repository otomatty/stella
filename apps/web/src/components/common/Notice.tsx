import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NoticeProps {
  tone?: "danger" | "warning" | "info";
  className?: string;
  children: ReactNode;
  role?: "alert" | "status";
}

const noticeTones = {
  danger: "border-destructive bg-danger-soft text-destructive",
  warning: "border-border bg-warning-soft text-warning",
  info: "border-border bg-info-soft text-info",
};

// 操作のエラー、警告、案内を本文中で伝えるために使う。
export function Notice({ tone = "danger", className, children, role }: NoticeProps) {
  return (
    <div
      role={role}
      className={cn("rounded-md border px-3 py-2 text-[12.5px]", noticeTones[tone], className)}
    >
      {children}
    </div>
  );
}
