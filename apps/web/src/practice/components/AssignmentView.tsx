import { Fragment } from "react";
import type {
  Assignment,
  Difficulty,
  MdnSection,
} from "@falcon/shared/types";
import { findChapter } from "@falcon/shared/assignments";
import javascript from "highlight.js/lib/languages/javascript";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import type { Options as RehypeHighlightOptions } from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";
import { HintsPanel } from "./HintsPanel.js";

interface Props {
  assignment: Assignment;
}

function difficultyStars(d: Difficulty): string {
  return "★".repeat(d) + "☆".repeat(3 - d);
}

/**
 * `chapter.defaultMdnPage` に `#宣言` のようなフラグメントが付いていても、
 * セクション用 URL を組み立てるときはベースパスだけを使う。
 */
function stripUrlFragment(url: string): string {
  const i = url.indexOf("#");
  return i === -1 ? url : url.slice(0, i);
}

/**
 * MdnSection から実際にジャンプする URL を組み立てる。
 *
 * - `pageUrl` が指定されていればそれを使い、なければ章の `defaultMdnPage`（フラグメントは除去）
 * - フラグメントは `anchor ?? heading` (JA MDN は日本語見出しがそのまま anchor になる)
 *
 * 戻り値の URL に含まれる日本語はブラウザが自動的に percent-encode する。
 */
function buildMdnSectionUrl(section: MdnSection, chapterDefaultPage: string): string {
  const baseRaw = section.pageUrl ?? chapterDefaultPage;
  const base = stripUrlFragment(baseRaw);
  const anchor = section.anchor ?? section.heading;
  return `${base}#${anchor}`;
}

/** UI に出すリンク文言（別ページ参照時は pageTitle を前置）。 */
function mdnSectionLinkLabel(section: MdnSection): string {
  if (section.pageUrl && section.pageTitle) {
    return `${section.pageTitle} §${section.heading}`;
  }
  return `§${section.heading}`;
}

const rehypeHighlightOptions = {
  aliases: {
    javascript: ["js", "jsx", "mjs", "cjs"],
  },
  languages: {
    javascript,
  },
} satisfies RehypeHighlightOptions;

const MARKDOWN_BODY = cn(
  "min-h-0 flex-1 overflow-y-auto px-7 pt-6 pb-8 font-jp text-[14px] leading-[1.7] text-ink-800 dark:text-ink-100",
  // h2: 課題タイトル
  "[&_h2]:m-0 [&_h2]:mb-3 [&_h2]:font-jp [&_h2]:text-[22px] [&_h2]:font-bold [&_h2]:leading-[1.3] [&_h2]:tracking-[-0.015em] [&_h2]:text-foreground",
  // h3: 区切り見出し (uppercase tracked)
  "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-sans [&_h3]:text-[13px] [&_h3]:font-bold [&_h3]:leading-[1.4] [&_h3]:uppercase [&_h3]:tracking-[0.12em] [&_h3]:text-muted-foreground",
  "[&_p]:my-3",
  "[&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul_li::marker]:text-ink-400",
  "[&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5",
  // pre: ダーク背景固定 (light/dark 両方で同じ Acial dark surface)
  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-ink-900 [&_pre]:px-4 [&_pre]:py-3.5 [&_pre]:font-mono [&_pre]:text-[12.5px] [&_pre]:leading-[1.6] [&_pre]:text-ink-200",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit",
  // inline code
  "[&_code]:rounded [&_code]:bg-ink-100 [&_code]:px-[5px] [&_code]:py-px [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-ink-800 dark:[&_code]:bg-ink-700 dark:[&_code]:text-ink-100",
  // table
  "[&_table]:my-2.5 [&_table]:mb-4 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-md [&_table]:border [&_table]:border-border [&_table]:text-[12.5px]",
  "[&_th]:border-b [&_th]:border-border [&_th]:bg-ink-50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:align-top [&_th]:font-sans [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.08em] [&_th]:text-muted-foreground dark:[&_th]:bg-ink-800",
  "[&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-left [&_td]:align-top",
  "[&_tr:last-child_td]:border-b-0",
);

