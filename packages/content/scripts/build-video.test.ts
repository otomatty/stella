import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("playwright", () => ({ chromium: { launch: vi.fn() } }));
vi.mock("../src/material-pdf.js", () => ({ collectPdfTargets: vi.fn(() => []) }));
vi.mock("./lib/narration-topics.js", async (original) => ({
  ...(await original<typeof import("./lib/narration-topics.js")>()),
  collectNarrationTopics: vi.fn(),
  validateTopic: vi.fn(() => []),
}));
vi.mock("./lib/ffmpeg.js", async (original) => ({
  ...(await original<typeof import("./lib/ffmpeg.js")>()),
  ffmpegVersion: vi.fn(async () => "fixture ffmpeg"),
}));
vi.mock("./build-scene-video.js", async (original) => ({
  ...(await original<typeof import("./build-scene-video.js")>()),
  buildSceneTopic: vi.fn(),
}));
vi.mock("./lib/tts.js", async (original) => ({
  ...(await original<typeof import("./lib/tts.js")>()),
  synthesizeCached: vi.fn(),
}));
import { chromium } from "playwright";
import { buildVideos } from "./build-video.js";
import { buildSceneTopic } from "./build-scene-video.js";
import { collectNarrationTopics, type NarrationTopic } from "./lib/narration-topics.js";
import { collectPdfTargets } from "../src/material-pdf.js";
import { videoSceneHash } from "../src/material-video.js";
import { synthesizeCached, QuotaExhaustedError } from "./lib/tts.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots.length = 0;
  vi.clearAllMocks();
  vi.mocked(collectPdfTargets).mockReturnValue([]);
  vi.unstubAllEnvs();
});
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "stella-video-plan-"));
  roots.push(root);
  writeFileSync(
    join(root, "video.json"),
    readFileSync(new URL("../src/__fixtures__/board-video.json", import.meta.url)),
  );
  // 新方式では screen の一部と壊れた旧台本があっても方式を切り替えない。
  writeFileSync(join(root, "screen.mp4"), "material");
  const topic = {
    topicDir: root,
    stageSlug: "fixture",
    id: "first",
    title: "動画",
    takeaway: "動画で流れを確かめます。",
    readings: {},
    parseError: "旧台本が不正",
  } as NarrationTopic;
  vi.mocked(collectNarrationTopics).mockReturnValue([topic]);
  return { root, topic };
}
it("video.json だけのトピックもplanに入り、台帳のskipならブラウザも生成も使わない", async () => {
  const { root } = fixture();
  const skip = vi.fn(() => true);
  const result = await buildVideos(["fixture", "--tts", "fake", "--out", join(root, "out")], skip);
  expect(skip).toHaveBeenCalledExactlyOnceWith({
    stageSlug: "fixture",
    id: "first",
    sourceHash: expect.stringMatching(/^[a-f0-9]{32}$/),
  });
  expect(collectNarrationTopics).toHaveBeenCalledWith(["fixture"]);
  expect(result).toEqual({ reports: [], failures: [] });
  expect(chromium.launch).not.toHaveBeenCalled();
  expect(buildSceneTopic).not.toHaveBeenCalled();
});
it("素材・絵コンテの不正はそのトピックだけ失敗し、次のplanを照合する", async () => {
  const { root, topic } = fixture();
  const bad = mkdtempSync(join(tmpdir(), "stella-video-invalid-"));
  roots.push(bad);
  writeFileSync(join(bad, "video.json"), "{}");
  vi.mocked(collectNarrationTopics).mockReturnValue([
    { ...topic, id: "bad", topicDir: bad },
    topic,
  ]);
  const skip = vi.fn(() => true);
  const result = await buildVideos(["--tts", "fake", "--out", join(root, "out")], skip);
  expect(result.failures).toEqual([
    expect.objectContaining({ id: "bad", reason: expect.any(String) }),
  ]);
  expect(skip).toHaveBeenCalledOnce();
});
it("日次上限の後は次の新方式トピックを生成せず、両方をfailuresに載せる", async () => {
  const { root, topic } = fixture();
  vi.mocked(collectNarrationTopics).mockReturnValue([topic, { ...topic, id: "second" }]);
  const close = vi.fn();
  vi.mocked(chromium.launch).mockResolvedValue({ close } as unknown as Awaited<
    ReturnType<typeof chromium.launch>
  >);
  vi.mocked(buildSceneTopic).mockRejectedValueOnce(new QuotaExhaustedError("daily quota"));
  const result = await buildVideos(["--tts", "fake", "--out", join(root, "out")]);
  expect(buildSceneTopic).toHaveBeenCalledOnce();
  expect(result.failures.map((f) => f.id)).toEqual(["first", "second"]);
  expect(close).toHaveBeenCalledOnce();
});
it("公開用のモデルの上書きは引数・環境変数とも拒む", async () => {
  await expect(buildVideos(["--tts-model", "alternate"])).rejects.toThrow("--tts-model");
  vi.stubEnv("VIDEO_TTS_MODEL", "alternate");
  await expect(buildVideos([])).rejects.toThrow("VIDEO_TTS_MODEL");
});

