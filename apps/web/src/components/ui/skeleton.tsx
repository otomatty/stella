import type * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

/** 全画面遷移 (セッション復元・OAuth コールバック) 用のページ全体スケルトン。 */
export function PageSkeleton({ label = "読み込み中" }: { label?: string }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
      className="min-h-screen bg-background"
    >
      <div className="flex h-14 items-center gap-3 border-b border-border bg-card px-5">
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

/** リスト・テーブル・フォーム向けの汎用スケルトン行。 */
export function SkeletonRows({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      aria-label="読み込み中"
      className={cn("space-y-4", className)}
    >
      {Array.from({ length: rows }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: プレースホルダ行は位置が同一性
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
