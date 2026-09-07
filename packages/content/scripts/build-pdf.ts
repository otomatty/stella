/**
 * 教材 (slides.md / doc.md / practice.md) を配布用 PDF に変換する
 * (docs/superpowers/specs/2026-08-26-material-pdf-auto-conversion-design.md)。
 *
 *   bun run --filter=@stella/content pdf                      # 全講座
 *   bun run --filter=@stella/content pdf -- typescript-basics # 講座を絞る
 *   bun run --filter=@stella/content pdf -- --manifest out.json --skip existing-keys.txt
 *
 * 見た目はアプリと同じ:
 * - slides … 16:9 (1280x720 / 1 スライド 1 ページ)。apps/web の slides-skin.css を
 *   そのまま読み込み、MarkdownSlides と同じ本文倍率 (--s) の自動調整をページ内で行う。
 * - doc / practice … A4 縦 (scripts/pdf/print-doc.css)。practice は前半 = 問題編、
 *   後半 = 解答編 (src/practice-pdf.ts) に再構成し、講師ノートは manifest 側で
 *   除去済みの本文だけを使う。
 *
 * 出力は `--out` (既定 dist/pdf) 配下に R2 キーと同じパスで置く。キーは内容ハッシュ
 * 入りで不変なので、既に存在するファイル / `--skip` で渡された既存キーは再生成しない。
 * `--manifest` に全対象の一覧 (キー・ハッシュ・ファイル名) を JSON で書き出し、
 * アップロードと seed がそれを読む。
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import bash from "highlight.js/lib/languages/bash";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import typescript from "highlight.js/lib/languages/typescript";
import { chromium } from "playwright";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { Element, Root } from "hast";

import {
  collectPdfTargets,
  pdfFileName,
  pdfObjectKey,
  pdfSourceHash,
  type PdfTarget,
} from "../src/material-pdf.js";
import { parseQuiz } from "../src/parse-quiz.js";
import { splitPracticeForPdf } from "../src/practice-pdf.js";

const here = dirname(fileURLToPath(import.meta.url));
const contentRoot = resolve(here, "..");
const repoRoot = resolve(contentRoot, "..", "..");
const nodeRequire = createRequire(import.meta.url);

// ---------------------------------------------------------------- 引数

const args = process.argv.slice(2);
function argValue(name: string): string | null {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}
const outDir = resolve(contentRoot, argValue("--out") ?? join("dist", "pdf"));
const manifestPath = argValue("--manifest");
const skipFile = argValue("--skip");
const concurrency = Number(argValue("--concurrency") ?? 4);
const courseSlugs = args.filter(
  (a, i) =>
    !a.startsWith("--") &&
    !["--out", "--manifest", "--skip", "--concurrency"].includes(args[i - 1] ?? ""),
);

/**
 * アップロード済みで生成もアップロードも要らないキー (1 行 1 件)。
 * 生のキーではなく **キーの SHA-256** で渡される (upload-pdfs.ts の台帳と同じ形 —
 * 公開バケットに置く台帳から生のキーが漏れないようにするため)。
 */
const skipKeyHashes = new Set<string>(
  skipFile
    ? readFileSync(skipFile, "utf8")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    : [],
);
const keyHash = (key: string): string => createHash("sha256").update(key).digest("hex");

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

