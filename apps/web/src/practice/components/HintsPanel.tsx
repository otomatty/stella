import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

interface Props {
  hints?: string[];
}

/**
 * `assignment.hints` を 1 つずつ開示できるパネル。
 *
 * - 初期状態: 「ヒントを見る (1/N)」ボタンのみ
 * - 開示後: 開示済みヒントが順番に並ぶ
 * - 全部開示: 末尾に「ヒント終了」ラベル
 *
 * 状態は React state のみで保持。永続化は Phase 6 で localStorage 化予定。
 * 課題切替時は親側で `key={assignment.id}` を渡してリセットする。
 */
export function HintsPanel({ hints }: Props) {
  const total = hints?.length ?? 0;
  const [revealedCount, setRevealedCount] = useState(0);

  if (!hints || total === 0) {return null;}

  const revealed = hints.slice(0, revealedCount);
  const allRevealed = revealedCount >= total;

  return (
    <div className="mt-6 border-t border-ink-100 pt-4 dark:border-ink-700">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
          aria-label="段階的ヒント"
        >
          ヒント
        </span>
        <span className="font-sans text-[11px] text-muted-foreground">
          {revealedCount}/{total}
        </span>
      </div>

      {revealed.length > 0 ? (
        <ol className="m-0 list-none space-y-2 p-0">
          {revealed.map((hint, i) => (
            <li
              key={i}
              className={cn(
                "rounded-lg border border-ink-100 bg-ink-50 px-3.5 py-2.5 font-jp text-[13.5px] leading-[1.65] text-ink-800 dark:border-ink-700 dark:bg-ink-800/40 dark:text-ink-100",
                "[&_code]:rounded [&_code]:bg-ink-100 [&_code]:px-[5px] [&_code]:py-px [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-ink-800 dark:[&_code]:bg-ink-700 dark:[&_code]:text-ink-100",
                "[&_p]:m-0 [&_p+p]:mt-1.5",
              )}
            >
              <div className="mb-1 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                ヒント {i + 1}
              </div>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{hint}</ReactMarkdown>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="mt-3">
        {allRevealed ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-3 py-1 font-sans text-[12px] font-semibold text-success dark:bg-success/10">
            ヒント終了
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setRevealedCount((n) => Math.min(n + 1, total))}
            className="rounded-md border border-border bg-card px-3 py-1.5 font-sans text-[12.5px] font-medium text-foreground transition-colors hover:border-blue-500 hover:text-blue-700 dark:hover:border-blue-300 dark:hover:text-blue-300"
          >
            {revealedCount === 0
              ? `ヒントを見る (1/${total})`
              : `次のヒントを見る (${revealedCount + 1}/${total})`}
          </button>
        )}
      </div>
    </div>
  );
}
