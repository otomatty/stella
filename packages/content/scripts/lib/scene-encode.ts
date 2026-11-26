import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Page } from "playwright";
import { escapeHtml, type ScenePageWindow } from "./scene-html.js";

// 字幕の位置・文字・帯は apps/web の VideoViewer.tsx / VideoViewer.css と同じ値にそろえる。
const CAPTION_CSS = `
html, body { margin: 0; background: transparent; }
.caption {
  position: absolute;
  inset: auto 6% 2.6%;
  font: 700 1.95vw/1.45 "Noto Sans JP", sans-serif;
  text-align: center;
  white-space: pre-line;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.caption span {
  color: #fff;
  background-color: rgba(0, 0, 0, 0.8);
  padding: 0 0.4em;
  border-radius: 0.2em;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
  text-shadow: none;
}
`;

/** このビルドの WebVTT を、ミリ秒単位の透明な字幕トラックにする。 */
export async function renderCaptionTrack(page: Page, vtt: string, work: string): Promise<string> {
  const fontFile = createRequire(import.meta.url).resolve("@fontsource/noto-sans-jp/700.css");
  const fontCss = readFileSync(fontFile, "utf8").replace(
    /url\(\.\/(.+?)\)/g,
    (_, path: string) => `url(${pathToFileURL(join(dirname(fontFile), path)).href})`,
  );
  const html = join(work, "caption.html");
  const capture = async (file: string, cue = "") => {
    const onDark = cue.startsWith("<c.on-dark>");
    const text = (onDark ? cue.slice("<c.on-dark>".length, -"</c>".length) : cue)
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
    writeFileSync(
      html,
      `<!doctype html><html lang="ja"><meta charset="utf-8"><style>${fontCss}${CAPTION_CSS}</style><div class="caption">${text ? `<span>${escapeHtml(text)}</span>` : ""}</div></html>`,
    );
    await page.goto(pathToFileURL(html).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.screenshot({ path: join(work, file), omitBackground: true });
  };
  const blank = "caption-blank.png";
  await capture(blank);
  const frames: { file: string; ms: number }[] = [];
  const milliseconds = (time: string) => {
    const [hours, minutes, seconds, ms] = time.split(/[:.]/).map(Number);
    return ((hours * 60 + minutes) * 60 + seconds) * 1000 + ms;
  };
  let end = 0;
  for (const [index, block] of vtt.trimEnd().split("\n\n").slice(1).entries()) {
    const [, time, ...lines] = block.split("\n");
    const [start, stop] = time.split(" --> ").map(milliseconds);
    if (start >= stop) continue;
    if (start > end) frames.push({ file: blank, ms: end });
    const file = `caption-${index}.png`;
    await capture(file, lines.join("\n"));
    frames.push({ file, ms: start });
    end = stop;
  }
  // 最後の透明フレームは、元の動画が終わるまで overlay が保持する。
  frames.push({ file: blank, ms: end });
  const list = join(work, "captions.ffconcat");
  writeFileSync(
    list,
    [
      "ffconcat version 1.0",
      ...frames.map(({ file, ms }, index) => {
        const next = frames[index + 1];
        const entry = `file '${file}'\noption framerate 1000`;
        return next ? `${entry}\nduration ${((next.ms - ms) / 1000).toFixed(3)}` : entry;
      }),
    ].join("\n"),
  );
  return list;
}

export function runFfmpeg(args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "ffmpeg",
      ["-hide_banner", "-loglevel", "error", "-nostdin", "-y", ...args],
      {
        cwd,
        stdio: ["ignore", "ignore", "pipe"],
      },
    );
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr = (stderr + String(d)).slice(-4000);
    });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg: ${stderr}`))));
  });
}
/**
 * 動きのない区間は1枚のJPEGを長く表示する。concat demuxerの入力時刻を30fpsに揃え、
 * CFRへの変換で静止区間のフレームを補う。全フレームを撮影・保存・デコードしない。
 */
export async function encodeScene(
  page: Page,
  duration: number,
  audio: string,
  out: string,
  fadeOut?: FadeOut,
): Promise<number> {
  const ranges = await page.evaluate(() => (window as unknown as ScenePageWindow).__busyRanges);
  const work = mkdtempSync(join(dirname(out), "frames-"));
  const entries: SceneFrames = [];
  let wasBusy = true,
    screenshots = 0;
  try {
    for (let frame = 0; frame < Math.round(duration * 30); frame++) {
      const time = frame / 30,
        busy = ranges.some(([a, b]) => time >= a && time <= b);
      if (!entries.length || busy || wasBusy) {
        await page.evaluate((t) => (window as unknown as ScenePageWindow).__setTime(t), time);
        const file = join(work, `frame-${screenshots++}.jpg`);
        await page.screenshot({ path: file, type: "jpeg", quality: 90 });
        entries.push({ file, frames: 1 });
      } else entries[entries.length - 1].frames++;
      wasBusy = busy;
    }
    await encodeSceneFrames(entries, work, duration, audio, out, fadeOut);
    return screenshots;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

export type SceneFrames = { file: string; frames: number }[];
type FadeOut = { start: number; duration: number };

export async function encodeSceneFrames(
  entries: SceneFrames,
  work: string,
  duration: number,
  audio: string,
  out: string,
  fadeOut?: FadeOut,
): Promise<void> {
  const quoted = (file: string) => `file '${file.replace(/'/g, "'\\''")}'\noption framerate 30`;
  const list = join(work, "frames.txt");
  writeFileSync(
    list,
    [
      "ffconcat version 1.0",
      ...entries.map((e) => `${quoted(e.file)}\nduration ${(e.frames / 30).toFixed(9)}`),
      quoted(entries[entries.length - 1].file),
    ].join("\n"),
  );
  await runFfmpeg(sceneFfmpegArgs(list, duration, audio, out, fadeOut));
}

export function sceneFfmpegArgs(
  list: string,
  duration: number,
  audio: string,
  out: string,
  fadeOut?: FadeOut,
): string[] {
  return [
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    "-i",
    audio,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-vf",
    fadeOut
      ? `fps=30,fade=t=out:st=${fadeOut.start}:d=${fadeOut.duration}:color=0xffffff`
      : "fps=30",
    "-frames:v",
    String(Math.round(duration * 30)),
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    ...(fadeOut
      ? [
          "-af",
          `afade=t=out:st=${fadeOut.start}:d=${fadeOut.duration}`,
          "-c:a",
          "aac",
          "-b:a",
          "128k",
        ]
      : ["-c:a", "copy"]),
    "-t",
    String(duration),
    "-r",
    "30",
    "-video_track_timescale",
    "15360",
    "-movflags",
    "+faststart",
    out,
  ];
}
