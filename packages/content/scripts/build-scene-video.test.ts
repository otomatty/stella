import { fileURLToPath, pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";
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
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { synthesizeSceneSfx } from "../src/scene-sfx.js";
import { estimateSpeechSeconds } from "../src/narration.js";
import { sceneSpeeches, sceneVideoSequence, type TextScene } from "../src/scene-timeline.js";
import type { Scene, BoardStoryboard, VideoStoryboard } from "../src/video-storyboard.js";
import type { TtsProvider } from "./lib/tts.js";
import type { ScenePageWindow } from "./lib/scene-html.js";

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
vi.mock("./lib/scene-encode.js", async (original) => ({
  ...(await original<typeof import("./lib/scene-encode.js")>()),
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
import { chromium } from "playwright";
import {
  argumentsOf,
  buildSceneVideos,
  topicAudio,
  sceneTopicTtsSpeeches,
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
import { encodeScene, runFfmpeg } from "./lib/scene-encode.js";
import { collectNarrationTopics, contentRoot } from "./lib/narration-topics.js";
import {
  countTtsCalls,
  createTtsProvider,
  cueHash,
  pcmToWav,
  QuotaExhaustedError,
  requireCachedTts,
  synthesizeCached,
} from "./lib/tts.js";
const videoFile = new URL("../src/__fixtures__/board-video.json", import.meta.url);
const sample = JSON.parse(readFileSync(videoFile, "utf8")) as BoardStoryboard;
const scene = sample.scenes[0];
const pcmFor = (scene: Scene) =>
  new Int16Array(
    scene.beats.reduce((n, b) => n + Math.round(estimateSpeechSeconds(b.say) * AUDIO_RATE), 0),
  ).fill(10000);
function spokenPcm(speech: string, scale = 1): Int16Array {
  const lengths = speech
    .split("\n\n")
    .map((line) => Math.round(estimateSpeechSeconds(line) * AUDIO_RATE * scale));
  const gap = AUDIO_RATE * 0.35;
  const pcm = new Int16Array(
    lengths.reduce((total, length) => total + length, 0) + (lengths.length - 1) * gap,
  );
  let start = 0;
  for (const [i, length] of lengths.entries()) {
    pcm.fill(10_000 + i, start, start + length);
    start += length + gap;
  }
  return pcm;
}
const audioBytes = (pcm: Int16Array) => ({
  bytes: pcmToWav(new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength), AUDIO_RATE),
  ext: "wav" as const,
});

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
    "%s方式でタイトルだけを辞書を通して合成し、takeawayは合成しない",
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
        const [result] = await topicAudio([scene], readings, tts, "/tmp/fixture-cache", ["title"]);
        expect(result).toHaveLength(1);
        expect(result[0].length).toBe(pcm.length);
      }
      expect(vi.mocked(synthesizeCached).mock.calls.map((call) => [call[1], call[3]])).toEqual([
        ["ステラ", true],
      ]);
      expect(unit === "topic" ? decodePcm : decodeTrimmedPcm).toHaveBeenCalledTimes(1);
    },
  );
  it.each(["topic", "cue"] as const)("%s方式の文字場面も長さが異常なら失敗する", async (unit) => {
    const text: TextScene = { kind: "text", id: "title", title: "タイトルです", duration: 2.6 };
    vi.mocked(decodePcm).mockResolvedValue(new Int16Array(AUDIO_RATE * 20).fill(10000));
    vi.mocked(decodeTrimmedPcm).mockResolvedValue(new Int16Array(AUDIO_RATE * 20).fill(10000));
    await expect(topicAudio([text], {}, provider(unit), "/tmp/fixture-cache")).rejects.toThrow(
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
      ["--refresh-audio", "title,summary"],
      ["--refresh-audio", ""],
      ["--stills", "--refresh-audio", "hook"],
      ["--refresh-audio", "hook", "--stills"],
    ])
      expect(() => argumentsOf(args)).toThrow("--refresh-audio");
  });
  it("知らない場面idはブラウザ起動や音声合成より前に拒む", async () => {
    vi.mocked(collectNarrationTopics).mockReturnValue([
      {
        topicDir: new URL(".", videoFile).pathname,
        takeaway: "動画で流れを確かめます。",
      } as ReturnType<typeof collectNarrationTopics>[number],
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
  it.each(["topic", "cue"] as const)("%s方式で場面を指定したときの作り直し範囲", async (unit) => {
    const singleBeat = { ...scene, beats: [scene.beats[0]] };
    const other = { ...singleBeat, id: "other" };
    vi.mocked(decodeTrimmedPcm).mockResolvedValue(pcmFor(singleBeat));
    vi.mocked(decodePcm).mockImplementation(async () =>
      spokenPcm(vi.mocked(synthesizeCached).mock.calls.at(-1)?.[1] ?? ""),
    );
    const options = argumentsOf(["dev-env-basics", "--refresh-audio", other.id]);
    await topicAudio(
      [singleBeat, other],
      {},
      provider(unit),
      "/tmp/fixture-cache",
      options.refreshAudio,
    );
    expect(vi.mocked(synthesizeCached).mock.calls.map((call) => call[3])).toEqual(
      unit === "topic" ? [true] : [false, true],
    );
  });
  it("文単位の方式では選んだ場面の全beatを作り直す", async () => {
    vi.mocked(decodeTrimmedPcm).mockImplementation(async () =>
      pcmFor({ ...scene, beats: [scene.beats[0]] }),
    );
    // 比較する文の長さをそろえ、分割・音量に依存しない条件で確認する。
    const repeated = { ...scene, beats: [scene.beats[0], scene.beats[0]] };
    await topicAudio([repeated], {}, provider("cue"), "/tmp/fixture-cache", [repeated.id]);
    expect(vi.mocked(synthesizeCached).mock.calls.map((call) => call[3])).toEqual([true, true]);
  });
  it("通常実行は動画音声の既存キャッシュを使う", async () => {
    const singleBeat = { ...scene, beats: [scene.beats[0]] };
    vi.mocked(decodePcm).mockResolvedValue(pcmFor(singleBeat));
    await topicAudio([singleBeat], {}, provider("topic"), "/tmp/fixture-cache");
    expect(vi.mocked(synthesizeCached).mock.calls[0][3]).toBe(false);
  });
});

describe("動画単位の音声合成", () => {
  const title: TextScene = { kind: "text", id: "title", title: "動画のタイトル", duration: 2.6 };
  const single = { ...scene, beats: [{ ...scene.beats[0], say: "短い文です。" }] };
  const long = {
    ...scene,
    beats: [
      { ...scene.beats[0], say: "長い文を読み上げます。".repeat(2) },
      { ...scene.beats[0], say: "続けて長い文を読みます。".repeat(2) },
    ],
  };
  const scenes = [title, long, ...[1, 2, 3, 4].map((i) => ({ ...single, id: `short-${i}` }))];
  const speechOfScenes = (items: (Scene | TextScene)[]) =>
    items.flatMap((item) => sceneSpeeches(item, {})).join("\n\n");
  const full = speechOfScenes(scenes);
  const first = speechOfScenes(scenes.slice(0, 2));
  const last = speechOfScenes(scenes.slice(2));
  let cache: string;
  const synthesize = vi.fn(async (speech: string) => audioBytes(spokenPcm(speech)));
  const voice = { ...provider("topic"), synthesize };
  const run = (items = scenes, refreshIds: string[] = []) =>
    topicAudio(items, {}, voice, cache, refreshIds, "stage/topic");
  let warn: MockInstance<typeof console.warn>;
  const cached = vi.mocked(synthesizeCached);
  const mockSynthesis = cached.getMockImplementation();

  beforeEach(async () => {
    cache = mkdtempSync(join(tmpdir(), "stella-topic-audio-"));
    warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const actual = await vi.importActual<typeof import("./lib/tts.js")>("./lib/tts.js");
    cached.mockImplementation(actual.synthesizeCached);
    synthesize.mockReset().mockImplementation(async (speech) => audioBytes(spokenPcm(speech)));
    // pcmToWav の固定長のヘッダを省き、保存したサンプルをそのまま返す。
    vi.mocked(decodePcm).mockImplementation(async (file) => {
      const bytes = readFileSync(file).subarray(44);
      return Int16Array.from({ length: bytes.length / 2 }, (_, i) => bytes.readInt16LE(i * 2));
    });
  });

  afterEach(() => {
    requireCachedTts(false);
    if (mockSynthesis) cached.mockImplementation(mockSynthesis);
    warn.mockRestore();
    rmSync(cache, { recursive: true, force: true });
  });

  it("全文を 1 回読み、元の場面と文の順に PCM を返す", async () => {
    const pcms = await run();
    expect(synthesize).toHaveBeenCalledExactlyOnceWith(full);
    expect(pcms.map((group) => group.length)).toEqual([1, 2, 1, 1, 1, 1]);
    expect(pcms.flat().map((pcm) => pcm[Math.floor(pcm.length / 2)])).toEqual([
      10000, 10001, 10002, 10003, 10004, 10005, 10006,
    ]);
  });

  it("無音の切れ目が足りなければ全文を 1 回作り直す", async () => {
    synthesize.mockResolvedValueOnce(audioBytes(new Int16Array(AUDIO_RATE).fill(10000)));
    await run();
    expect(synthesize.mock.calls).toEqual([[full], [full]]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("全文が 2 回落ちたら推定時間が半分に最も近い場面の切れ目で分ける", async () => {
    synthesize.mockImplementation(async (speech) =>
      audioBytes(spokenPcm(speech, speech === full ? 3 : 1)),
    );
    const pcms = await run();
    expect(synthesize.mock.calls).toEqual([[full], [full], [first], [last]]);
    expect(pcms.map((group) => group.length)).toEqual([1, 2, 1, 1, 1, 1]);
    expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("short-1 の手前"));
  });

  it("後半も落ちたら 1 回作り直し、動画全体での文番号を示す", async () => {
    synthesize.mockImplementation(async (speech) =>
      audioBytes(spokenPcm(speech, speech === first ? 1 : 3)),
    );
    await expect(run()).rejects.toThrow(/stage\/topic:.*文4の音声の長さが推定と合いません/);
    expect(synthesize.mock.calls).toEqual([[full], [full], [first], [last], [last]]);
  });

  it("場面が 1 つなら分けずに文番号と分割できない理由を示す", async () => {
    synthesize.mockImplementation(async () => audioBytes(new Int16Array(AUDIO_RATE)));
    await expect(run([title])).rejects.toThrow(/stage\/topic:.*文1: 有音フレームがありません/);
    expect(synthesize).toHaveBeenCalledTimes(2);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([new QuotaExhaustedError("日次上限"), new Error("通信に失敗しました")])(
    "合成でエラーが出たら同じエラーを返す (%s)",
    async (error) => {
      synthesize.mockRejectedValueOnce(error);
      await expect(run()).rejects.toBe(error);
      expect(synthesize).toHaveBeenCalledExactlyOnceWith(full);
      expect(warn).not.toHaveBeenCalled();
    },
  );

  function cacheAudio(speech: string, scale = 1) {
    writeFileSync(
      join(cache, `${cueHash(voice.identity, speech)}.wav`),
      audioBytes(spokenPcm(speech, scale)).bytes,
    );
  }

  it("場面 ID を指定すると既存キャッシュがあっても全文を作り直す", async () => {
    cacheAudio(full);
    await run(scenes, [long.id]);
    expect(synthesize).toHaveBeenCalledExactlyOnceWith(full);
  });

  it.each([false, true])(
    "--refresh-audio の有無で分割後のキャッシュを使い分ける (%s)",
    async (refresh) => {
      cacheAudio(first);
      cacheAudio(last);
      synthesize.mockImplementation(async (speech) =>
        audioBytes(spokenPcm(speech, speech === full ? 3 : 1)),
      );
      const { refreshAudio } = argumentsOf(refresh ? ["--refresh-audio", long.id] : []);
      await run(scenes, refreshAudio);
      expect(synthesize.mock.calls).toEqual(
        refresh ? [[full], [full], [first], [last]] : [[full], [full]],
      );
    },
  );

  it("cached-only は検査に落ちても作り直さず、キャッシュにある前半と後半を使う", async () => {
    cacheAudio(full, 3);
    cacheAudio(first);
    cacheAudio(last);
    requireCachedTts(true);
    expect((await run()).map((group) => group.length)).toEqual([1, 2, 1, 1, 1, 1]);
    expect(cached.mock.calls.map((call) => [call[1], call[3]])).toEqual([
      [full, false],
      [first, false],
      [last, false],
    ]);
    expect(synthesize).not.toHaveBeenCalled();
  });

  it("cached-only で後半のキャッシュが無ければ --preview を案内する", async () => {
    cacheAudio(full, 3);
    cacheAudio(first);
    requireCachedTts(true);
    await expect(run()).rejects.toThrow("先に --preview で作って確かめてください");
    expect(cached.mock.calls.map((call) => [call[1], call[3]])).toEqual([
      [full, false],
      [first, false],
      [last, false],
    ]);
    expect(synthesize).not.toHaveBeenCalled();
  });

  it("cached-only で前半のキャッシュ自体が検査に落ちても作り直さない", async () => {
    cacheAudio(full, 3);
    cacheAudio(first, 3);
    requireCachedTts(true);
    await expect(run()).rejects.toThrow(/stage\/topic:.*文1の音声の長さが推定と合いません/);
    expect(cached.mock.calls.map((call) => [call[1], call[3]])).toEqual([
      [full, false],
      [first, false],
    ]);
    expect(synthesize).not.toHaveBeenCalled();
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
          takeaway: "動画で流れを確かめます。",
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
              takeaway: "動画で流れを確かめます。",
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
            expect(screenshot).toHaveBeenCalledTimes(count + 2);
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
      screenshot: vi.fn(async (args: { path: string }) => {
        const image = Buffer.from("poster");
        if (args?.path) writeFileSync(args.path, image);
        return image;
      }),
    };
    const context = { newPage: vi.fn(async () => page), close: vi.fn() };
    const browser = { newContext: vi.fn(async () => context), close: vi.fn() };
    vi.mocked(chromium.launch).mockResolvedValue(
      browser as unknown as Awaited<ReturnType<typeof chromium.launch>>,
    );
    return { root, browser, context, topics, storyboard, page };
  }

  it.each([undefined, "gemini", "openjtalk", "fake"] as const)(
    "video:scenes の読み上げ指定 %s を解決する",
    async (tts) => {
      const { root } = fixture();
      const exitCode = process.exitCode;
      const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
      try {
        vi.stubEnv("VIDEO_TTS_MODEL", "");
        vi.mocked(createTtsProvider).mockReturnValue(provider("topic"));
        vi.mocked(synthesizeCached).mockRejectedValueOnce(new QuotaExhaustedError("テスト用"));
        await buildSceneVideos([
          "fixture",
          "--out",
          join(root, "out"),
          ...(tts ? ["--tts", tts] : []),
        ]);
        expect(createTtsProvider).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({ provider: tts ?? "openjtalk" }),
        );
      } finally {
        process.exitCode = exitCode;
        error.mockRestore();
        rmSync(root, { recursive: true, force: true });
      }
    },
  );

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
      expect(existsSync(join(root, "out", "scenes.html"))).toBe(false);
      const screenshots = page.screenshot.mock.calls.map(([args]) => args.path);
      expect(screenshots[0]).toContain("scene-1-beat-1.png");
      expect(screenshots).toContain(join(dir, `scene-${storyboard.scenes.length + 1}-beat-1.png`));
      expect(existsSync(stale)).toBe(false);
      expect(screenshots).toHaveLength(
        2 * (storyboard.scenes.reduce((n, s) => n + s.beats.length, 0) + 2),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it.each([
    [undefined, ["first", "second", "third"]],
    [new Error("合成に失敗"), ["first", "third"]],
    [new QuotaExhaustedError("日次上限"), ["first"]],
  ] as const)("確認ページには今回作れた動画だけを載せる (%s)", async (failure, made) => {
    const { root, topics } = fixture();
    const out = join(root, "out");
    const preview = join(out, "scenes.html");
    const index = join(out, "index.html");
    const exitCode = process.exitCode;
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      topics[0].title = "動画 <script> & 字幕";
      topics.push({ ...topics[1], id: "third" });
      mkdirSync(join(out, "fixture", "second"), { recursive: true });
      writeFileSync(join(out, "fixture", "second", "video.mp4"), "前回の動画");
      writeFileSync(index, "video:sync の一覧");
      vi.mocked(createTtsProvider).mockReturnValue(provider("topic"));
      vi.mocked(decodePcm).mockImplementation(async () =>
        spokenPcm(vi.mocked(synthesizeCached).mock.calls.at(-1)?.[1] ?? ""),
      );
      if (failure)
        vi.mocked(synthesizeCached)
          .mockResolvedValueOnce({ file: "fixture.wav", cached: false })
          .mockRejectedValueOnce(failure);

      await buildSceneVideos([
        "fixture",
        "--tts",
        "gemini",
        "--tts-model",
        "alternate-model",
        "--out",
        out,
      ]);

      const html = readFileSync(preview, "utf8");
      for (const id of made) {
        expect(html).toContain(`<h2>fixture/${id} `);
        expect(html).toContain(
          `<video controls preload="metadata" poster="fixture/${id}/poster.jpg">`,
        );
        expect(html).toContain(`<source src="fixture/${id}/video.mp4" type="video/mp4">`);
        expect(html).toContain(
          `<track kind="captions" srclang="ja" label="日本語" src="fixture/${id}/captions.vtt" default>`,
        );
      }
      expect(html.match(/<video /g)).toHaveLength(made.length);
      expect(html).toContain("動画 &lt;script&gt; &amp; 字幕");
      expect(html).not.toContain("<script>");
      expect(html).toContain("video::cue {");
      expect(html).toMatch(/長さ \d+\.\d{2} 秒/);
      expect(readFileSync(index, "utf8")).toBe("video:sync の一覧");
      expect(info).toHaveBeenCalledWith(
        expect.stringContaining(
          `${preview} （python3 -m http.server -d '${out}' を実行し、http://localhost:8000/scenes.html`,
        ),
      );
    } finally {
      process.exitCode = exitCode;
      info.mockRestore();
      error.mockRestore();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("stills ではダイアログが出ている時刻にその文を撮る", async () => {
    const { root, page, storyboard, topics } = fixture();
    try {
      const roles = [
        "goal",
        "example",
        "syntax",
        "apply",
        "quiz",
        "answer",
        "explain",
        "usage",
        "next",
      ] as const;
      const dialog = { title: "完成したコード", code: ["const value = 1;"] };
      const video: BoardStoryboard = {
        ...storyboard,
        schema: 2,
        scenes: roles.map((role) => ({
          id: role,
          role,
          title: "説明",
          board: "main",
          beats: [
            role === "goal"
              ? { say: "コードを見ます。", show: ["read"], dialog }
              : { say: "読みます。", pulse: ["read"] },
          ],
        })),
      };
      writeFileSync(join(root, "video.json"), JSON.stringify(video));
      vi.mocked(collectNarrationTopics).mockReturnValue(topics.slice(0, 1));

      const window = {
        __setTime: async () => undefined,
        __busyRanges: [],
        __overflows: () => [],
      } as unknown as ScenePageWindow;
      const entry = {
        hidden: true,
        style: {},
        classList: { contains: () => true },
        querySelectorAll: () => [],
      };
      const overlay = { style: { opacity: "" }, children: [entry] };
      let activePage = false;
      page.goto.mockImplementation(async (url: string) => {
        const html = readFileSync(fileURLToPath(url), "utf8");
        const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(([, js]) =>
          js.includes("function beatOverlayRuntime("),
        )?.[1];
        activePage = !!script;
        if (!script) return;
        window.__setTime = async () => undefined;
        runInNewContext(script, {
          window,
          document: { getElementById: () => overlay },
        });
      });
      page.evaluate.mockImplementation(async (callback, time?: number) => {
        if (activePage && time !== undefined) await window.__setTime(time);
        return String(callback).includes("__overflows") ? [] : undefined;
      });
      const shots: string[] = [];
      page.screenshot.mockImplementation(async ({ path }) => {
        if (activePage && !entry.hidden && overlay.style.opacity === "1") shots.push(path);
        return Buffer.from("poster");
      });
      const out = join(root, "out");
      await buildSceneVideos(["fixture", "--stills", "--out", out]);
      expect(shots).toEqual([join(out, "fixture", "first", "stills", "scene-2-beat-1.png")]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it.each(["stills", "video"])("%s は figure の図解とイラストをコード場面に渡す", async (mode) => {
    const { root, page, storyboard, topics } = fixture();
    try {
      const video: VideoStoryboard = {
        ...storyboard,
        art: { price: { prompt: "お店の値札" } },
        boards: {
          ...storyboard.boards,
          shop: {
            cols: 2,
            rows: 1,
            nodes: [
              { id: "price", label: "商品の価格", at: [1, 1], art: "price" },
              { id: "total", label: "合計", at: [2, 1], icon: "file" },
            ],
            links: [{ id: "to-total", from: "price", to: "total", label: "値を渡す" }],
          },
        },
        scenes: [
          storyboard.scenes[0],
          {
            id: "code",
            kind: "code",
            role: "point",
            point: 1,
            title: "価格のコード",
            panel: { kind: "figure", board: "shop" },
            code: ["const price = 1;"],
            show: true,
            beats: [
              { say: "価格と合計を結びます。", figure: { show: ["price", "total", "to-total"] } },
            ],
          },
          {
            ...storyboard.scenes[2],
            reset: true,
            beats: [{ say: "読みます。", show: ["read"] }],
          },
        ],
      };
      writeFileSync(join(root, "video.json"), JSON.stringify(video));
      mkdirSync(join(root, "assets/art"), { recursive: true });
      const png = join(root, "assets/art/price.png");
      const bytes = Buffer.alloc(24);
      Buffer.from("89504e470d0a1a0a", "hex").copy(bytes);
      bytes.writeUInt32BE(400, 16);
      bytes.writeUInt32BE(300, 20);
      writeFileSync(png, bytes);
      vi.mocked(collectNarrationTopics).mockReturnValue(topics.slice(0, 1));
      vi.mocked(createTtsProvider).mockReturnValue(provider("cue"));
      vi.mocked(decodeTrimmedPcm).mockImplementation(async () => {
        const speech = vi.mocked(synthesizeCached).mock.calls.at(-1)?.[1] ?? "";
        return new Int16Array(Math.round(estimateSpeechSeconds(speech) * AUDIO_RATE)).fill(10000);
      });

      const figurePages: string[] = [];
      page.goto.mockImplementation(async (url: string) => {
        const html = readFileSync(fileURLToPath(url), "utf8");
        if (html.includes("figure-flow")) figurePages.push(html);
      });
      await buildSceneVideos([
        "fixture",
        "--out",
        join(root, "out"),
        ...(mode === "stills" ? ["--stills"] : ["--tts", "fake"]),
      ]);
      expect(figurePages.length).toBeGreaterThan(0);
      for (const html of figurePages) {
        expect(html).toContain("商品の価格");
        expect(html).toContain("値を渡す");
        expect(html).toContain(pathToFileURL(png).href);
      }
      if (mode === "video") expect(encodeScene).toHaveBeenCalledTimes(video.scenes.length + 1);
      else expect(synthesizeCached).not.toHaveBeenCalled();
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
        const synthesize = vi.fn(async (speech: string) => audioBytes(spokenPcm(speech)));
        vi.mocked(createTtsProvider).mockReturnValue({
          ...provider(name === "gemini" ? "topic" : "cue"),
          identity,
          synthesize,
        });
        const ttsCache = join(root, "tts-cache");
        if (name === "gemini") {
          const actual = await vi.importActual<typeof import("./lib/tts.js")>("./lib/tts.js");
          vi.mocked(synthesizeCached).mockImplementationOnce((voice, speech, _cache, refresh) =>
            actual.synthesizeCached(voice, speech, ttsCache, refresh),
          );
        }
        const decode = async () =>
          new Int16Array(
            Math.round(
              estimateSpeechSeconds(vi.mocked(synthesizeCached).mock.calls.at(-1)?.[1] ?? "") *
                AUDIO_RATE,
            ),
          ).fill(10000);
        vi.mocked(decodePcm).mockImplementation(async () =>
          spokenPcm(vi.mocked(synthesizeCached).mock.calls.at(-1)?.[1] ?? ""),
        );
        vi.mocked(decodeTrimmedPcm).mockImplementation(decode);
        await buildSceneVideos([
          "fixture",
          "--tts",
          name,
          "--refresh-audio",
          "title",
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
        ]);
        expect(report.scenes[0]).toMatchObject({ id: "title", startSec: 0, durationSec: 2.6 });
        expect(report.scenes[1].startSec).toBe(2.6);
        const encodes = vi.mocked(encodeScene).mock.calls;
        expect(encodes.slice(0, -1).every((call) => call[4] === undefined)).toBe(true);
        const lastFade = encodes.at(-1)?.[4];
        expect(lastFade?.duration).toBe(0.8);
        expect(lastFade?.start).toBeCloseTo(report.scenes.at(-1).durationSec - 0.8);
        expect(report.scenes.at(-1).id).toBe(storyboard.scenes.at(-1)?.id);
        expect(report.durationSec).toBeCloseTo(
          report.scenes.reduce((n: number, s: { durationSec: number }) => n + s.durationSec, 0),
        );
        const unit = name === "gemini" ? "topic" : "cue";
        const calls = vi.mocked(synthesizeCached).mock.calls;
        const planned = sceneTopicTtsSpeeches(topics[0], unit);
        expect(calls.map((call) => call[1])).toEqual(planned);
        expect(planned).toHaveLength(name === "gemini" ? 1 : storyboard.scenes.length + 1);
        expect(planned[0].split("\n\n")[0]).toBe(topics[0].title);
        expect(planned.join("\n\n")).not.toContain(
          "ウェブで読み、ブイエスコードで課題を書きます。",
        );
        expect(calls.map((call) => call[3])).toEqual(
          name === "gemini" ? [true] : [true, false, false, false],
        );
        if (name === "gemini") {
          expect(synthesize).toHaveBeenCalledExactlyOnceWith(planned[0]);
          const ttsPlan = [{ ...topics[0], kind: "scene" as const, speeches: planned }];
          expect(countTtsCalls(ttsPlan, identity, root).needed).toBe(1);
          expect(countTtsCalls(ttsPlan, identity, ttsCache).needed).toBe(0);
        }
        const wavs = vi
          .mocked(writeNarrationWav)
          .mock.calls.filter(([file]) => /audio-\d+\.wav$/.test(file));
        expect(wavs[0][2][0].startSec).toBe(0.6);
        expect(wavs.at(-1)?.[2][0].startSec).toBe(0.8);
        for (const call of wavs) expect(call[2][0].pcm.length).toBeGreaterThan(0);
        expect(toPosterJpeg).toHaveBeenCalledExactlyOnceWith(
          join(contentRoot, "dist/video-cache/scenes", report.scenes.at(-1).hash, "poster.png"),
          expect.stringContaining("poster.jpg"),
        );
        const out = join(root, "out/fixture/first");
        const captions = readFileSync(join(out, "captions.vtt"), "utf8");
        expect(captions).toMatch(/^WEBVTT\n\n1\n00:00:03.400 --> [^\n]+\n読みます。/);
        expect(captions.match(/ --> /g)).toHaveLength(storyboard.scenes.length);
        expect(captions).not.toContain(topics[0].title);
        expect(runFfmpeg).toHaveBeenCalledTimes(1);
        expect(encodeNarration).toHaveBeenCalledTimes(storyboard.scenes.length + 1);
        const sfxWavs = vi
          .mocked(writeNarrationWav)
          .mock.calls.filter(([file]) => /sfx-\d+\.wav$/.test(file));
        expect(sfxWavs).toHaveLength(1);
        for (const [i, call] of vi.mocked(encodeNarration).mock.calls.entries()) {
          const sfx = i === 0 ? sfxWavs[0] : undefined;
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
  it("暗い場面の字幕には印を付け、読み上げ用の文を字幕に含めない", async () => {
    const { root, topics, storyboard, page, browser } = fixture();
    try {
      const roles = [
        "goal",
        "example",
        "syntax",
        "apply",
        "quiz",
        "answer",
        "explain",
        "usage",
        "next",
      ] as const;
      const video: VideoStoryboard = {
        ...storyboard,
        schema: 2,
        art: {
          example: { prompt: "見本のイラスト", regions: { object: [0.1, 0.1, 0.2, 0.2] } },
        },
        scenes: roles.map((role) => {
          const base = { id: role, role, title: "説明" };
          if (role === "example")
            return {
              ...base,
              kind: "view",
              image: "art:example",
              beats: [{ say: "絵に注目してください。", spot: ["object"] }],
            };
          return {
            ...base,
            kind: "board",
            board: "main",
            beats: [
              role === "goal"
                ? {
                    say: "完成形を見ます。",
                    show: ["read"],
                    dialog: { title: "コードの例", code: ["const x = 1;"] },
                  }
                : role === "syntax"
                  ? {
                      say: "二つの値を比べます。",
                      speech: "順番を確かめます。",
                      term: { text: "比較", ruby: "ひかく" },
                    }
                  : { say: "要点を確かめます。", pulse: ["read"] },
            ],
          };
        }),
      };
      writeFileSync(join(root, "video.json"), JSON.stringify(video));
      mkdirSync(join(root, "assets/art"), { recursive: true });
      const image = Buffer.alloc(24);
      Buffer.from("89504e470d0a1a0a", "hex").copy(image);
      image.writeUInt32BE(400, 16);
      image.writeUInt32BE(300, 20);
      writeFileSync(join(root, "assets/art/example.png"), image);

      vi.mocked(collectNarrationTopics).mockReturnValue(topics.slice(0, 1));
      const voice = provider("cue");
      vi.mocked(createTtsProvider).mockReturnValue(voice);
      vi.mocked(decodeTrimmedPcm).mockImplementation(async () => {
        const speech = vi.mocked(synthesizeCached).mock.calls.at(-1)?.[1] ?? "";
        return new Int16Array(Math.round(estimateSpeechSeconds(speech) * AUDIO_RATE)).fill(10000);
      });
      const out = join(root, "out");
      await buildSceneVideos(["fixture", "--tts", "fake", "--out", out]);
      expect(runFfmpeg).toHaveBeenCalledTimes(1);
      expect(page.screenshot).not.toHaveBeenCalledWith(
        expect.objectContaining({ omitBackground: true }),
      );
      const keys = vi
        .mocked(synthesizeCached)
        .mock.calls.map(([tts, speech]) => cueHash(tts.identity, speech));
      expect(keys).toContain(cueHash("fixture", "順番を確かめます。"));
      expect(browser.newContext).toHaveBeenLastCalledWith({
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
      });
      const captions = readFileSync(join(out, "fixture/first/captions.vtt"), "utf8");
      expect(captions.match(/<c\.on-dark>/g)).toHaveLength(3);
      expect(captions).toContain("<c.on-dark>二つの値を比べます。</c>");
      expect(captions).not.toContain("順番を確かめます。");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);

  it("schema 2 のタイトル直後と、状態が変わる文の効果音をミックスに渡す", async () => {
    const { root, topics, storyboard } = fixture();
    try {
      const roles = [
        "goal",
        "example",
        "syntax",
        "apply",
        "quiz",
        "answer",
        "explain",
        "usage",
        "next",
      ] as const;
      const video: BoardStoryboard = {
        ...storyboard,
        schema: 2,
        scenes: roles.map((role) => ({
          id: role,
          role,
          title: "説明",
          board: "main",
          beats: [
            role === "goal"
              ? { say: "読みます。", show: ["read"] }
              : role === "answer"
                ? { say: "正解です。", mark: [{ on: "read", kind: "check" }] }
                : { say: "読みます。", pulse: ["read"] },
          ],
        })),
      };
      writeFileSync(join(root, "video.json"), JSON.stringify(video));
      vi.mocked(collectNarrationTopics).mockReturnValue(topics.slice(0, 1));
      vi.mocked(createTtsProvider).mockReturnValue(provider("cue"));
      vi.mocked(decodeTrimmedPcm).mockImplementation(async () => {
        const speech = vi.mocked(synthesizeCached).mock.calls.at(-1)?.[1] ?? "";
        return new Int16Array(Math.round(estimateSpeechSeconds(speech) * AUDIO_RATE)).fill(10000);
      });
      await buildSceneVideos(["fixture", "--tts", "fake", "--out", join(root, "out")]);
      const tracks = vi
        .mocked(writeNarrationWav)
        .mock.calls.filter(([file]) => /sfx-\d+\.wav$/.test(file))
        .map(([, , placements]) => placements[0].pcm);
      expect(tracks).toHaveLength(video.scenes.length + 1);
      for (const [index, kind, at] of [
        [0, "title", 0.1],
        [1, "scene", 0],
        [5, "quiz", 0],
        [6, "correct", 0.8],
      ] as const) {
        const expected = synthesizeSceneSfx(kind, AUDIO_RATE);
        const start = Math.round(at * AUDIO_RATE);
        const actual = tracks[index].subarray(start, start + expected.length);
        expect(actual.subarray(0, Math.min(expected.length, AUDIO_RATE * 0.8))).toEqual(
          expected.subarray(0, Math.min(expected.length, AUDIO_RATE * 0.8)),
        );
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("配信用の計画にもtakeawayの変更を反映する", () => {
    const { root, topics } = fixture();
    try {
      const before = planSceneTopic(topics[0], "fixture");
      expect(
        planSceneTopic({ ...topics[0], takeaway: "確認して提出します。" }, "fixture"),
      ).not.toBe(before);
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
  await topicAudio([singleBeat], {}, provider("topic"), "/tmp/fixture-cache");
  expect(vi.mocked(synthesizeCached).mock.calls.map((call) => call[3])).toEqual([false, true]);
});

for (const unit of ["topic", "cue"] as const)
  it(`refresh 指定後に長さが異常なら ${unit} の provider を本当に2回呼ぶ`, async () => {
    const root = mkdtempSync(join(tmpdir(), "stella-refresh-retry-"));
    const original = await vi.importActual<typeof import("./lib/tts.js")>("./lib/tts.js");
    const mocked = vi.mocked(synthesizeCached).getMockImplementation();
    try {
      vi.mocked(synthesizeCached).mockImplementation(original.synthesizeCached);
      const single = { ...scene, beats: [scene.beats[0]] };
      const decode = unit === "topic" ? vi.mocked(decodePcm) : vi.mocked(decodeTrimmedPcm);
      decode.mockResolvedValueOnce(new Int16Array(10)).mockResolvedValueOnce(pcmFor(single));
      const synthesize = vi.fn(async () => ({ bytes: new Uint8Array([1]), ext: "wav" as const }));
      const tts = { ...provider(unit), nondeterministic: true, synthesize };
      await topicAudio([single], {}, tts, root, [single.id]);
      expect(synthesize).toHaveBeenCalledTimes(2);
    } finally {
      if (mocked) vi.mocked(synthesizeCached).mockImplementation(mocked);
      rmSync(root, { recursive: true, force: true });
    }
  });

it("--topics を読み、知らない ID と動画の対象でない ID はブラウザの前に拒む", async () => {
  expect(argumentsOf(["stage", "--topics", "1-1-9,1-2-3"]).topicIds).toEqual(["1-1-9", "1-2-3"]);
  expect(argumentsOf(["stage"]).topicIds).toBeNull();
  vi.mocked(collectNarrationTopics).mockReturnValue([
    { id: "1-1-9", topicDir: "/tmp/stella-no-video", stageSlug: "stage" } as ReturnType<
      typeof collectNarrationTopics
    >[number],
  ]);
  await expect(buildSceneVideos(["stage", "--topics", "missing"])).rejects.toThrow(
    "トピックが見つかりません: missing",
  );
  await expect(buildSceneVideos(["stage", "--topics", "1-1-9"])).rejects.toThrow(
    "動画の対象ではありません: 1-1-9",
  );
  expect(chromium.launch).not.toHaveBeenCalled();
  expect(synthesizeCached).not.toHaveBeenCalled();
});
