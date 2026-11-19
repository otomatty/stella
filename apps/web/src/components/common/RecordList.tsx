import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RecordListProps {
  /** 一覧の読み上げ用の名前。 */
  "aria-label"?: string;
  /** 一覧に追加するクラス。 */
  className?: string;
  /** 一覧に並べる行。 */
  children: ReactNode;
}

interface RecordItemProps {
  /** 左端に置くもの (アバターなど)。 */
  leading?: ReactNode;
  /** 1 行目に強調して出す内容。 */
  title: ReactNode;
  /** タイトルの右に添える内容。 */
  titleSuffix?: ReactNode;
  /** 2 行目以降に折り返して表示する補足。 */
  subtitle?: ReactNode;
  /** 折り返して並べるバッジ。 */
  badges?: ReactNode;
  /** 右上に小さく表示する補足。 */
  meta?: ReactNode;
  /** 行を押す操作とは別に押せる右端の操作。 */
  actions?: ReactNode;
  /** 指定すると本文全体が 1 つのボタンになる。 */
  onClick?: () => void;
  /** 無効な行を薄く表示する。 */
  dimmed?: boolean;
  /** 行に追加するクラス。 */
  className?: string;
}

// 狭い幅でも各項目と操作に届くよう、呼び出し側が画面幅で切り替え、表と同時には描かない。
export function RecordList({ "aria-label": ariaLabel, className, children }: RecordListProps) {
  return (
    <ul aria-label={ariaLabel} className={cn("divide-y divide-border", className)}>
      {children}
    </ul>
  );
}

export function RecordItem({
  leading,
  title,
  titleSuffix,
  subtitle,
  badges,
  meta,
  actions,
  onClick,
  dimmed,
  className,
}: RecordItemProps) {
  const bodyClassName = "flex min-w-0 flex-1 items-start gap-3";
  const body = (
    <>
      {leading != null ? <span className="flex shrink-0">{leading}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0 break-words text-[13.5px] font-medium">
            {title}
            {titleSuffix != null ? <span className="ml-1">{titleSuffix}</span> : null}
          </span>
          {meta != null ? <span className="shrink-0 text-[11.5px] text-ink-3">{meta}</span> : null}
        </span>
        {subtitle != null ? (
          <span className="mt-0.5 block break-words text-[12px] text-ink-3">{subtitle}</span>
        ) : null}
        {badges != null ? (
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">{badges}</span>
        ) : null}
      </span>
    </>
  );

  return (
    <li className={cn("flex items-start gap-2 px-4 py-3", dimmed && "opacity-60", className)}>
      {onClick ? (
        <button
          type="button"
          className={cn(
            bodyClassName,
            "rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          )}
          onClick={onClick}
        >
          {body}
        </button>
      ) : (
        <div className={bodyClassName}>{body}</div>
      )}
      {actions != null ? <div className="shrink-0">{actions}</div> : null}
    </li>
  );
}
