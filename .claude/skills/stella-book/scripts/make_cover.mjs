#!/usr/bin/env node
/**
 * 表紙の画像が無い本のために、題名と著者から仮の表紙 (1200×1680 の JPEG) を作る。
 *
 *   node make_cover.mjs --title "題名" [--author "著者"] [--note "本文・朗読・解説動画"] \
 *     --out <book_dir>/cover.jpg --work <作業フォルダー> [--node-modules <node_modules>]
 *
 * HyperFrames の静止画 (snapshot) で描き、ffmpeg で JPEG にする。動画と同じフォントと色を使う。
 * 本物の表紙 (利用者の写真・出版社の画像) があれば、そちらを cover.jpg / .png / .webp として使う。
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith("--"))
      pairs.push([arg.slice(2), all[i + 1]?.startsWith("--") ? true : (all[i + 1] ?? true)]);
    return pairs;
  }, []),
);
if (!args.title || !args.out || !args.work) {
  console.error(
    'usage: make_cover.mjs --title "題名" [--author "著者"] --out cover.jpg --work <dir>',
  );
  process.exit(2);
}
const nodeModules = resolve(
  args["node-modules"] ?? process.env.STELLA_BOOK_NODE_MODULES ?? join(here, "node_modules"),
);
const work = resolve(args.work, "cover");
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

rmSync(work, { recursive: true, force: true });
mkdirSync(join(work, "fonts"), { recursive: true });
const fontDir = join(nodeModules, "@fontsource/noto-sans-jp");
let fontCss = "";
for (const weight of [400, 700]) {
  fontCss += readFileSync(join(fontDir, `${weight}.css`), "utf8")
    .replaceAll("./files/", "./fonts/")
    .replace(/,\s*url\([^)]+\.woff\)\s*format\(['"]woff['"]\)/g, "");
  for (const file of readdirSync(join(fontDir, "files")))
    if (file.endsWith(`-${weight}-normal.woff2`))
      copyFileSync(join(fontDir, "files", file), join(work, "fonts", file));
}
writeFileSync(join(work, "fonts.css"), fontCss);
copyFileSync(join(nodeModules, "gsap/dist/gsap.min.js"), join(work, "gsap.min.js"));

const length = [...String(args.title)].length;
const size = length <= 10 ? 112 : length <= 16 ? 98 : length <= 26 ? 84 : 70;
writeFileSync(
  join(work, "index.html"),
  `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <link rel="stylesheet" href="./fonts.css" />
    <script src="./gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1200px; height: 1680px; overflow: hidden; background: #f4f1ea; }
      #root { position: relative; width: 1200px; height: 1680px; font-family: "Noto Sans JP", sans-serif; color: #1c2430; }
      .cover {
        position: absolute; inset: 60px; border-radius: 36px; background: #fff; padding: 120px 100px;
        box-shadow: 0 18px 50px rgba(28, 36, 48, 0.1); display: flex; flex-direction: column;
      }
      .band { height: 16px; width: 220px; background: #3a55d6; border-radius: 8px; margin-bottom: 80px; }
      h1 { font-size: ${size}px; line-height: 1.3; font-weight: 700; text-wrap: balance; }
      h1 span { white-space: nowrap; }
      .author { margin-top: 48px; font-size: 44px; color: #5b6573; }
      .note { margin-top: auto; font-size: 36px; color: #5b6573; }
      .dots { display: flex; gap: 22px; margin-top: 40px; }
      .dots span { width: 44px; height: 44px; border-radius: 50%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="cover" data-start="0" data-duration="1" data-width="1200" data-height="1680">
      <div class="cover clip" data-start="0" data-duration="1">
        <div class="band"></div>
        <h1>${esc(args.title)}</h1>
        ${args.author ? `<p class="author">${esc(args.author)}</p>` : ""}
        <p class="note">${esc(args.note ?? "")}</p>
        <div class="dots"><span style="background:#0e7c74"></span><span style="background:#cf5a1f"></span><span style="background:#3a55d6"></span></div>
      </div>
    </div>
    <script>
      // 語の途中で折り返さないよう語ごとにまとめ、いちばん長い語が収まるまで文字を小さくする。
      const h1 = document.querySelector("h1");
      const words = [...new Intl.Segmenter("ja", { granularity: "word" }).segment(h1.textContent)].map((s) => s.segment);
      h1.textContent = "";
      for (const word of words) {
        const span = document.createElement("span");
        span.textContent = word;
        h1.append(span);
      }
      let px = ${size};
      const tooWide = () => [...h1.children].some((span) => span.getBoundingClientRect().width > h1.clientWidth);
      while (tooWide() && px > 48) h1.style.fontSize = \`\${(px -= 4)}px\`;
      const tl = gsap.timeline({ paused: true });
      window.__timelines["cover"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`,
);

const shots = join(work, "shots");
execFileSync(
  join(nodeModules, ".bin/hyperframes"),
  ["snapshot", work, "--at", "0.5", "--no-end", "-o", shots],
  {
    stdio: ["ignore", "ignore", "inherit"],
    env: { ...process.env, HYPERFRAMES_SKIP_SKILLS: "1" },
  },
);
const png = readdirSync(shots).find((name) => name.endsWith(".png"));
if (!png) throw new Error("表紙の静止画を作れませんでした");
mkdirSync(dirname(resolve(args.out)), { recursive: true });
execFileSync("ffmpeg", [
  "-v",
  "error",
  "-y",
  "-i",
  join(shots, png),
  "-q:v",
  "3",
  resolve(args.out),
]);
console.log(JSON.stringify({ cover: resolve(args.out) }));