function renderMarkdown(
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

function escapeHtml(text: string): string {
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

const fontCss = [
  ...[400, 500, 700, 900].map((w) => fontsourceCss(`@fontsource/noto-sans-jp/${w}.css`)),
  ...[400, 500].map((w) => fontsourceCss(`@fontsource/jetbrains-mono/${w}.css`)),
].join("\n");

const hljsCss = readFileSync(nodeRequire.resolve("highlight.js/styles/github.css"), "utf8");
const skinCss = readFileSync(
  join(repoRoot, "apps", "web", "src", "components", "learner", "slides-skin.css"),
  "utf8",
);
const docCss = readFileSync(join(here, "pdf", "print-doc.css"), "utf8");

// ---------------------------------------------------------------- HTML 組み立て

const CLASS_DIRECTIVE = /<!--\s*_class:\s*(\w+)\s*-->/;

function slidesHtml(target: PdfTarget, assets: Map<string, string>): string {
  const slides = target.source
    .split(/\n---\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const sections = slides
    .map((slide, i) => {
      const cls = CLASS_DIRECTIVE.exec(slide)?.[1] ?? null;
      const body = slide.replace(CLASS_DIRECTIVE, "").trimStart();
      const variant = cls === "lead" ? " is-lead" : cls === "summary" ? " is-summary" : "";
      return [
        `<div class="sf-slide${variant}">`,
        `<div class="sf-header">${escapeHtml(target.courseTitle)}</div>`,
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
@page { size: 1280px 720px; margin: 0; }
html, body { margin: 0; padding: 0; }
.sf-slide { break-after: page; }
.sf-slide:last-child { break-after: auto; }
</style></head><body>${sections}</body></html>`;
}

function docHtml(target: PdfTarget, assets: Map<string, string>, parts: string[]): string {
  const body = parts
    .filter((p) => p.trim() !== "")
    .map((p, i) =>
      i === 0
        ? `<main class="doc-body">${renderMarkdown(p, assets, false)}</main>`
        : `<main class="doc-body pdf-answers">${renderMarkdown(p, assets, false)}</main>`,
    )
    .join("\n");
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
${fontCss}
${hljsCss}
${docCss}
</style></head><body>
<div class="doc-header">${escapeHtml(target.courseTitle)}</div>
${body}
</body></html>`;
}

// ---------------------------------------------------------------- 生成

/** MarkdownSlides の本文倍率調整と同じロジックをページ内で実行する。 */
const AUTOSCALE_SCRIPT = `
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

interface ManifestEntry {
  tenantId: string;
  courseSlug: string;
  lessonId: string;
  kind: PdfTarget["kind"];
  hash: string;
  key: string;
  fileName: string;
  /** ローカルに実体があるときだけ。skip されたキーは null (サイズは R2 側が知っている)。 */
  sizeBytes: number | null;
}

async function main(): Promise<void> {
  const targets = collectPdfTargets().filter(
    (t) => courseSlugs.length === 0 || courseSlugs.includes(t.courseSlug),
  );
  const jobs = targets.map((target) => {
    const hash = pdfSourceHash(target);
    const key = pdfObjectKey(target, hash);
    return { target, hash, key, outFile: join(outDir, key) };
  });
  const pending = jobs.filter((j) => !skipKeyHashes.has(keyHash(j.key)) && !existsSync(j.outFile));
  console.log(
    `PDF targets: ${jobs.length} (generate: ${pending.length}, skip: ${jobs.length - pending.length})`,
  );

  if (pending.length > 0) {
    const executablePath = existsSync("/opt/pw-browsers/chromium")
      ? "/opt/pw-browsers/chromium"
      : undefined;
    const browser = await chromium.launch(executablePath ? { executablePath } : {});
    const htmlDir = mkdtempSync(join(tmpdir(), "falcon-pdf-"));
    let built = 0;
    try {
      const queue = [...pending];
      const worker = async () => {
        const page = await browser.newPage();
        // 生成の決定性と安全のため、ページからの外部ネットワークアクセスを遮断する。
        // 教材はローカルの file:// (本文 HTML・assets・フォント) だけで完結しており、
        // 本文が外部 URL を参照していても PDF はリポジトリ内容だけから決まる。
        await page.route(
          (url) => url.protocol !== "file:",
          (route) => route.abort(),
        );
        for (;;) {
          const job = queue.shift();
          if (!job) break;
          const { target } = job;
          const assets = new Map(target.assets.map((a) => [a.key, a.file]));
          let html: string;
          let isSlides = false;
          if (target.kind === "slides") {
            html = slidesHtml(target, assets);
            isSlides = true;
          } else if (target.kind === "practice") {
            const { problems, answers } = splitPracticeForPdf(
              target.source,
              parseQuiz(target.source),
            );
            html = docHtml(target, assets, [problems, answers]);
          } else {
            html = docHtml(target, assets, [target.source]);
          }
          const htmlFile = join(htmlDir, `${job.hash}.html`);
          writeFileSync(htmlFile, html);
          await page.goto(pathToFileURL(htmlFile).href, { waitUntil: "networkidle" });
          await page.evaluate(() => document.fonts.ready.then(() => undefined));
          if (isSlides) await page.evaluate(AUTOSCALE_SCRIPT);
          mkdirSync(dirname(job.outFile), { recursive: true });
          await page.pdf(
            isSlides
              ? {
                  path: job.outFile,
                  width: "1280px",
                  height: "720px",
                  printBackground: true,
                }
              : {
                  path: job.outFile,
                  format: "A4",
                  printBackground: true,
                  displayHeaderFooter: true,
                  headerTemplate: "<span></span>",
                  footerTemplate:
                    '<div style="width:100%;text-align:center;font-size:8px;color:#8a8a93;">' +
                    '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
                  margin: { top: "18mm", bottom: "20mm", left: "16mm", right: "16mm" },
                },
          );
          rmSync(htmlFile, { force: true });
          built++;
          if (built % 25 === 0) console.log(`  ${built}/${pending.length}`);
        }
        await page.close();
      };
      await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
    } finally {
      await browser.close();
      rmSync(htmlDir, { recursive: true, force: true });
    }
    console.log(`✓ generated ${built} PDFs`);
  }

  if (manifestPath) {
    const manifest: ManifestEntry[] = jobs.map((j) => ({
      tenantId: j.target.tenantId,
      courseSlug: j.target.courseSlug,
      lessonId: j.target.lessonId,
      kind: j.target.kind,
      hash: j.hash,
      key: j.key,
      fileName: pdfFileName(j.target),
      sizeBytes: existsSync(j.outFile) ? statSync(j.outFile).size : null,
    }));
    mkdirSync(dirname(resolve(manifestPath)), { recursive: true });
    writeFileSync(resolve(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`✓ manifest: ${manifestPath} (${manifest.length} entries)`);
  }
}

await main();