it("新方式の上限は後続のスライド版の音声合成も止める", async () => {
  const { root, topic } = fixture();
  const legacyDir = join(root, "legacy");
  mkdirSync(legacyDir);
  const narrationFile = join(legacyDir, "narration.json");
  writeFileSync(narrationFile, "{}");
  const legacy: NarrationTopic = {
    ...topic,
    id: "legacy",
    topicDir: legacyDir,
    narrationFile,
    parseError: undefined,
    narration: { schema: 1, slidesHash: "fixture", slides: [{ cues: [{ text: "読みます。" }] }] },
  };
  vi.mocked(collectNarrationTopics).mockReturnValue([topic, legacy]);
  vi.mocked(collectPdfTargets).mockReturnValue([
    {
      kind: "slides",
      stageSlug: "fixture",
      lessonId: "legacy",
      courseTitle: "fixture",
      source: "slide",
      assets: [],
    } as unknown as ReturnType<typeof collectPdfTargets>[number],
  ]);
  vi.mocked(chromium.launch).mockResolvedValue({ close: vi.fn() } as unknown as Awaited<
    ReturnType<typeof chromium.launch>
  >);
  vi.mocked(buildSceneTopic).mockRejectedValueOnce(new QuotaExhaustedError("daily quota"));
  const result = await buildVideos(["--tts", "fake", "--out", join(root, "out")]);
  expect(result.failures.map((f) => f.id)).toEqual(["first", "legacy"]);
  expect(synthesizeCached).not.toHaveBeenCalled();
});
it("新方式の成功を配信のreportに載せ、出力が同じなら次回の生成を省く", async () => {
  const { root } = fixture();
  const { scenes, boards } = JSON.parse(readFileSync(join(root, "video.json"), "utf8"));
  const close = vi.fn();
  vi.mocked(chromium.launch).mockResolvedValue({ close } as unknown as Awaited<
    ReturnType<typeof chromium.launch>
  >);
  vi.mocked(buildSceneTopic).mockImplementationOnce(async (_browser, options, topic) => {
    const base = join(options.out, topic.stageSlug, topic.id);
    mkdirSync(base, { recursive: true });
    for (const file of ["video.mp4", "poster.jpg", "captions.vtt"])
      writeFileSync(join(base, file), "fixture");
    return {
      generatorVersion: 1,
      ttsIdentity: "fake",
      durationSec: 90,
      probedDurationSec: 90,
      scenes: [
        { id: "title", startSec: 0, durationSec: 2.6, hash: "cache-title" },
        { id: "hook", startSec: 2.6, durationSec: 3.1259, hash: "cache-hook" },
      ],
      loudness: { integratedLufs: -16, truePeakDb: -3 },
      warnings: [],
    };
  });
  const args = ["--tts", "fake", "--out", join(root, "out")];
  const result = await buildVideos(args);
  expect(result.failures).toEqual([]);
  expect(result.reports).toEqual([
    expect.objectContaining({
      stageSlug: "fixture",
      id: "first",
      durationSec: 90,
      sourceHash: expect.stringMatching(/^[a-f0-9]{32}$/),
      videoScenes: [
        {
          id: "hook",
          startSec: 2.6,
          durationSec: 3.126,
          hash: videoSceneHash({
            definition: scenes[0],
            board: boards[scenes[0].board],
            assets: {},
          }),
        },
      ],
    }),
  ]);
  const again = await buildVideos(args);
  expect(again.reports).toEqual(result.reports);
  expect(buildSceneTopic).toHaveBeenCalledOnce();
  expect(chromium.launch).toHaveBeenCalledOnce();
  expect(close).toHaveBeenCalledOnce();
});

for (const phase of ["生成前", "生成後"] as const)
  it(`計画後に絵コンテが変われば${phase}にトピックを失敗にする`, async () => {
    const { root } = fixture();
    const change = () => {
      const file = join(root, "video.json");
      const json = JSON.parse(readFileSync(file, "utf8"));
      json.scenes[0].beats[0].say = "内容を変えます。";
      writeFileSync(file, JSON.stringify(json));
    };
    vi.mocked(chromium.launch).mockResolvedValue({ close: vi.fn() } as unknown as Awaited<
      ReturnType<typeof chromium.launch>
    >);
    if (phase === "生成後")
      vi.mocked(buildSceneTopic).mockImplementationOnce(async () => {
        change();
        return {
          generatorVersion: 1,
          ttsIdentity: "fake",
          durationSec: 90,
          probedDurationSec: 90,
          scenes: [],
          loudness: { integratedLufs: -16, truePeakDb: -3 },
          warnings: [],
        };
      });
    const result = await buildVideos(["--tts", "fake", "--out", join(root, "out")], () => {
      if (phase === "生成前") change();
      return false;
    });
    expect(result.reports).toEqual([]);
    expect(result.failures).toEqual([
      expect.objectContaining({
        id: "first",
        reason: `動画の入力が計画後に変わりました (${phase})`,
      }),
    ]);
    if (phase === "生成前") expect(buildSceneTopic).not.toHaveBeenCalled();
    else expect(buildSceneTopic).toHaveBeenCalledOnce();
  });
