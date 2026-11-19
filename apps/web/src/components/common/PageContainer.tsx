import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  /** default は上限なし、wide は一覧向けの 7xl、narrow は詳細向けの 4xl。 */
  size?: "default" | "wide" | "narrow";
  className?: string;
  children: ReactNode;
}

const containerWidths = { default: undefined, wide: "max-w-7xl", narrow: "max-w-4xl" };

// 余白は AppShell が持つ。狭幅で左右の余白を二重に取らないよう、ここでは幅だけを決める。
export function PageContainer({ size = "default", className, children }: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full min-w-0", containerWidths[size], className)}>{children}</div>
  );
}
