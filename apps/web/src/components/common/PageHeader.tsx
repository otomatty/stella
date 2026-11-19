import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  /** 見出しの上に置く戻り先へのリンク。 */
  back?: ReactNode;
  /** 題の前に表示する分類や状態のバッジ。 */
  eyebrow?: ReactNode;
  /** 副題の下に添える進捗などの補足情報。 */
  meta?: ReactNode;
  /** 呼び出し先で見出し全体の余白などを調整するクラス。 */
  className?: string;
}

/**
 * ページ見出し。狭幅ではアクションを見出しの下へ折り返す。
 *
 * 横並びのままだと `whitespace-nowrap` のボタンが幅を占有し、見出しが 1 文字ずつ
 * 縦積みに潰れてしまうため、sm 未満は縦積みに切り替える。
 */
export const PageHeader = ({
  title,
  sub,
  actions,
  back,
  eyebrow,
  meta,
  className,
}: PageHeaderProps) => (
  <header className={cn("mb-6 pb-5 border-b border-border", className)}>
    {back ? <div className="mb-2 text-[13px] text-ink-2">{back}</div> : null}
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:gap-5">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2 flex flex-wrap gap-2">{eyebrow}</div> : null}
        <h1 className="break-words text-[19px] sm:text-[22px] tracking-tight font-semibold">
          {title}
        </h1>
        {sub ? <div className="text-ink-3 text-[13px] mt-1">{sub}</div> : null}
        {meta ? <div className="mt-2 space-y-1">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap gap-2 sm:ml-auto sm:shrink-0 sm:justify-end">{actions}</div>
      ) : null}
    </div>
  </header>
);