/**
 * 課題説明を表示するペイン。
 * GFM テーブルとコードブロックのシンタックスハイライトに対応する。
 */
export function AssignmentView({ assignment }: Props) {
  const chapter = findChapter(assignment.chapterId);
  const sections = assignment.mdnSections ?? [];
  return (
    <div className={MARKDOWN_BODY}>
      {chapter && (
        <div className="mb-5 border-b border-ink-100 pb-3.5 dark:border-ink-700">
          <div className="font-sans text-[11px] leading-[1.55] text-muted-foreground">
            <span className="font-bold text-foreground">{chapter.label}</span>
            {chapter.description ? ` — ${chapter.description}` : null}
          </div>
          <div className="mt-1 font-sans text-[11px] leading-[1.55]">
            <span className="font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              MDN ·{" "}
            </span>
            <a
              href={chapter.defaultMdnPage}
              target="_blank"
              rel="noreferrer"
              className="border-b border-ink-300 pb-px font-medium text-ink-700 no-underline hover:border-blue-500 hover:text-blue-700 dark:border-ink-600 dark:text-ink-200 dark:hover:border-blue-300 dark:hover:text-blue-300"
            >
              {chapter.mdnPageTitle}
            </a>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-sans text-[11.5px] leading-[1.55] text-muted-foreground">
            <span
              className="font-semibold uppercase tracking-widest text-ink-400 dark:text-ink-500"
              aria-label={
                sections.length > 0
                  ? "参考にする MDN セクション"
                  : "この章の MDN ページ"
              }
            >
              {sections.length > 0 ? "参考" : "Reference"}
            </span>
            {sections.length > 0 ? (
              sections.map((section, i) => {
                const url = buildMdnSectionUrl(
                  section,
                  chapter.defaultMdnPage,
                );
                return (
                  <Fragment key={`${section.heading}-${i}`}>
                    {i > 0 && (
                      <span
                        aria-hidden
                        className="text-ink-300 dark:text-ink-600"
                      >
                        ·
                      </span>
                    )}
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink-600 no-underline underline-offset-[3px] hover:text-blue-700 hover:underline dark:text-ink-300 dark:hover:text-blue-300"
                    >
                      {mdnSectionLinkLabel(section)}
                    </a>
                  </Fragment>
                );
              })
            ) : (
              <a
                href={chapter.defaultMdnPage}
                target="_blank"
                rel="noreferrer"
                className="text-ink-600 no-underline underline-offset-[3px] hover:text-blue-700 hover:underline dark:text-ink-300 dark:hover:text-blue-300"
              >
                【{chapter.mdnPageTitle}】
              </a>
            )}
          </div>
        </div>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-[3px] font-sans text-[11px] font-semibold text-muted-foreground"
          title="新しく学ぶ概念"
        >
          NEW · {assignment.newConcept}
        </span>
        <span
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-[3px] font-sans text-[11px] font-semibold text-muted-foreground"
          title="想定所要時間"
        >
          ⏱ 約 {assignment.estimatedMinutes} 分
        </span>
        <span
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-[3px] font-sans text-[11px] font-semibold text-amber-600 dark:text-amber-300"
          title={`難易度 ${assignment.difficulty}/3`}
        >
          {difficultyStars(assignment.difficulty)}
        </span>
        <span
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-[3px] font-sans text-[11px] font-semibold text-muted-foreground"
          title={
            assignment.testKind === "function"
              ? "関数を実装してテストを通す形式"
              : "console.log の出力を採点する形式"
          }
        >
          {assignment.testKind === "function"
            ? "⚙ 関数を実装"
            : "🖥 stdout で結果確認"}
        </span>
      </div>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, rehypeHighlightOptions]]}
      >
        {assignment.description}
      </ReactMarkdown>
      <HintsPanel key={assignment.id} hints={assignment.hints} />
    </div>
  );
}
