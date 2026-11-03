#!/usr/bin/env node
/**
 * 絵コンテ (storyboard.json) とセリフごとの音声の長さ (timings.json) から、
 * HyperFrames の動画プロジェクト (index.html と素材) を書き出す。
 *
 *   node build_video.mjs --storyboard storyboard.json --audio work/audio --out work/video
 *   node build_video.mjs --storyboard storyboard.json --layout-only --out work/layout   # 画面の確認だけ (音声なし・長さは推定)
 *
 * --node-modules (または環境変数 STELLA_BOOK_NODE_MODULES) に、package.json の依存 (gsap・
 * @fontsource/noto-sans-jp) を入れた node_modules を指す。synth_lines.py --mock の音 (試験用) は、
 * --allow-mock を付けたときだけ使う。
 *
 * 画面 (1920×1080): 上に章・節の名前と節の進み、中央に図解ボード (セリフに合わせて項目が現れる)、
 * 下に話者のアイコン (話している方が光る) と、台本の文をそのまま出す字幕。
 * 書き出しは `npx hyperframes render <out> -o chapter.mp4`。
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
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
if (!args.storyboard || !args.out) {
  console.error(
    "usage: build_video.mjs --storyboard storyboard.json (--audio dir | --layout-only) --out dir",
  );
  process.exit(2);
}
const layoutOnly = args["layout-only"] === true;
const storyboard = JSON.parse(readFileSync(args.storyboard, "utf8"));
const out = resolve(args.out);
const nodeModules = resolve(
  args["node-modules"] ?? process.env.STELLA_BOOK_NODE_MODULES ?? join(here, "node_modules"),
);

// ---------------------------------------------------------------- 時間
const LEAD = 0.9; // 場面の始まりから最初のセリフまで (ボードの見出しが出る)
const TAIL = 1.1; // 最後のセリフから次の場面まで
const GAP_SAME = 0.25; // 同じ話者が続くときの間
const GAP_SWITCH = 0.45; // 話者が替わるときの間
const CJK = /[぀-ヿ㐀-鿿]/g;

function estimate(text) {
  const cjk = (text.match(CJK) ?? []).length;
  return (cjk / 7.5 + (text.length - cjk) / 15) * 1.35; // 推定 (実際は TTS の長さを使う)
}

let durations = new Map();
if (!layoutOnly) {
  if (!args.audio) throw new Error("--audio (synth_lines.py の出力) か --layout-only が必要です");
  const timings = JSON.parse(readFileSync(join(args.audio, "timings.json"), "utf8"));
  if (timings.mock && args["allow-mock"] !== true)
    throw new Error(
      "timings.json は試験用の音 (--mock) です。本番の動画には synth_lines.py を --mock なしで実行してください",
    );
  durations = new Map(timings.lines.map((line) => [`${line.scene}/${line.index}`, line]));
}

const speakerNames = Object.keys(storyboard.speakers);
let t = 0;
let lineNo = 0;
const scenes = storyboard.scenes.map((scene, sceneIndex) => {
  const start = t;
  t += LEAD;
  const lines = scene.lines.map((line, index) => {
    const timing = durations.get(`${scene.id}/${index}`);
    if (!layoutOnly && !timing) throw new Error(`音声がありません: ${scene.id} ${index + 1} 行目`);
    const seconds = timing ? timing.seconds : estimate(line.text);
    const next = scene.lines[index + 1];
    const item = {
      ...line,
      no: ++lineNo,
      start: round(t),
      seconds: round(seconds),
      file: timing?.file,
      speakerIndex: speakerNames.indexOf(line.speaker),
      show: line.show === undefined ? [] : [line.show].flat(),
    };
    t += seconds + (next ? (next.speaker === line.speaker ? GAP_SAME : GAP_SWITCH) : 0);
    return item;
  });
  t += TAIL;
  return { ...scene, index: sceneIndex, start: round(start), end: round(t), lines };
});
const total = round(t);

function round(value) {
  return Math.round(value * 1000) / 1000;
}

// ---------------------------------------------------------------- 画面
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const ring = '<span class="ring"></span>';

function boardHtml(scene) {
  const b = scene.board;
  const id = scene.id;
  const heading =
    b.title && b.type !== "title"
      ? `<h2 class="board-title">${esc(b.title)}</h2><div class="hero"><span>${esc(b.title)}</span></div>`
      : "";
  const body = (html) => `<div class="board-body">${html}</div>`;
  switch (b.type) {
    case "title":
      return `<div class="board board-cover">
        <p class="cover-kicker">${esc(b.kicker ?? storyboard.book)}</p>
        <h1 class="cover-title">${esc(b.title)}</h1>
        <ul class="cover-items">${b.items.map((text, i) => `<li class="item" data-scene="${id}" data-item="${i}">${ring}${esc(text)}</li>`).join("")}</ul>
      </div>`;
    case "cards":
      return `<div class="board">${heading}${body(
        `<div class="cards cards-${b.items.length}">${b.items
          .map(
            (
              card,
              i,
            ) => `<div class="card item" data-scene="${id}" data-item="${i}">${ring}<span class="card-no">${i + 1}</span>
          <h3>${esc(card.head)}</h3>${card.body ? `<p>${esc(card.body)}</p>` : ""}</div>`,
          )
          .join("")}</div>`,
      )}</div>`;
    case "compare": {
      const cols = b.columns.length;
      const head = `<div class="cell corner"></div>${b.columns
        .map(
          (col, i) =>
            `<div class="cell col-head item" data-scene="${id}" data-item="${i}">${ring}${esc(col)}</div>`,
        )
        .join("")}`;
      const rows = b.rows
        .map(
          (row) =>
            `<div class="cell row-label">${esc(row.label)}</div>${row.cells
              .map(
                (cell, i) =>
                  `<div class="cell item" data-scene="${id}" data-item="${i}">${ring}${esc(cell)}</div>`,
              )
              .join("")}`,
        )
        .join("");
      return `<div class="board">${heading}${body(`<div class="compare" style="grid-template-columns: 210px repeat(${cols}, 1fr)">${head}${rows}</div>`)}</div>`;
    }
    case "flow": {
      const down = b.direction === "down";
      const steps = b.items
        .map(
          (step, i) =>
            `${i ? `<div class="arrow" data-scene="${id}" data-arrow="${i}">${down ? "↓" : "→"}</div>` : ""}<div class="step item" data-scene="${id}" data-item="${i}">${ring}<strong>${esc(step.label)}</strong>${step.note ? `<span>${esc(step.note)}</span>` : ""}</div>`,
        )
        .join("");
      return `<div class="board">${heading}${body(`<div class="flow ${down ? "flow-down" : "flow-right"}">${steps}</div>${b.note ? `<p class="flow-note">${esc(b.note)}</p>` : ""}`)}</div>`;
    }
    case "quote":
      return `<div class="board board-quote"><blockquote>${esc(b.quote)}<cite>— ${esc(b.by)}</cite></blockquote>
        <ol class="story">${b.items.map((text, i) => `<li class="item" data-scene="${id}" data-item="${i}">${ring}<span class="story-no">${i + 1}</span>${esc(text)}</li>`).join("")}</ol></div>`;
    case "summary":
      return `<div class="board">${heading}${body(
        `<ol class="summary">${b.items
          .map(
            (text, i) =>
              `<li class="item" data-scene="${id}" data-item="${i}">${ring}<span class="check">✓</span>${esc(text)}</li>`,
          )
          .join("")}</ol>`,
      )}</div>`;
    default:
      throw new Error(`知らないボードの種類: ${b.type}`);
  }
}

const sceneHtml = scenes
  .map(
    (scene) => `
    <section class="clip scene" id="scene-${scene.id}" data-start="${scene.start}" data-duration="${round(scene.end - scene.start)}" data-track-index="1">
      <div class="section-label">${esc(scene.section ?? "")}</div>
      ${boardHtml(scene)}
    </section>`,
  )
  .join("");

const allLines = scenes.flatMap((scene) => scene.lines);
const subtitleHtml = allLines
  .map((line, i) => {
    const next = allLines[i + 1];
    const until = next
      ? Math.min(next.start, line.start + line.seconds + 0.6)
      : line.start + line.seconds + 0.6;
    return `
    <div class="clip subtitle" id="sub-${line.no}" data-start="${line.start}" data-duration="${round(until - line.start)}" data-track-index="2">
      <span class="who who-${line.speakerIndex}">${esc(line.speaker)}</span><p>${esc(line.text)}</p>
    </div>`;
  })
  .join("");

const audioHtml = layoutOnly
  ? ""
  : allLines
      .map(
        (line) =>
          `<audio class="clip" id="voice-${line.no}" src="audio/${line.file}" data-start="${line.start}" data-duration="${line.seconds}" data-track-index="3"></audio>`,
      )
      .join("\n    ");

const avatars = speakerNames
  .map(
    (name, i) =>
      `<div class="avatar avatar-${i}" id="avatar-${i}"><span class="glow"></span><span class="face">${esc(name.slice(0, 1))}</span><span class="name">${esc(name)}</span></div>`,
  )
  .join("");

// ---------------------------------------------------------------- 動き (GSAP)
const steps = [];
for (const scene of scenes) {
  const i = scene.index;
  steps.push(
    `tl.fromTo("#scene-${scene.id}", { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.out" }, ${scene.start});`,
  );
  steps.push(
    `tl.to("#scene-${scene.id}", { opacity: 0, duration: 0.4, ease: "power1.in" }, ${round(scene.end - 0.4)});`,
  );
  steps.push(
    `tl.to("#progress-fill", { scaleX: ${round((i + 1) / scenes.length)}, duration: 0.6, ease: "power2.out" }, ${scene.start});`,
  );
  let focused = null;
  const shown = new Set();
  const firstShow = scene.lines.find((line) => line.show.length);
  if (firstShow && scene.board.type !== "title" && scene.board.type !== "quote") {
    steps.push(
      `tl.to("#scene-${scene.id} .hero", { opacity: 0, y: -24, duration: 0.35, ease: "power1.in" }, ${firstShow.start});`,
    );
    steps.push(
      `tl.fromTo("#scene-${scene.id} .board-title", { opacity: 0 }, { opacity: 1, duration: 0.4 }, ${firstShow.start});`,
    );
    if (scene.board.type === "compare")
      steps.push(
        `tl.fromTo("#scene-${scene.id} .row-label", { opacity: 0 }, { opacity: 1, duration: 0.4 }, ${firstShow.start});`,
      );
  }
  for (const line of scene.lines) {
    for (const n of line.show) {
      const sel = `[data-scene='${scene.id}'][data-item='${n}']`;
      steps.push(
        `tl.fromTo(q("${sel}"), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, ${line.start});`,
      );
      shown.add(n);
      for (const arrow of [n, n + 1])
        if (arrow > 0 && shown.has(arrow - 1) && shown.has(arrow))
          steps.push(
            `tl.fromTo(q("[data-scene='${scene.id}'][data-arrow='${arrow}']"), { opacity: 0 }, { opacity: 1, duration: 0.4 }, ${line.start});`,
          );
    }
    if (line.show.length) {
      const last = line.show[line.show.length - 1];
      if (focused !== null && focused !== last)
        steps.push(
          `tl.to(q("[data-scene='${scene.id}'][data-item='${focused}'] > .ring"), { opacity: 0, duration: 0.3 }, ${line.start});`,
        );
      steps.push(
        `tl.to(q("[data-scene='${scene.id}'][data-item='${last}'] > .ring"), { opacity: 1, duration: 0.3 }, ${line.start});`,
      );
      focused = last;
    }
  }
}
for (const line of allLines) {
  const other = 1 - line.speakerIndex;
  steps.push(
    `tl.fromTo("#sub-${line.no}", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.18 }, ${line.start});`,
  );
  steps.push(
    `tl.to("#avatar-${line.speakerIndex}", { opacity: 1, scale: 1.06, duration: 0.25 }, ${line.start});`,
  );
  steps.push(
    `tl.to("#avatar-${line.speakerIndex} .glow", { opacity: 1, duration: 0.25 }, ${line.start});`,
  );
  steps.push(
    `tl.to("#avatar-${other}", { opacity: 0.42, scale: 1, duration: 0.25 }, ${line.start});`,
  );
  steps.push(`tl.to("#avatar-${other} .glow", { opacity: 0, duration: 0.25 }, ${line.start});`);
}

// ---------------------------------------------------------------- 書き出し
mkdirSync(join(out, "vendor"), { recursive: true });
mkdirSync(join(out, "fonts"), { recursive: true });
copyFileSync(join(nodeModules, "gsap/dist/gsap.min.js"), join(out, "vendor/gsap.min.js"));
const fontDir = join(nodeModules, "@fontsource/noto-sans-jp");
let fontCss = "";
for (const weight of [400, 500, 700]) {
  fontCss += readFileSync(join(fontDir, `${weight}.css`), "utf8")
    .replaceAll("./files/", "./fonts/")
    .replace(/,\s*url\([^)]+\.woff\)\s*format\(['"]woff['"]\)/g, ""); // woff2 だけを使う
  for (const file of readdirSync(join(fontDir, "files")))
    if (file.endsWith(`-${weight}-normal.woff2`))
      copyFileSync(join(fontDir, "files", file), join(out, "fonts", file));
}
writeFileSync(join(out, "fonts.css"), fontCss);
if (!layoutOnly) {
  mkdirSync(join(out, "audio"), { recursive: true });
  for (const line of allLines)
    copyFileSync(join(args.audio, line.file), join(out, "audio", line.file));
}

const css = readFileSync(join(here, "video.css"), "utf8");
const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <link rel="stylesheet" href="./fonts.css" />
    <script src="./vendor/gsap.min.js"></script>
    <style>
${css}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1920" data-height="1080">
      <div class="progress"><div class="progress-fill" id="progress-fill"></div></div>
      <header class="head"><span class="book">${esc(storyboard.book)}</span><span class="chapter">${esc(`${storyboard.chapter.label} ${storyboard.chapter.title}`)}</span></header>
      ${sceneHtml}
      <div class="speakers">${avatars}</div>
      ${subtitleHtml}
    ${audioHtml}
    </div>
    <script>
      const q = (selector) => document.querySelectorAll(selector);
      const tl = gsap.timeline({ paused: true });
      gsap.set(".ring", { opacity: 0 });
      gsap.set("#progress-fill", { scaleX: 0, transformOrigin: "left center" });
      gsap.set(".avatar", { opacity: 0.42 });
      gsap.set(".glow", { opacity: 0 });
      gsap.set(".arrow", { opacity: 0 });
      ${steps.join("\n      ")}
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
writeFileSync(join(out, "index.html"), html);
writeFileSync(
  join(out, "timeline.json"),
  JSON.stringify(
    {
      total,
      layoutOnly,
      scenes: scenes.map((s) => ({
        id: s.id,
        section: s.section,
        start: s.start,
        end: s.end,
        lines: s.lines.map((l) => ({ no: l.no, start: l.start, seconds: l.seconds, show: l.show })),
      })),
    },
    null,
    1,
  ),
);
if (!existsSync(join(out, "hyperframes.json")))
  writeFileSync(
    join(out, "hyperframes.json"),
    JSON.stringify({ paths: { assets: "audio" } }, null, 2),
  );
console.log(
  JSON.stringify(
    {
      out,
      scenes: scenes.length,
      lines: allLines.length,
      seconds: total,
      minutes: round(total / 60),
      layoutOnly,
    },
    null,
    2,
  ),
);
