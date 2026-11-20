import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  mixSceneSfx,
  SCENE_SFX_PEAK_DBFS,
  SCENE_SFX_SECONDS,
  synthesizeSceneSfx,
  type SceneSfxKind,
  type SceneSfxCue,
} from "../../src/scene-sfx.js";
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
        { kind: "title", at: 2.5 },
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

const legacyHashes = {
  24000: {
    switch: "5e3fa8f968d27d6dd4e0ee4464f78434725fd6e2aeffc40582b3eed92857ba74",
    title: "fa9df3817449f32235508fc9c1a907baaea04b7563c9c816601a6abed0c27166",
  },
  48000: {
    switch: "aae3ff07a41d18f5886acb78af11f0f93178d6d2c8a92d4db04fb594398cf814",
    title: "130e33f9fa43a5cc0899c345b8f808a2ccdd949cb310a21aa6a08ad7609972e7",
  },
};
const kinds = Object.keys(SCENE_SFX_SECONDS) as SceneSfxKind[];
const pcmHash = (pcm: Int16Array) =>
  createHash("sha256")
    .update(new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength))
    .digest("hex");

it.each([24000, 48000] as const)("%s Hzの全効果音を検査し、従来のPCMと照合する", (rate) => {
  const hashes = new Set<string>();
  for (const kind of kinds) {
    const pcm = synthesizeSceneSfx(kind, rate);
    const hash = pcmHash(pcm);
    hashes.add(hash);
    expect(pcmHash(synthesizeSceneSfx(kind, rate))).toBe(hash);
    expect(pcm.length).toBe(Math.round(SCENE_SFX_SECONDS[kind] * rate));
    const peak = pcm.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
    const limit = 32768 * 10 ** (SCENE_SFX_PEAK_DBFS / 20);
    expect(peak).toBeGreaterThan(limit - 1);
    if (kind === "title" || kind === "switch") expect(hash).toBe(legacyHashes[rate][kind]);
    else expect(peak).toBeLessThanOrEqual(limit);
    expect(pcm[0]).toBe(0);
    expect(pcm.at(-1)).toBe(0);
  }
  expect(hashes.size).toBe(kinds.length);
});

it.each([
  [
    24000,
    "99d66c83e0e5d03a9396a0d0c3e349ff3eddf747ccf8e94dd125d31cd3c7b610",
    "b1a2eacaa80186eac64b2a80282e5d54f297556125f917e78b5677e52f6b58e1",
  ],
  [
    48000,
    "ccfd07c23fceb5fa78503525cc0c4261a1ad58b6d22d52ba1268cf26b440f8ca",
    "9d7b16abf944cd6b554b792418f2f228a9a4b49380393eea392ac5bdded42cbf",
  ],
] as const)(
  "%s Hzの場面の音は0.45秒の木琴の音で、ほかのPCMは従来どおり",
  (rate, sceneHash, otherHash) => {
    const pcm = synthesizeSceneSfx("scene", rate);
    expect(pcm.length).toBe(Math.round(0.45 * rate));
    expect(pcmHash(pcm)).toBe(sceneHash);
    const other = createHash("sha256");
    for (const kind of kinds) {
      if (kind !== "scene") other.update(new Uint8Array(synthesizeSceneSfx(kind, rate).buffer));
    }
    expect(other.digest("hex")).toBe(otherHash);
  },
);

it.skipIf(!hasFfmpeg)(
  "重なった効果音を加算し、読み上げに混ぜてもクリップしない",
  async () => {
    const root = mkdtempSync(join(tmpdir(), "stella-sfx-overlap-"));
    try {
      const cues = [
        { kind: "quiz", at: 1 },
        { kind: "term", at: 1.1 },
        { kind: "switch", at: 1 },
      ] as const;
      const duration = 4;
      const mix = mixSceneSfx([...cues], AUDIO_RATE, duration);
      const samples = cues.map(({ kind }) => synthesizeSceneSfx(kind, AUDIO_RATE));
      const start = Math.round(1.1 * AUDIO_RATE);
      for (let i = 0; i < 100; i++) {
        const earlier = start - AUDIO_RATE + i;
        expect(mix[start + i]).toBe(samples[0][earlier] + samples[1][i] + samples[2][earlier]);
      }
      const sfxWav = join(root, "sfx.wav");
      const wav = join(root, "voice.wav");
      const output = join(root, "mixed.m4a");
      writeNarrationWav(sfxWav, duration, [{ startSec: 0, pcm: mix }]);
      const voice = Int16Array.from({ length: duration * AUDIO_RATE }, (_, i) => {
        const t = i / AUDIO_RATE;
        return Math.round(
          30000 * Math.sin(2 * Math.PI * 180 * t) * Math.sin((Math.PI * t) / duration) ** 4,
        );
      });
      writeNarrationWav(wav, duration, [{ startSec: 0, pcm: voice }]);
      await encodeNarration(wav, output, { preventSilence: true, sfxWav });
      expect((await measureLoudness(output)).truePeakDb).toBeLessThan(-1.5);
      expect((await decodePcm(output)).every((sample) => sample > -32768 && sample < 32767)).toBe(
        true,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
  30_000,
);
