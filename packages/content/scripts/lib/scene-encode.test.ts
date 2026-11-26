import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "playwright";
import { expect, it, vi } from "vitest";
import { AUDIO_RATE, decodePcm, probeDuration, writeNarrationWav } from "./ffmpeg.js";
import { encodeScene, renderCaptionTrack, runFfmpeg, sceneFfmpegArgs } from "./scene-encode.js";

it("字幕の HTML を描き、cue の境界と空白をミリ秒単位で並べる", async () => {
  const root = mkdtempSync(join(tmpdir(), "stella-captions-"));
  try {
    const html: string[] = [];
    const page = {
      goto: vi.fn(async (url: string) => html.push(readFileSync(new URL(url), "utf8"))),
      evaluate: vi.fn(),
      screenshot: vi.fn(),
    };
    const list = await renderCaptionTrack(
      page as unknown as Page,
      `WEBVTT

1
00:00:01.025 --> 00:00:02.150
&lt;script&gt;&amp;lt;"一行目"
二行目

2
00:00:02.150 --> 00:00:03.250
<c.on-dark>暗い場面</c>

3
00:00:04.010 --> 00:00:05.015
次の文
`,
      root,
    );
    expect(html[0]).toContain('<div class="caption"></div>');
    expect(html[1]).toContain(
      '<div class="caption">&lt;script&gt;&amp;lt;&quot;一行目&quot;\n二行目</div>',
    );
    expect(html[1]).toContain("font-weight: 700");
    expect(html[1]).toMatch(/url\(file:[^)]*-700-normal\.woff2\)/);
    expect(html[1]).toContain("font: 700 1.95vw/1.45");
    expect(html[1]).toContain("inset: auto 6% 2.6%");
    expect(html[1]).toContain("-webkit-line-clamp: 2");
    expect(html[1]).toContain("white-space: pre-line");
    expect(html[1]).toContain("color: #0E0E10");
    expect(html[1]).toContain(
      "text-shadow: 0 0 .1em #FFFFFF, 0 0 .22em #FFFFFF, 0 0 .5em rgba(255,255,255,.9), 0 0 .9em rgba(255,255,255,.6)",
    );
    expect(html[2]).toContain('<div class="caption on-dark">暗い場面</div>');
    expect(html[2]).toContain(
      ".caption.on-dark {\n  color: #FFFFFF;\n  text-shadow: 0 .05em .1em rgba(0,0,0,.8), 0 0 .26em rgba(0,0,0,.65), 0 0 .6em rgba(0,0,0,.4)",
    );
    expect(page.evaluate).toHaveBeenCalledTimes(4);
    expect(page.screenshot.mock.calls).toEqual(
      ["caption-blank.png", "caption-0.png", "caption-1.png", "caption-2.png"].map((file) => [
        { path: join(root, file), omitBackground: true },
      ]),
    );
    expect(readFileSync(list, "utf8")).toBe(`ffconcat version 1.0
file 'caption-blank.png'
option framerate 1000
duration 1.025
file 'caption-0.png'
option framerate 1000
duration 1.125
file 'caption-1.png'
option framerate 1000
duration 1.100
file 'caption-blank.png'
option framerate 1000
duration 0.760
file 'caption-2.png'
option framerate 1000
duration 1.005
file 'caption-blank.png'
option framerate 1000`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
it.skipIf(!hasFfmpeg)(
  "最後の24フレームで映像を背景色へ、音声を0へフェードする",
  async () => {
    const root = mkdtempSync(join(tmpdir(), "stella-ending-"));
    try {
      const image = join(root, "still.jpg");
      await runFfmpeg([
        "-f",
        "lavfi",
        "-i",
        "color=black:s=64x64",
        "-frames:v",
        "1",
        "-threads",
        "1",
        image,
      ]);
      const audio = join(root, "audio.wav");
      const pcm = Int16Array.from({ length: AUDIO_RATE * 2 }, (_, i) =>
        Math.round(10000 * Math.sin((2 * Math.PI * 440 * i) / AUDIO_RATE)),
      );
      writeNarrationWav(audio, 2, [{ startSec: 0, pcm }]);
      // Chromiumを使わず、静止した場面を供給して実際のエンコーダーを検査する。
      const page = {
        evaluate: async () => [],
        screenshot: async ({ path }: { path: string }) => copyFileSync(image, path),
      } as unknown as Page;
      const out = join(root, "ending.mp4");
      await encodeScene(page, 2, audio, out, { start: 1.2, duration: 0.8 });
      expect(await probeDuration(out)).toBeCloseTo(2, 1);
      const pixel = (time: number) => {
        const result = spawnSync("ffmpeg", [
          "-v",
          "error",
          "-ss",
          String(time),
          "-i",
          out,
          "-frames:v",
          "1",
          "-vf",
          "scale=1:1",
          "-f",
          "rawvideo",
          "-pix_fmt",
          "rgb24",
          "pipe:1",
        ]);
        expect(result.status).toBe(0);
        return [...result.stdout];
      };
      expect(pixel(1.1).every((channel) => channel < 5)).toBe(true);
      expect(pixel(1.6).every((channel) => channel > 110 && channel < 140)).toBe(true);
      expect(pixel(1.96).every((channel) => channel > 230 && channel < 252)).toBe(true);
      const decoded = await decodePcm(out);
      const rms = (start: number, end: number) => {
        const samples = decoded.subarray(start * AUDIO_RATE, end * AUDIO_RATE);
        return Math.sqrt(samples.reduce((sum, value) => sum + value ** 2, 0) / samples.length);
      };
      expect(rms(1, 1.1)).toBeGreaterThan(6500);
      expect(rms(1.57, 1.63) / rms(1, 1.1)).toBeCloseTo(0.5, 1);
      expect(rms(1.96, 2) / rms(1, 1.1)).toBeLessThan(0.06);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
  30_000,
);

it("HTML の場面と共通の書き出しで従来の ffmpeg 引数を使う", () => {
  const args = [
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    "frames.txt",
    "-i",
    "audio.m4a",
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-vf",
    "fps=30",
    "-frames:v",
    "90",
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
    "3",
    "-r",
    "30",
    "-video_track_timescale",
    "15360",
    "-movflags",
    "+faststart",
    "clip.mp4",
  ];
  expect(sceneFfmpegArgs("frames.txt", 3, "audio.m4a", "clip.mp4")).toEqual(args);
  const fading = [...args];
  fading[fading.indexOf("fps=30")] = "fps=30,fade=t=out:st=2.2:d=0.8:color=0xffffff";
  fading.splice(
    fading.indexOf("-c:a"),
    2,
    "-af",
    "afade=t=out:st=2.2:d=0.8",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
  );
  expect(
    sceneFfmpegArgs("frames.txt", 3, "audio.m4a", "clip.mp4", { start: 2.2, duration: 0.8 }),
  ).toEqual(fading);
});
