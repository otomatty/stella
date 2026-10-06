/**
 * 教材 (slides.md / doc.md / practice.md) を配布用 PDF に変換する。
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
 * - まとめ・課題文の OS 別のブロック (`:::os`) は、OS ごとに分けた PDF (`target.os`) なら
 *   その OS のものだけ、それ以外は両方を「Windows の場合」「macOS の場合」と並べる (07 §11)。
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
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright";

import {
  collectPdfTargets,
  pdfFileName,
  pdfObjectKey,
  pdfSourceHash,
  type PdfTarget,
} from "../src/material-pdf.js";
import { OS_LABELS } from "../../shared/src/markdown/os-blocks.js";
import { parseQuiz } from "../src/parse-quiz.js";
import { splitPracticeForPdf } from "../src/practice-pdf.js";
import { docBodyHtml } from "./lib/doc-html.js";
import {
  AUTOSCALE_SCRIPT,
  escapeHtml,
  fontCss,
  hljsCss,
  renderMarkdown,
  slidesHtml as renderSlidesHtml,
} from "./lib/slide-html.js";

const here = dirname(fileURLToPath(import.meta.url));
const contentRoot = resolve(here, "..");

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

// ---------------------------------------------------------------- HTML 組み立て
//
// スライドの HTML はアプリの見た目の正本 (slides-skin.css) を読む lib/slide-html.ts が
// 組む (教材動画と共用)。PDF はそこへ改ページの指定だけを足す。

const docCss = readFileSync(join(here, "pdf", "print-doc.css"), "utf8");

const SLIDES_PRINT_CSS = `@page { size: 1280px 720px; margin: 0; }
html, body { margin: 0; padding: 0; }
.sf-slide { break-after: page; }
.sf-slide:last-child { break-after: auto; }`;

function slidesHtml(target: PdfTarget, assets: Map<string, string>): string {
  return renderSlidesHtml(target.source, target.courseTitle, assets, SLIDES_PRINT_CSS);
}

function docHtml(target: PdfTarget, parts: string[]): string {
  const body = parts
    .filter((p) => p.trim() !== "")
    .map((p, i) =>
      i === 0
        ? `<main class="doc-body">${p}</main>`
        : `<main class="doc-body pdf-answers">${p}</main>`,
    )
    .join("\n");
  const header = target.os
    ? `${target.courseTitle} ・ ${OS_LABELS[target.os]} 版`
    : target.courseTitle;
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
${fontCss}
${hljsCss}
${docCss}
</style></head><body>
<div class="doc-header">${escapeHtml(header)}</div>
${body}
</body></html>`;
}

// ---------------------------------------------------------------- 生成

interface ManifestEntry {
  tenantId: string;
  courseSlug: string;
  lessonId: string;
  kind: PdfTarget["kind"];
  /** OS ごとに分けた PDF の OS。分けない PDF には無い。 */
  os?: PdfTarget["os"];
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
    const htmlDir = mkdtempSync(join(tmpdir(), "stella-pdf-"));
    let built = 0;
    const failed: string[] = [];
    try {
      const queue = [...pending];
      const worker = async () => {
        let page = await browser.newPage();
        // 生成の決定性と安全のため、ページからの外部ネットワークアクセスを遮断する。
        // 教材はローカルの file:// (本文 HTML・assets・フォント) だけで完結しており、
        // 本文が外部 URL を参照していても PDF はリポジトリ内容だけから決まる。
        const blockRemote = async () => {
          await page.route(
            (url) => url.protocol !== "file:",
            (route) => route.abort(),
          );
        };
        await blockRemote();
        for (;;) {
          const job = queue.shift();
          if (!job) break;
          const { target } = job;
          const label = `${target.courseSlug}/${target.lessonId}/${target.kind}${target.os ? `/${target.os}` : ""}`;
          try {
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
              html = docHtml(
                target,
                [problems, answers].map((part) =>
                  part.trim() === "" ? "" : renderMarkdown(part, assets, false),
                ),
              );
            } else {
              html = docHtml(target, [docBodyHtml(target.source, assets, target.os)]);
            }
            const htmlFile = join(htmlDir, `${job.hash}.html`);
            writeFileSync(htmlFile, html);
            // file:// 以外は上で abort しているので networkidle は永遠に来ないことがある
            // (外部画像・フォントを参照する教材)。load + fonts.ready で足りる。
            await page.goto(pathToFileURL(htmlFile).href, { waitUntil: "load" });
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
          } catch (e) {
            failed.push(label);
            const reason = e instanceof Error ? e.message.split("\n")[0] : String(e);
            console.warn(`PDF failed ${label}: ${reason}`);
            // 途中まで書かれた PDF は次回実行で「生成済み」と誤判定されるため削除する。
            rmSync(job.outFile, { force: true });
            await page.close().catch(() => undefined);
            page = await browser.newPage();
            await blockRemote();
          }
        }
        await page.close();
      };
      await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
    } finally {
      await browser.close();
      rmSync(htmlDir, { recursive: true, force: true });
    }
    console.log(`✓ generated ${built} PDFs`);
    if (failed.length > 0) {
      throw new Error(
        `PDF generation failed for ${failed.length} targets: ${failed.slice(0, 10).join(", ")}`,
      );
    }
  }

  if (manifestPath) {
    const manifest: ManifestEntry[] = jobs.map((j) => ({
      tenantId: j.target.tenantId,
      courseSlug: j.target.courseSlug,
      lessonId: j.target.lessonId,
      kind: j.target.kind,
      ...(j.target.os ? { os: j.target.os } : {}),
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
