import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { estimateSpeechSeconds } from "../src/narration.js";
import type { Scene, BoardStoryboard } from "../src/video-storyboard.js";
import type { TtsProvider } from "./lib/tts.js";

vi.mock("playwright", () => ({ chromium: { launch: vi.fn() } }));
vi.mock("./lib/tts.js", async (original) => ({
  ...(await original<typeof import("./lib/tts.js")>()),
  synthesizeCached: vi.fn(async () => ({ file: "fixture.wav", cached: false })),
  createTtsProvider: vi.fn(),
}));
vi.mock("./lib/ffmpeg.js", async (original) => ({
  ...(await original<typeof import("./lib/ffmpeg.js")>()),
  decodePcm: vi.fn(),
  decodeTrimmedPcm: vi.fn(),
}));
vi.mock("./lib/narration-topics.js", async (original) => ({
  ...(await original<typeof import("./lib/narration-topics.js")>()),
  collectNarrationTopics: vi.fn(),
}));
vi.mock("../src/narration-split.js", async (original) => ({
  ...(await original<typeof import("../src/narration-split.js")>()),
  trimSilence: (pcm: Int16Array) => pcm,
}));

import { chromium } from "playwright";
import { argumentsOf, buildSceneVideos, sceneAudio } from "./build-scene-video.js";
import { AUDIO_RATE, decodePcm, decodeTrimmedPcm } from "./lib/ffmpeg.js";
import { collectNarrationTopics } from "./lib/narration-topics.js";
import { createTtsProvider, synthesizeCached } from "./lib/tts.js";
const videoFile = new URL("../src/__fixtures__/board-video.json", import.meta.url);
const sample = JSON.parse(readFileSync(videoFile, "utf8")) as BoardStoryboard;
const scene = sample.scenes[0];
const pcmFor = (scene: Scene) =>
  new Int16Array(
    scene.beats.reduce((n, b) => n + Math.round(estimateSpeechSeconds(b.say) * AUDIO_RATE), 0),
  ).fill(10000);
const provider = (unit: "topic" | "cue"): TtsProvider => ({
  unit,
  concurrency: 1,
  identity: "fixture",
  nondeterministic: false,
  synthesize: vi.fn(),
});
afterEach(() => vi.clearAllMocks());
describe("場面音声の作り直し", () => {
  it("複数の場面idを読み、空の指定とstillsとの併用を拒む", () => {
    expect(
      argumentsOf(["--", "dev-env-basics", "--refresh-audio", "hook,retry", "--tts", "fake"]),
    ).toMatchObject({
      selectors: ["dev-env-basics"],
      refreshAudio: ["hook", "retry"],
      tts: "fake",
    });
    for (const args of [
      ["--refresh-audio"],
      ["--refresh-audio", "--tts"],
      ["--refresh-audio", "hook,"],
      ["--refresh-audio", ""],
      ["--stills", "--refresh-audio", "hook"],
      ["--refresh-audio", "hook", "--stills"],
    ])
      expect(() => argumentsOf(args)).toThrow("--refresh-audio");
  });
  it("知らない場面idはブラウザ起動や音声合成より前に拒む", async () => {
    vi.mocked(collectNarrationTopics).mockReturnValue([
      { topicDir: new URL(".", videoFile).pathname } as ReturnType<
        typeof collectNarrationTopics
      >[number],
    ]);
    await expect(
      buildSceneVideos(["dev-env-basics", "--refresh-audio", "unknown"]),
    ).rejects.toThrow("知らない場面のid: unknown");
    expect(chromium.launch).not.toHaveBeenCalled();
    expect(createTtsProvider).not.toHaveBeenCalled();
    expect(synthesizeCached).not.toHaveBeenCalled();
  });
  it("対象トピックがないときも未知の場面idを拒む", async () => {
    vi.mocked(collectNarrationTopics).mockReturnValue([]);
    await expect(buildSceneVideos(["none", "--refresh-audio", "hook"])).rejects.toThrow(
      "知らない場面のid: hook",
    );
    expect(chromium.launch).not.toHaveBeenCalled();
  });
  for (const unit of ["topic", "cue"] as const)
    it(`${unit}方式は選んだ場面だけrefreshを渡す`, async () => {
      vi.mocked(decodePcm).mockResolvedValue(pcmFor(scene));
      vi.mocked(decodeTrimmedPcm).mockResolvedValue(
        new Int16Array(Math.round(estimateSpeechSeconds(scene.beats[0].say) * AUDIO_RATE)),
      );
      const singleBeat = { ...scene, beats: [scene.beats[0]] };
      const other = { ...singleBeat, id: "other" };
      vi.mocked(decodePcm).mockResolvedValue(pcmFor(singleBeat));
      const options = argumentsOf(["dev-env-basics", "--refresh-audio", scene.id]);
      const tts = provider(unit);
      for (const current of [singleBeat, other])
        await sceneAudio(
          current,
          {},
          tts,
          "/tmp/fixture-cache",
          options.refreshAudio.includes(current.id),
        );
      expect(vi.mocked(synthesizeCached).mock.calls.map((call) => call[3])).toEqual([true, false]);
      expect(tts.synthesize).not.toHaveBeenCalled();
    });
  it("文単位の方式では選んだ場面の全beatを作り直す", async () => {
    vi.mocked(decodeTrimmedPcm).mockImplementation(async () =>
      pcmFor({ ...scene, beats: [scene.beats[0]] }),
    );
    // 比較する文の長さをそろえ、分割・音量に依存しない条件で確認する。
    const repeated = { ...scene, beats: [scene.beats[0], scene.beats[0]] };
    await sceneAudio(repeated, {}, provider("cue"), "/tmp/fixture-cache", true);
    expect(vi.mocked(synthesizeCached).mock.calls.map((call) => call[3])).toEqual([true, true]);
  });
  it("通常実行は場面音声の既存キャッシュを使う", async () => {
    const singleBeat = { ...scene, beats: [scene.beats[0]] };
    vi.mocked(decodePcm).mockResolvedValue(pcmFor(singleBeat));
    await sceneAudio(singleBeat, {}, provider("topic"), "/tmp/fixture-cache");
    expect(vi.mocked(synthesizeCached).mock.calls[0][3]).toBe(false);
  });
});

