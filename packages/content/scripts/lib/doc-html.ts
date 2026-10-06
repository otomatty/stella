/**
 * まとめ・課題文 (doc / task) の配布 PDF の本文 HTML。build-pdf.ts が A4 の紙面に流し込む。
 *
 * OS 別のブロック (`:::os`。07 §11) は、OS ごとに分けた PDF ならその OS の手順だけにし、
 * それ以外は両方を「Windows の場合」「macOS の場合」の見出し付きで並べる (紙では
 * タブを切り替えられないため)。見た目は scripts/pdf/print-doc.css の `.os-block`。
 */

import {
  OS_LABELS,
  type OsName,
  orderedOsBlocks,
  parseOsBlocks,
  selectOsMarkdown,
} from "../../../shared/src/markdown/os-blocks.js";
import { escapeHtml, renderMarkdown } from "./slide-html.js";

/** 本文の HTML。`os` を渡すとその OS の手順だけにする。 */
export function docBodyHtml(
  source: string,
  assets: Map<string, string>,
  os: OsName | undefined,
): string {
  if (os) return renderMarkdown(selectOsMarkdown(source, os), assets, false);
  const { segments } = parseOsBlocks(source);
  return segments
    .map((segment) =>
      segment.kind === "markdown"
        ? renderMarkdown(segment.markdown, assets, false)
        : orderedOsBlocks(segment.blocks)
            .map(
              (block) =>
                `<section class="os-block"><p class="os-block-heading">${escapeHtml(OS_LABELS[block.os])} の場合</p>\n${renderMarkdown(block.markdown, assets, false)}</section>`,
            )
            .join("\n"),
    )
    .join("\n");
}
