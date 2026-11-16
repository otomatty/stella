import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { synthesizeSceneSfx, type SceneSfxCue } from "../../src/scene-sfx.js";
import {
  AUDIO_RATE,
  decodePcm,
  encodeNarration,
  measureLoudness,
  writeNarrationWav,
} from "./ffmpeg.js";

const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
function rmsDb(pcm: Int16Array, start: number, end: number): number {
  const samples = pcm.subarray(Math.round(start * AUDIO_RATE), Math.round(end * AUDIO_RATE));
  const meanSquare = samples.reduce((sum, value) => sum + (value / 32768) ** 2, 0) / samples.length;
  return 10 * Math.log10(meanSquare);
}

it.skipIf(!hasFfmpeg)(
  "AACでも効果音の区間だけ音量が上がり、声の元音量によらず約-24dBFS、全体は-16LUFSを保つ",
  async () => {
    const root = mkdtempSync(join(tmpdir(), "stella-sfx-audio-"));
    try {
      const cues: SceneSfxCue[] = [
        { kind: "title", at: 0.1 },
        { kind: "switch", at: 1.8 },
        { kind: "summary", at: 2.5 },
      ];
      const sfxWav = join(root, "sfx.wav");
      writeNarrationWav(
        sfxWav,
        12,
        // 7秒では読み上げと重ね、全体のラウドネスとピークも検査する。
        [...cues, { kind: "switch" as const, at: 7 }].map((cue) => ({
          startSec: cue.at,
          pcm: synthesizeSceneSfx(cue.kind, AUDIO_RATE),
        })),
      );
      const levels: number[][] = [];
      for (const amplitude of [0.08, 0.3]) {
        // TTSや録音素材を使わず、強弱のある複数の倍音で読み上げ相当の検査信号を作る。
        const voice = Int16Array.from({ length: 8 * AUDIO_RATE }, (_, i) => {
          const t = i / AUDIO_RATE;
          const envelope =
            Math.min(1, t / 0.02, (8 - t) / 0.02) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 3 * t));
          return Math.round(
            32767 *
              amplitude *
              envelope *
              (Math.sin(2 * Math.PI * 180 * t) + 0.3 * Math.sin(2 * Math.PI * 360 * t)),
          );
        });
        const wav = join(root, `voice-${amplitude}.wav`);
        const baseline = join(root, `noise-${amplitude}.m4a`);
        const mixed = join(root, `sfx-${amplitude}.m4a`);
        writeNarrationWav(wav, 12, [{ startSec: 4, pcm: voice }]);
        await encodeNarration(wav, baseline, { preventSilence: true });
        await encodeNarration(wav, mixed, { preventSilence: true, sfxWav });
        const before = await decodePcm(baseline);
        const after = await decodePcm(mixed);
        const cueLevels = cues.map((cue) => {
          const start = cue.at + 0.03,
            end = cue.at + 0.14;
          const level = rmsDb(after, start, end);
          expect(level - rmsDb(before, start, end)).toBeGreaterThan(20);
          const peak = after
            .subarray(Math.round(cue.at * AUDIO_RATE), Math.round((cue.at + 0.25) * AUDIO_RATE))
            .reduce((max, value) => Math.max(max, Math.abs(value)), 0);
          expect(20 * Math.log10(peak / 32768)).toBeGreaterThan(-25.5);
          expect(20 * Math.log10(peak / 32768)).toBeLessThan(-22.5);
          return level;
        });
        levels.push(cueLevels);
        expect(Math.abs(rmsDb(after, 3.7, 3.9) - rmsDb(before, 3.7, 3.9))).toBeLessThan(1);
        expect(rmsDb(after, 3.7, 3.9)).toBeGreaterThan(-65);
        expect(rmsDb(after, 3.7, 3.9)).toBeLessThan(-55);
        expect(Math.abs(rmsDb(after, 5, 6) - rmsDb(before, 5, 6))).toBeLessThan(0.1);
        const loudness = await measureLoudness(mixed);
        expect(loudness.integratedLufs).toBeGreaterThan(-17);
        expect(loudness.integratedLufs).toBeLessThan(-15);
        expect(loudness.truePeakDb).toBeLessThan(-1.5);
        expect(after.length / AUDIO_RATE).toBeCloseTo(12, 1);
      }
      for (let i = 0; i < cues.length; i++)
        expect(Math.abs(levels[0][i] - levels[1][i])).toBeLessThan(0.1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
  30_000,
);
