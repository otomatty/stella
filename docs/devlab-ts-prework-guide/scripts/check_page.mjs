// id、リンク、タグ、ハイライトと、400/600/1000px でのはみ出しを検査します。
// 引数を省略すると pages/ の全9ページを調べます。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const files =
  process.argv.length > 2
    ? process.argv.slice(2)
    : Array.from({ length: 9 }, (_, i) =>
        path.join(root, "pages", `guide-${String(i + 1).padStart(2, "0")}.html`),
      );
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "stella-guide-check-"));
let browser;
let failed = false;
const pages = [];
try {
  for (const file of files) {
    const s = fs.readFileSync(file, "utf8");
    const ids = [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const dupIds = [...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))];
    const brokenAnchors = [...new Set([...s.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]))].filter(
      (h) => !ids.includes(h),
    );
    const tagMismatch = [];
    for (const tag of [
      "section",
      "div",
      "details",
      "article",
      "pre",
      "code",
      "figure",
      "table",
      "dl",
      "ol",
      "ul",
      "span",
    ]) {
      const a = (s.match(new RegExp(`<${tag}[\\s>]`, "g")) ?? []).length;
      const b = (s.match(new RegExp(`</${tag}>`, "g")) ?? []).length;
      if (a !== b) tagMismatch.push(`${tag} ${a}/${b}`);
    }
    const result = {
      problems: (s.match(/<section class="q" id=/g) ?? []).length,
      dupIds,
      brokenAnchors,
      tagMismatch,
      unbaked: (s.match(/language-typescript/g) ?? []).length,
      scripts: (s.match(/<script/g) ?? []).length,
      solutionWord: (s.match(/解答例/g) ?? []).length,
    };
    console.log(path.basename(file), JSON.stringify(result));
    if (
      dupIds.length ||
      brokenAnchors.length ||
      tagMismatch.length ||
      result.unbaked ||
      result.scripts ||
      result.solutionWord
    )
      failed = true;
    pages.push({ file, s });
  }
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  });
  for (const { file, s } of pages) {
    const preview = path.join(temporary, `.preview-${path.basename(file)}`);
    fs.writeFileSync(
      preview,
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style></head><body>${s}</body></html>`,
    );
    for (const width of [400, 600, 1000]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: "dark" });
      try {
        await page.goto(pathToFileURL(preview).href);
        await page.waitForTimeout(800);
        const layout = await page.evaluate(() => {
          const cw = document.documentElement.clientWidth;
          const wide = [...document.querySelectorAll("body *")].filter(
            (e) =>
              e.getBoundingClientRect().right > cw + 1 &&
              !e.closest("pre, .scroll, .scroll-t, .chars"),
          );
          return {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: cw,
            overflow: wide
              .slice(0, 8)
              .map((e) => `${e.tagName}.${e.className}#${e.closest("section.q")?.id ?? ""}`),
          };
        });
        console.log(width, JSON.stringify(layout));
        if (layout.overflow.length) failed = true;
      } finally {
        await page.close();
      }
    }
  }
} finally {
  try {
    await browser?.close();
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
if (failed) process.exitCode = 1;
