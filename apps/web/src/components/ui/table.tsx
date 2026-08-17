import * as React from "react";
import { cn } from "@/lib/utils";

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    // 狭幅では表を潰さず横スクロールさせる (成績台帳・管理系テーブル共通)。
    // 最小幅は lg 未満だけに効かせる。 全幅で min-w-max にすると、 設問文のような
    // 長い可変長セルがデスクトップでも折り返さなくなり、 表が不必要に横へ伸びる。
    <div className="w-full max-w-full overflow-x-auto">
      <table
        ref={ref}
        className={cn(
          "w-full max-lg:min-w-max text-[13px] border-separate border-spacing-0",
          className,
        )}
        {...props}
      />
    </div>
  ),
);
Table.displayName = "Table";

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => <thead ref={ref} className={cn("", className)} {...props} />);
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => <tbody ref={ref} className={cn("", className)} {...props} />);
TableBody.displayName = "TableBody";

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  // scope="col" は読み上げが列見出しとセルを対応付けるために必要。 呼び出し側で上書きできる。
  <th
    ref={ref}
    scope="col"
    className={cn(
      "text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground",
      "px-4 py-2.5 border-b border-border bg-sunken whitespace-nowrap",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }
>(({ className, interactive, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(interactive ? "cursor-pointer hover:bg-sunken" : "", className)}
    {...props}
  />
));
TableRow.displayName = "TableRow";

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-4 py-3 border-b border-border align-middle [tr:last-child_&]:border-b-0",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";
