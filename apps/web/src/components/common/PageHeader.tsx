import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}

/**
 * ページ見出し。 狭幅ではアクションを見出しの下へ折り返す。
 * 横並びのままだと `whitespace-nowrap` のボタンが幅を占有し、 見出しが 1 文字ずつ
 * 縦積みに潰れてしまうため、 sm 未満は縦積みに切り替える。
 */
export const PageHeader = ({ title, sub, actions }: PageHeaderProps) => (
  <div className="flex flex-col items-stretch gap-3 mb-6 pb-5 border-b border-border sm:flex-row sm:items-end sm:gap-5">
    <div className="min-w-0">
      <h1 className="text-[19px] sm:text-[22px] tracking-tight font-semibold">{title}</h1>
      {sub ? <div className="text-ink-3 text-[13px] mt-1">{sub}</div> : null}
    </div>
    {actions ? (
      <div className="flex flex-wrap gap-2 sm:ml-auto sm:shrink-0 sm:justify-end">{actions}</div>
    ) : null}
  </div>
);
