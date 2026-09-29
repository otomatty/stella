/**
 * スライド (slides レッスンの markdown) をアプリと同じ見た目の HTML にする。
 * 配布 PDF (scripts/build-pdf.ts) と教材動画 (scripts/build-video.ts) が共用する。
 *
 * - apps/web の slides-skin.css をそのまま読み込み、1 スライド = 1280x720 の `.sf-slide`
 * - コードハイライトは MarkdownSlides と同じ highlight.js (GitHub Light)
 * - フォントは @fontsource (Noto Sans JP / JetBrains Mono) を file:// で埋め込む
 *   (外部フェッチせず決定的にする)
 * - 本文倍率 (--s) の自動調整は MarkdownSlides と同じロジックを AUTOSCALE_SCRIPT で
 *   ページ内に流す
 *
 * Playwright はここに持ち込まない (HTML の組み立てだけ)。
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import bash from "highlight.js/lib/languages/bash";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import typescript from "highlight.js/lib/languages/typescript";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { Element, Root } from "hast";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..", "..");
const nodeRequire = createRequire(import.meta.url);

// ---------------------------------------------------------------- markdown → HTML

/** MarkdownSlides と同じ言語サブセット。未登録言語はハイライトなしで素通しになる。 */
const highlightOptions = {
  aliases: { typescript: ["ts"], javascript: ["js"], bash: ["sh"] },
  languages: { typescript, javascript, bash, json },
};

/** MarkdownSlides と同じ: alt が `w:950` 形式なら装飾扱いで読み上げさせない。 */
const MARP_SIZE_ALT = /^(?:[wh]:\d+%?\s*)+$/;

function altWidth(alt: string | undefined): number {
  const m = alt ? /w:(\d+)/.exec(alt) : null;
  return m ? Number(m[1]) : 950;
}

/**
 * 画像の src (R2 オブジェクトキー) をローカルファイルの file:// URL に差し替える。
 * slides では pptx / アプリと同じく alt の `w:` を本文倍率連動の幅にする。
 */
function rehypeLocalImages(options: { assets: Map<string, string>; slideWidths: boolean }) {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "img") return;
      const src = node.properties.src;
      if (typeof src === "string") {
        const file = options.assets.get(src);
        if (file) node.properties.src = pathToFileURL(file).href;
      }
      const alt = typeof node.properties.alt === "string" ? node.properties.alt : "";
      if (MARP_SIZE_ALT.test(alt.trim())) node.properties.alt = "";
      if (options.slideWidths) {
        node.properties.style = `width: calc(${altWidth(alt)}px * var(--s))`;
      }
    });
  };
}

export function renderMarkdown(
  markdown: string,
  assets: Map<string, string>,
  slideWidths: boolean,
): string {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeHighlight, highlightOptions)
    .use(rehypeLocalImages, { assets, slideWidths })
    .use(rehypeStringify)
    .processSync(markdown)
    .toString();
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---------------------------------------------------------------- CSS (フォント埋め込み)

/** @fontsource の CSS を読み、相対 URL を file:// の絶対 URL に書き換える。 */
function fontsourceCss(specifier: string): string {
  const cssPath = nodeRequire.resolve(specifier);
  const css = readFileSync(cssPath, "utf8");
  const base = dirname(cssPath);
  return css.replace(
    /url\(\.\/(.+?)\)/g,
    (_, rel: string) => `url(${pathToFileURL(join(base, rel)).href})`,
  );
}

export const fontCss = [
  ...[400, 500, 700, 900].map((w) => fontsourceCss(`@fontsource/noto-sans-jp/${w}.css`)),
  ...[400, 500].map((w) => fontsourceCss(`@fontsource/jetbrains-mono/${w}.css`)),
].join("\n");

export const hljsCss = readFileSync(nodeRequire.resolve("highlight.js/styles/github.css"), "utf8");
const skinCss = readFileSync(
  join(repoRoot, "apps", "web", "src", "components", "learner", "slides-skin.css"),
  "utf8",
);

// ---------------------------------------------------------------- HTML 組み立て

const CLASS_DIRECTIVE = /<!--\s*_class:\s*(\w+)\s*-->/;

/** lessons.markdown (`---` 区切り) をスライド本文の列にする。MarkdownSlides と同じ分け方。 */
export function splitLessonSlides(markdown: string): string[] {
  return markdown
    .split(/\n---\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * スライド全部を 1 枚の HTML にする (`.sf-slide` が縦に並ぶ)。
 * `extraCss` は用途ごとの追記 (PDF の @page、動画の字幕帯など)。
 */
export function slidesHtml(
  markdown: string,
  courseTitle: string,
  assets: Map<string, string>,
  extraCss = "",
): string {
  const sections = splitLessonSlides(markdown)
    .map((slide, i) => {
      const cls = CLASS_DIRECTIVE.exec(slide)?.[1] ?? null;
      const body = slide.replace(CLASS_DIRECTIVE, "").trimStart();
      const variant = cls === "lead" ? " is-lead" : cls === "summary" ? " is-summary" : "";
      return [
        `<div class="sf-slide${variant}">`,
        `<div class="sf-header">${escapeHtml(courseTitle)}</div>`,
        `<div class="sf-body">${renderMarkdown(body, assets, true)}</div>`,
        `<div class="sf-pageno">${i + 1}</div>`,
        "</div>",
      ].join("");
    })
    .join("\n");
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
${fontCss}
${hljsCss}
${skinCss}
${extraCss}
</style></head><body>${sections}</body></html>`;
}

/** MarkdownSlides の本文倍率調整と同じロジックをページ内で実行する。 */
export const AUTOSCALE_SCRIPT = `
(() => {
  const BODY_AVAIL_H = 615;
  const SCALE_MAX = 1.45;
  const SCALE_MIN = 0.8;
  for (const el of document.querySelectorAll(".sf-slide:not(.is-lead) .sf-body")) {
    const overflows = () =>
      el.scrollHeight > BODY_AVAIL_H ||
      Array.from(el.querySelectorAll("pre, pre code")).some(
        (node) => node.scrollWidth > node.clientWidth,
      );
    let scale = SCALE_MAX;
    el.style.setProperty("--s", String(scale));
    while (scale > SCALE_MIN && overflows()) {
      scale = Math.round((scale - 0.05) * 100) / 100;
      el.style.setProperty("--s", String(scale));
    }
  }
})();
`;
