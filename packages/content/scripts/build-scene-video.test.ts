import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
  readFileSync,
  mkdirSync,
  existsSync,
  symlinkSync,
} from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { estimateSpeechSeconds } from "../src/narration.js";
import { sceneSpeeches, sceneVideoSequence, type TextScene } from "../src/scene-timeline.js";
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
  encodeNarration: vi.fn(),
  writeNarrationWav: vi.fn(),
  measureLoudness: vi.fn(async () => ({ integrated: -16 })),
  probeDuration: vi.fn(async () => 10),
  toPosterJpeg: vi.fn(async (_source: string, out: string) => writeFileSync(out, "poster")),
}));
vi.mock("./lib/scene-encode.js", () => ({
  encodeScene: vi.fn(async (_page: unknown, _duration: number, _audio: string, out: string) => {
    writeFileSync(out, "clip");
    return 1;
  }),
  runFfmpeg: vi.fn(async (args: string[]) => writeFileSync(args[args.length - 1], "video")),
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
import {
  argumentsOf,
  buildSceneVideos,
  sceneAudio,
  prepareSceneStills,
  planSceneTopic,
} from "./build-scene-video.js";
import {
  AUDIO_RATE,
  decodePcm,
  decodeTrimmedPcm,
  encodeNarration,
  writeNarrationWav,
  toPosterJpeg,
} from "./lib/ffmpeg.js";
import { collectNarrationTopics, contentRoot } from "./lib/narration-topics.js";
import { createTtsProvider, synthesizeCached, QuotaExhaustedError } from "./lib/tts.js";
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
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
describe("場面音声の作り直し", () => {
  it.each(["topic", "cue"] as const)(
    "%s方式でタイトル・まとめも辞書を通して1回ずつ合成する",
    async (unit) => {
      const readings = { STELLA: "ステラ", "Ctrl + S（Mac は ⌘ + S）": "保存のキーを押します" };
      const sequence = sceneVideoSequence([], [], {
        title: "STELLA",
        header: "読み上げない見出し",
        takeaway: "Ctrl + S（Mac は ⌘ + S）",
      });
      const tts = provider(unit);
      for (const { scene } of sequence) {
        const speech = sceneSpeeches(scene, readings)[0];
        const pcm = new Int16Array(Math.round(estimateSpeechSeconds(speech) * AUDIO_RATE)).fill(
          10000,
        );
        vi.mocked(decodePcm).mockResolvedValue(pcm);
        vi.mocked(decodeTrimmedPcm).mockResolvedValue(pcm);
        const result = await sceneAudio(scene, readings, tts, "/tmp/fixture-cache", true);
        expect(result).toHaveLength(1);
        expect(result[0].length).toBe(pcm.length);
      }
      expect(vi.mocked(synthesizeCached).mock.calls.map((call) => [call[1], call[3]])).toEqual([
        ["ステラ", true],
        ["保存のキーを押します", true],
      ]);
      expect(unit === "topic" ? decodePcm : decodeTrimmedPcm).toHaveBeenCalledTimes(2);
    },
  );
  it.each(["topic", "cue"] as const)("%s方式の文字場面も長さが異常なら失敗する", async (unit) => {
    const text: TextScene = { kind: "text", id: "title", title: "タイトルです", duration: 2.6 };
    vi.mocked(decodePcm).mockResolvedValue(new Int16Array(AUDIO_RATE * 20).fill(10000));
    vi.mocked(decodeTrimmedPcm).mockResolvedValue(new Int16Array(AUDIO_RATE * 20).fill(10000));
    await expect(sceneAudio(text, {}, provider(unit), "/tmp/fixture-cache")).rejects.toThrow(
      "長さ",
    );
  });
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
        {
          topicDir,
          stageSlug: "fixture",
          id: "fixture",
          title: "学ぶ流れ",
          readings: {},
        } as ReturnType<typeof collectNarrationTopics>[number],
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
            {
              topicDir,
              stageSlug: "fixture",
              id: "fixture",
              title: "学ぶ流れ",
              readings: {},
            } as ReturnType<typeof collectNarrationTopics>[number],
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
            expect(screenshot).toHaveBeenCalledTimes(count + 3);
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

describe("音声モデルと日次上限", () => {
  it("環境変数より引数を優先し、モデル名の無い引数を拒む", () => {
    vi.stubEnv("VIDEO_TTS_MODEL", "");
    expect(argumentsOf(["stage"]).ttsModel).toBeUndefined();
    vi.stubEnv("VIDEO_TTS_MODEL", "env-model");
    expect(argumentsOf(["stage"]).ttsModel).toBe("env-model");
    expect(argumentsOf(["stage", "--tts-model", "cli-model"]).ttsModel).toBe("cli-model");
    expect(argumentsOf(["--stills", "--tts-model", "cli-model"])).toMatchObject({
      stills: true,
      ttsModel: "cli-model",
    });
    for (const args of [
      ["--tts-model"],
      ["--tts-model", "--tts"],
      ["--tts-model", ""],
      ["--tts-model", " "],
    ])
      expect(() => argumentsOf(args)).toThrow("--tts-model");
  });

  function fixture() {
    const root = mkdtempSync(join(tmpdir(), "stella-scene-tts-"));
    const storyboard: BoardStoryboard = {
      schema: 1,
      brief: { goal: "説明できる。", stuck: "迷う。", points: ["読む。"], leaveOut: ["内部"] },
      boards: {
        main: {
          cols: 1,
          rows: 1,
          nodes: [{ id: "read", label: "読む", icon: "read", at: [1, 1] }],
        },
      },
      scenes: [
        {
          id: "hook",
          role: "hook",
          title: "つかみ",
          board: "main",
          beats: [{ say: "読みます。", show: ["read"] }],
        },
        {
          id: "point",
          role: "point",
          point: 1,
          title: "要点",
          board: "main",
          beats: [{ say: "読みます。", pulse: ["read"] }],
        },
        {
          id: "recap",
          role: "recap",
          title: "まとめ",
          board: "main",
          beats: [{ say: "読みます。", pulse: ["read"] }],
        },
      ],
    };
    writeFileSync(join(root, "video.json"), JSON.stringify(storyboard));
    const topics = ["first", "second"].map(
      (id) =>
        ({
          topicDir: root,
          stageSlug: "fixture",
          id,
          title: "学ぶ流れ",
          header: "開発環境",
          takeaway: "Webで読み、VS Codeで課題を書きます。",
          readings: {},
        }) as ReturnType<typeof collectNarrationTopics>[number],
    );
    vi.mocked(collectNarrationTopics).mockReturnValue(topics);
    const page = {
      route: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      goto: vi.fn(),
      evaluate: vi.fn(async (callback: unknown) =>
        String(callback).includes("__overflows") ? [] : undefined,
      ),
      screenshot: vi.fn(async ({ path }: { path: string }) => writeFileSync(path, "poster")),
    };
    const context = { newPage: vi.fn(async () => page), close: vi.fn() };
    const browser = { newContext: vi.fn(async () => context), close: vi.fn() };
    vi.mocked(chromium.launch).mockResolvedValue(
      browser as unknown as Awaited<ReturnType<typeof chromium.launch>>,
    );
    return { root, browser, context, topics, storyboard, page };
  }

  it.each([undefined, "env-model", "cli-model"])(
    "選んだモデル %s を使い、声・話し方は保つ。上限では後続の場面・トピックを試さない",
    async (model) => {
      const { root, browser, context } = fixture();
      const exitCode = process.exitCode;
      const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
      try {
        vi.stubEnv("VIDEO_TTS_MODEL", model === "env-model" ? model : "");
        const voiceFile = JSON.parse(
          readFileSync(join(contentRoot, "narration/voice.json"), "utf8"),
        );
        const config = { provider: "gemini", ...voiceFile.gemini, ...(model ? { model } : {}) };
        const identity = `gemini/${config.model}/${config.voice}/${config.style}`;
        vi.mocked(createTtsProvider).mockReturnValue({ ...provider("topic"), identity });
        vi.mocked(synthesizeCached).mockRejectedValueOnce(
          new QuotaExhaustedError("HTTP 429 1 日の上限"),
        );
        await buildSceneVideos([
          "fixture",
          "--tts",
          "gemini",
          "--out",
          join(root, "out"),
          ...(model === "cli-model" ? ["--tts-model", model] : []),
        ]);
        expect(createTtsProvider).toHaveBeenCalledExactlyOnceWith(config);
        expect(synthesizeCached).toHaveBeenCalledTimes(1);
        expect(decodePcm).not.toHaveBeenCalled();
        expect(browser.newContext).toHaveBeenCalledTimes(1);
        expect(context.close).toHaveBeenCalledOnce();
        expect(browser.close).toHaveBeenCalledOnce();
        expect(process.exitCode).toBe(1);
        expect(error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining(`${config.model}/`));
        expect(error).toHaveBeenCalledWith(
          expect.stringContaining("--tts-model <別のモデル> で別のモデルを使えます"),
        );
      } finally {
        process.exitCode = exitCode;
        error.mockRestore();
        rmSync(root, { recursive: true, force: true });
      }
    },
  );

  it("stills ではモデルの指定があっても音声プロバイダを作らない", async () => {
    const { root, page, storyboard } = fixture();
    try {
      const dir = prepareSceneStills(join(root, "out"), "fixture", "first");
      const stale = join(dir, "scene-99-beat-99.png");
      writeFileSync(stale, "old");
      await buildSceneVideos([
        "fixture",
        "--stills",
        "--tts-model",
        "ignored",
        "--out",
        join(root, "out"),
      ]);
      expect(createTtsProvider).not.toHaveBeenCalled();
      expect(synthesizeCached).not.toHaveBeenCalled();
      const screenshots = page.screenshot.mock.calls.map(([args]) => args.path);
      expect(screenshots[0]).toContain("scene-1-beat-1.png");
      expect(screenshots).toContain(join(dir, `scene-${storyboard.scenes.length + 2}-beat-1.png`));
      expect(existsSync(stale)).toBe(false);
      expect(screenshots).toHaveLength(
        2 * (storyboard.scenes.reduce((n, s) => n + s.beats.length, 0) + 3),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it.each(["gemini", "fake", "openjtalk"] as const)(
    "%sの読み上げを全場面に配置し、reportとポスターを保つ",
    async (name) => {
      const { root, topics, storyboard } = fixture();
      const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
      try {
        vi.mocked(collectNarrationTopics).mockReturnValue(topics.slice(0, 1));
        topics[0].readings = { Web: "ウェブ", "VS Code": "ブイエスコード" };
        const identity = `${name}/alternate-model/Charon/style`;
        vi.mocked(createTtsProvider).mockReturnValue({
          ...provider(name === "gemini" ? "topic" : "cue"),
          identity,
        });
        const decode = async () =>
          new Int16Array(
            Math.round(
              estimateSpeechSeconds(vi.mocked(synthesizeCached).mock.calls.at(-1)?.[1] ?? "") *
                AUDIO_RATE,
            ),
          ).fill(10000);
        vi.mocked(decodePcm).mockImplementation(decode);
        vi.mocked(decodeTrimmedPcm).mockImplementation(decode);
        await buildSceneVideos([
          "fixture",
          "--tts",
          name,
          "--refresh-audio",
          "title,summary",
          "--tts-model",
          "alternate-model",
          "--out",
          join(root, "out"),
        ]);
        const report = JSON.parse(
          readFileSync(join(root, "out/fixture/first/report.json"), "utf8"),
        );
        expect(report.ttsIdentity).toBe(identity);
        expect(report.scenes.map((s: { id: string }) => s.id)).toEqual([
          "title",
          ...storyboard.scenes.map((s) => s.id),
          "summary",
        ]);
        expect(report.scenes[0]).toMatchObject({ id: "title", startSec: 0, durationSec: 2.6 });
        expect(report.scenes[1].startSec).toBe(2.6);
        const summarySpeech = estimateSpeechSeconds(
          "ウェブで読み、ブイエスコードで課題を書きます。",
        );
        const summaryDuration =
          Math.ceil((0.8 + Math.round(summarySpeech * AUDIO_RATE) / AUDIO_RATE + 1.4 - 1e-9) * 30) /
          30;
        expect(report.scenes.at(-1)).toMatchObject({ id: "summary", durationSec: summaryDuration });
        expect(report.scenes.at(-1).startSec).toBeCloseTo(report.durationSec - summaryDuration);
        expect(report.durationSec).toBeCloseTo(
          report.scenes.reduce((n: number, s: { durationSec: number }) => n + s.durationSec, 0),
        );
        expect(synthesizeCached).toHaveBeenCalledTimes(storyboard.scenes.length + 2);
        const calls = vi.mocked(synthesizeCached).mock.calls;
        expect(calls[0][1]).toBe(topics[0].title);
        expect(calls.at(-1)?.[1]).toBe("ウェブで読み、ブイエスコードで課題を書きます。");
        expect(calls.map((call) => call[3])).toEqual([true, false, false, false, true]);
        const wavs = vi
          .mocked(writeNarrationWav)
          .mock.calls.filter(([file]) => /audio-\d+\.wav$/.test(file));
        expect(wavs[0][2][0].startSec).toBe(0.6);
        expect(wavs.at(-1)?.[2][0].startSec).toBe(0.8);
        for (const call of wavs) expect(call[2][0].pcm.length).toBeGreaterThan(0);
        expect(toPosterJpeg).toHaveBeenCalledExactlyOnceWith(
          join(contentRoot, "dist/video-cache/scenes", report.scenes.at(-2).hash, "poster.png"),
          expect.stringContaining("poster.jpg"),
        );
        expect(readFileSync(join(root, "out/fixture/first/captions.vtt"), "utf8")).toBe(
          "WEBVTT\n\nNOTE 字幕は動画に焼き込み済み\n\n",
        );
        expect(encodeNarration).toHaveBeenCalledTimes(storyboard.scenes.length + 2);
        const sfxWavs = vi
          .mocked(writeNarrationWav)
          .mock.calls.filter(([file]) => /sfx-\d+\.wav$/.test(file));
        expect(sfxWavs).toHaveLength(2);
        for (const [i, call] of vi.mocked(encodeNarration).mock.calls.entries()) {
          const sfx =
            i === 0 ? sfxWavs[0] : i === storyboard.scenes.length + 1 ? sfxWavs[1] : undefined;
          expect(call[2]).toEqual({ preventSilence: true, ...(sfx ? { sfxWav: sfx[0] } : {}) });
          if (sfx) {
            expect(sfx[1]).toBe(report.scenes[i].durationSec);
            expect(sfx[2][0].startSec).toBe(0.1);
            expect(sfx[2][0].pcm.length).toBe(Math.round((i === 0 ? 0.9 : 1.1) * AUDIO_RATE));
          }
        }
      } finally {
        info.mockRestore();
        rmSync(root, { recursive: true, force: true });
      }
    },
  );
  it("配信用の計画にもtakeawayの変更を反映する", () => {
    const { root, topics } = fixture();
    try {
      const before = planSceneTopic(topics[0], "fixture");
      expect(
        planSceneTopic({ ...topics[0], takeaway: "確認して提出します。" }, "fixture"),
      ).not.toBe(before);
      expect(planSceneTopic({ ...topics[0], takeaway: "" }, "fixture")).not.toBe(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("静止画の出力先の掃除", () => {
  it("指定トピック直下のPNGだけを消し、ほかのファイル・子フォルダー・別トピックを保つ", () => {
    const root = mkdtempSync(join(tmpdir(), "stella-stills-clean-"));
    try {
      const dir = prepareSceneStills(root, "stage", "topic");
      mkdirSync(join(dir, "nested"));
      const other = prepareSceneStills(root, "stage", "other");
      const removed = [
        join(dir, "scene-99-beat-1.png"),
        join(dir, "contact-sheet.png"),
        join(dir, "old.PNG"),
      ];
      const kept = [
        join(dir, "notes.txt"),
        join(dir, "nested", "keep.png"),
        join(other, "keep.png"),
      ];
      for (const file of [...removed, ...kept]) writeFileSync(file, "fixture");
      expect(prepareSceneStills(root, "stage", "topic")).toBe(dir);
      for (const file of removed) expect(existsSync(file)).toBe(false);
      for (const file of kept) expect(readFileSync(file, "utf8")).toBe("fixture");
      for (const [stage, topic] of [
        ["../stage", "topic"],
        ["stage", "../other"],
        ["stage", root],
      ])
        expect(() => prepareSceneStills(root, stage, topic)).toThrow("想定の場所");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it.each(["stage", "topic", "stills"])("%s が別の場所へのリンクなら削除せずに止める", (part) => {
    const root = mkdtempSync(join(tmpdir(), "stella-stills-link-"));
    try {
      const outside = join(root, "outside");
      mkdirSync(outside);
      const sentinel = join(outside, "keep.png");
      writeFileSync(sentinel, "keep");
      const out = join(root, "out");
      const parts = ["stage", "topic", "stills"];
      const parent = join(out, ...parts.slice(0, parts.indexOf(part)));
      mkdirSync(parent, { recursive: true });
      symlinkSync(outside, join(parent, part), "junction");
      expect(() => prepareSceneStills(out, "stage", "topic")).toThrow("想定の場所");
      expect(readFileSync(sentinel, "utf8")).toBe("keep");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

it("復元した音声キャッシュが壊れていれば、再合成して続ける", async () => {
  const singleBeat = { ...scene, beats: [scene.beats[0]] };
  vi.mocked(synthesizeCached)
    .mockResolvedValueOnce({ file: "/tmp/stella-corrupt-audio-fixture.wav", cached: true })
    .mockResolvedValueOnce({ file: "fixture.wav", cached: false });
  vi.mocked(decodePcm)
    .mockRejectedValueOnce(new Error("invalid cached audio"))
    .mockResolvedValueOnce(pcmFor(singleBeat));
  await sceneAudio(singleBeat, {}, provider("topic"), "/tmp/fixture-cache");
  expect(vi.mocked(synthesizeCached).mock.calls.map((call) => call[3])).toEqual([false, true]);
});
