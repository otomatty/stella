import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Page } from "playwright";
import type { ScenePageWindow } from "./scene-html.js";

export function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "ffmpeg",
      ["-hide_banner", "-loglevel", "error", "-nostdin", "-y", ...args],
      {
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
): Promise<number> {
  const ranges = await page.evaluate(() => (window as unknown as ScenePageWindow).__busyRanges);
  const work = mkdtempSync(join(dirname(out), "frames-"));
  const entries: { file: string; frames: number }[] = [];
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
    await runFfmpeg([
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
      "fps=30",
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
      "-c:a",
      "copy",
      "-t",
      String(duration),
      "-r",
      "30",
      "-video_track_timescale",
      "15360",
      "-movflags",
      "+faststart",
      out,
    ]);
    return screenshots;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
