import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "playwright";
import { expect, it } from "vitest";
import { AUDIO_RATE, decodePcm, probeDuration, writeNarrationWav } from "./ffmpeg.js";
import { encodeScene, runFfmpeg } from "./scene-encode.js";

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