describe("素材不足の書き出し", () => {
  it("stills も art が無ければ Chromium と TTS の前に止める", async () => {
    const topicDir = mkdtempSync(join(tmpdir(), "stella-missing-art-"));
    try {
      const sb = structuredClone(sample);
      sb.art = { read: { prompt: "Learner" } };
      sb.boards.main.nodes[0].art = "read";
      writeFileSync(join(topicDir, "video.json"), JSON.stringify(sb));
      vi.mocked(collectNarrationTopics).mockReturnValue([
        { topicDir, stageSlug: "fixture", id: "fixture", readings: {} } as ReturnType<
          typeof collectNarrationTopics
        >[number],
      ]);
      await expect(buildSceneVideos(["fixture", "--stills"])).rejects.toThrow(
        "イラストがまだありません",
      );
      expect(chromium.launch).not.toHaveBeenCalled();
      expect(createTtsProvider).not.toHaveBeenCalled();
      expect(synthesizeCached).not.toHaveBeenCalled();
    } finally {
      rmSync(topicDir, { recursive: true, force: true });
    }
  });
});

describe("はみ出しがある場合の書き出し", () => {
  for (const stills of [true, false])
    it(
      stills ? "静止画と一覧をすべて書いた後にエラーを返す" : "動画は画像や音声を作る前に止める",
      async () => {
        const topicDir = mkdtempSync(join(tmpdir(), "stella-overflow-"));
        const exitCode = process.exitCode;
        const events: string[] = [];
        const report = vi.spyOn(console, "error").mockImplementation((message) => {
          events.push(String(message));
        });
        try {
          writeFileSync(join(topicDir, "video.json"), JSON.stringify(sample));
          vi.mocked(collectNarrationTopics).mockReturnValue([
            { topicDir, stageSlug: "fixture", id: "fixture", readings: {} } as ReturnType<
              typeof collectNarrationTopics
            >[number],
          ]);
          const screenshot = vi.fn(async ({ path }: { path: string }) => {
            writeFileSync(path, "fixture");
            events.push(path);
          });
          const page = {
            route: vi.fn(),
            on: vi.fn(),
            off: vi.fn(),
            goto: vi.fn(),
            screenshot,
            evaluate: vi.fn(async (callback: unknown) =>
              String(callback).includes("__overflows") ? ["読む", "書く"] : undefined,
            ),
          };
          const browser = {
            newContext: vi.fn(async () => ({ newPage: vi.fn(async () => page), close: vi.fn() })),
            close: vi.fn(),
          };
          vi.mocked(chromium.launch).mockResolvedValue(
            browser as unknown as Awaited<ReturnType<typeof chromium.launch>>,
          );
          await buildSceneVideos([
            "fixture",
            "--out",
            join(topicDir, "out"),
            ...(stills ? ["--stills"] : ["--tts", "fake"]),
          ]);
          expect(process.exitCode).toBe(1);
          expect(report).toHaveBeenCalledWith(expect.stringContaining("文字のはみ出し"));
          expect(synthesizeCached).not.toHaveBeenCalled();
          if (stills) {
            const count = sample.scenes.reduce((n, scene) => n + scene.beats.length, 0);
            expect(screenshot).toHaveBeenCalledTimes(count + 1);
            expect(events.at(-2)).toContain("contact-sheet.png");
            expect(events.at(-1)).toContain("文字のはみ出し");
            for (const scene of sample.scenes) expect(events.at(-1)).toContain(`${scene.id}: 読む`);
          } else expect(screenshot).not.toHaveBeenCalled();
        } finally {
          process.exitCode = exitCode;
          report.mockRestore();
          rmSync(topicDir, { recursive: true, force: true });
        }
      },
    );
});
