import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sayHash, type PolishResponse } from "../src/video-polish.js";
import type { BoardStoryboard } from "../src/video-storyboard.js";

const fixture = vi.hoisted(() => ({
  root: "",
  topics: [] as { stageSlug: string; id: string; topicDir: string }[],
}));
vi.mock("node:child_process", async (original) => ({
  ...(await original<typeof import("node:child_process")>()),
  execFileSync: vi.fn(),
}));
vi.mock("./lib/narration-topics.js", () => ({
  get contentRoot() {
    return fixture.root;
  },
  collectNarrationTopics: () => fixture.topics,
}));
import { polishVideo } from "./polish-video.js";

const sample = JSON.parse(
  readFileSync(new URL("../src/__fixtures__/board-video.json", import.meta.url), "utf8"),
) as BoardStoryboard;
const root = mkdtempSync(join(tmpdir(), "stella-polish-test-"));
const guide = readFileSync(new URL("../VIDEO_GUIDE.md", import.meta.url), "utf8");
const video = join(root, "topic/video.json"),
  report = join(root, "dist/video-polish/fixture/topic.json");
const readVideo = () => JSON.parse(readFileSync(video, "utf8")) as BoardStoryboard;
const readReport = () => JSON.parse(readFileSync(report, "utf8"));
const readMarkdown = () => readFileSync(report.replace(/\.json$/, ".md"), "utf8");
const keepLines = sample.scenes.flatMap((s) =>
  s.beats.map((_, i) => ({
    id: `${s.id}#${i + 1}`,
    verdict: "keep" as const,
    kinds: [],
    reason: "修正不要です",
  })),
);
const usageMetadata = {
  promptTokenCount: 2000,
  cachedContentTokenCount: 1000,
  candidatesTokenCount: 900,
  thoughtsTokenCount: 2000,
  totalTokenCount: 4900,
};
let response: PolishResponse;
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.mocked(execFileSync).mockReset().mockReturnValue(Buffer.alloc(0));
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  fixture.root = root;
  fixture.topics = [{ stageSlug: "fixture", id: "topic", topicDir: join(root, "topic") }];
  mkdirSync(join(root, "topic"), { recursive: true });
  rmSync(join(root, "dist"), { recursive: true, force: true });
  writeFileSync(video, JSON.stringify(sample, null, 2) + "\n");
  writeFileSync(join(root, "VIDEO_GUIDE.md"), guide);
  response = {
    summary: "簡潔な台本です。文を短くできます。",
    lines: keepLines.slice(0, 2).map((line) => ({ ...line })),
    missing: [],
    offPoint: [],
  };
  response.lines[0] = {
    ...response.lines[0],
    verdict: "rewrite",
    rewrite: "学ぶ場所を見てみましょう。",
    kinds: ["wordy"],
  };
  response.lines[1] = {
    ...response.lines[1],
    verdict: "rewrite",
    rewrite: "学ぶ順番を見てみましょう。",
    kinds: ["wordy"],
  };
  fetchMock = vi.fn(async () =>
    Response.json({
      candidates: [
        { content: { parts: [{ text: "途中の本文" }, { text: JSON.stringify(response) }] } },
      ],
      usageMetadata,
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("VIDEO_POLISH_MODEL", "fixture-model");
  vi.stubEnv("VIDEO_POLISH_THINKING", undefined);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("video:polish の取得と保存済みの案の反映", () => {
  it.each([
    { env: undefined, args: [], model: "gemini-4-neon" },
    { env: "env-model", args: [], model: "env-model" },
    { env: "env-model", args: ["--model", "cli-model"], model: "cli-model" },
  ])("$model で校正を始め、通信を600秒で打ち切る", async ({ env, args, model }) => {
    vi.stubEnv("VIDEO_POLISH_MODEL", env);
    const timeout = vi.spyOn(AbortSignal, "timeout");
    await polishVideo(["fixture", ...args]);
    expect(console.info).toHaveBeenNthCalledWith(
      1,
      `${model} で読み上げ文を校正します。数分かかることがあります。`,
    );
    expect(timeout).toHaveBeenCalledExactlyOnceWith(600_000);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      expect.objectContaining({ signal: timeout.mock.results[0].value }),
    );
  });

  it.each([
    { env: undefined, args: [], thinkingLevel: "low" },
    { env: "medium", args: [], thinkingLevel: "medium" },
    { env: "high", args: ["--thinking", "minimal"], thinkingLevel: "minimal" },
  ])("thinkingConfig に $thinkingLevel を送る", async ({ env, args, thinkingLevel }) => {
    vi.stubEnv("VIDEO_POLISH_THINKING", env);
    await polishVideo(["fixture", ...args]);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel });
  });

  it("不正な thinking の環境変数・引数や値のない引数は、取得前にエラーにする", async () => {
    vi.stubEnv("VIDEO_POLISH_THINKING", "unexpected");
    await expect(polishVideo(["fixture"])).rejects.toThrow("考える量");
    vi.stubEnv("VIDEO_POLISH_THINKING", "low");
    await expect(polishVideo(["fixture", "--thinking", "unexpected"])).rejects.toThrow("考える量");
    await expect(polishVideo(["fixture", "--thinking"])).rejects.toThrow("--thinking");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("使用量を報告に残し、キャッシュと考えた量を含む料金を動画ごとと合計で表示する", async () => {
    const otherDir = join(root, "other");
    mkdirSync(otherDir, { recursive: true });
    writeFileSync(join(otherDir, "video.json"), JSON.stringify(sample));
    fixture.topics.push({ stageSlug: "fixture", id: "other", topicDir: otherDir });
    await polishVideo(["fixture", "--model", "gemini-4-neon"]);
    const line = "入力 2000 (うちキャッシュ 1000)・出力 900・考えた量 2000 トークン、目安 $0.05";
    expect(readReport().usage).toEqual(usageMetadata);
    expect(readMarkdown()).toContain(line);
    expect(console.info).toHaveBeenNthCalledWith(2, expect.stringContaining(line));
    expect(console.info).toHaveBeenNthCalledWith(3, expect.stringContaining(line));
    expect(console.info).toHaveBeenLastCalledWith(
      "合計 (2 本) 入力 4000 (うちキャッシュ 2000)・出力 1800・考えた量 4000 トークン、目安 $0.09",
    );
  });

  it("使用量の欠けた項目を0にし、単価表に無いモデルでは金額を不明と表示する", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify(response) }] } }],
        usageMetadata: { promptTokenCount: 42 },
      }),
    );
    await polishVideo(["fixture"]);
    expect(readReport().usage).toEqual({
      promptTokenCount: 42,
      cachedContentTokenCount: 0,
      candidatesTokenCount: 0,
      thoughtsTokenCount: 0,
      totalTokenCount: 0,
    });
    expect(readMarkdown()).toContain(
      "入力 42 (うちキャッシュ 0)・出力 0・考えた量 0 トークン、目安 不明",
    );
  });

  it("残高切れでは本文の理由を示し、再試行しない", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ error: { message: "prepayment credits are depleted" } }, { status: 402 }),
    );
    await expect(polishVideo(["fixture"])).rejects.toThrow(
      /Gemini API の残高がありません.*prepayment credits are depleted.*--tts openjtalk/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("取得時は本文を保ちハッシュを保存し、反映時はAPIを呼ばず読んだ案を反映する", async () => {
    await polishVideo(["fixture", "--model", "gemini-4-argon"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(readVideo().scenes).toEqual(sample.scenes);
    const saved = readFileSync(report, "utf8");
    expect(readReport()).toMatchObject({
      sayHash: sayHash(sample),
      model: "gemini-4-argon",
      response,
    });
    expect(readMarkdown()).toContain(response.summary);
    expect(readMarkdown()).toContain(`そのままの文: ${keepLines.length - 2} 文`);
    expect(readMarkdown()).not.toContain(`| ${keepLines[2].id} |`);
    expect(readMarkdown()).toContain("| hook#1 |");
    expect(readMarkdown()).toContain("## missing");
    expect(readMarkdown()).toContain("## offPoint");
    fetchMock.mockClear();
    vi.mocked(console.info).mockClear();
    vi.stubEnv("GEMINI_API_KEY", "");
    // 次の応答が違っても、反映には保存済みの案だけを使う。
    response.lines[0].rewrite = "別の案です。";
    await polishVideo(["fixture", "--apply", "--model", "unused-model"]);
    expect(fetchMock).not.toHaveBeenCalled();
    const result = readVideo();
    expect(result.scenes[0].beats[0].say).toBe("学ぶ場所を見てみましょう。");
    expect(result.scenes[0].beats[1].say).toBe("学ぶ順番を見てみましょう。");
    expect(result.polish).toEqual({ model: "gemini-4-argon", sayHash: sayHash(result) });
    expect(readFileSync(report, "utf8")).toBe(saved);
    const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
    expect(execFileSync).toHaveBeenCalledTimes(2);
    expect(execFileSync).toHaveBeenLastCalledWith(
      join(repoRoot, "node_modules/.bin/biome"),
      ["format", "--write", video],
      { cwd: repoRoot, shell: false, stdio: "pipe" },
    );
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledTimes(1);
    expect(console.info).toHaveBeenLastCalledWith(expect.stringContaining("反映しました"));
  });
  it("全idとkeepを含む旧報告を読み、保存済みの言い換えだけを反映する", async () => {
    mkdirSync(join(root, "dist/video-polish/fixture"), { recursive: true });
    writeFileSync(
      report,
      JSON.stringify({
        model: "gemini-4-neon",
        sayHash: sayHash(sample),
        response: { ...response, lines: [...response.lines, ...keepLines.slice(2)] },
      }),
    );
    await polishVideo(["fixture", "--apply"]);
    expect(fetchMock).not.toHaveBeenCalled();
    const expected = structuredClone(sample);
    expected.scenes[0].beats[0].say = response.lines[0].rewrite as string;
    expected.scenes[0].beats[1].say = response.lines[1].rewrite as string;
    expect(readVideo().scenes).toEqual(expected.scenes);
    expect(console.info).toHaveBeenLastCalledWith(expect.stringContaining("反映しました"));
  });
  for (const [name, failure] of [
    ["Biomeがない", Object.assign(new Error("not found"), { code: "ENOENT" })],
    ["Biomeが失敗した", Object.assign(new Error("format failed"), { status: 1 })],
  ] as const)
    it(`${name}場合も書き戻しを残して警告する`, async () => {
      await polishVideo(["fixture"]);
      vi.mocked(execFileSync).mockImplementation(() => {
        throw failure;
      });
      await expect(polishVideo(["fixture", "--apply"])).resolves.toBeUndefined();
      const result = readVideo();
      expect(result.scenes[0].beats[0].say).toBe("学ぶ場所を見てみましょう。");
      expect(result.polish?.sayHash).toBe(sayHash(result));
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("bun run lint の前に整形してください"),
      );
    });
  it("書き戻したJSONをBiomeに渡し、整形後も内容と校正ハッシュを保つ", async () => {
    vi.mocked(execFileSync).mockImplementation((_command, args) => {
      expect(args).toEqual(["format", "--write", video]);
      const result = readVideo();
      expect(result.polish?.sayHash).toBe(sayHash(result));
      // 子プロセスの代わりに整形によるバイト列の変更を模擬する。
      writeFileSync(video, JSON.stringify(result) + "\n");
      return Buffer.alloc(0);
    });
    await polishVideo(["fixture"]);
    expect(readVideo().scenes).toEqual(sample.scenes);
    expect(readVideo().polish?.sayHash).toBe(sayHash(readVideo()));
    expect(readFileSync(video, "utf8")).not.toContain("\n  ");
  });
  it("報告がない・壊れている・ハッシュがない場合は案の取得を案内し、更新しない", async () => {
    const source = readFileSync(video, "utf8");
    for (const value of [undefined, "not json", JSON.stringify({ model: "old", response })]) {
      if (value !== undefined) {
        mkdirSync(join(root, "dist/video-polish/fixture"), { recursive: true });
        writeFileSync(report, value);
      }
      await expect(polishVideo(["fixture", "--apply"])).rejects.toThrow(
        "先に video:polish を実行してください",
      );
      expect(readFileSync(video, "utf8")).toBe(source);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("sayまたはspeechの変更でハッシュが違えば反映しない", async () => {
    await polishVideo(["fixture"]);
    fetchMock.mockClear();
    for (const field of ["say", "speech"] as const) {
      const changed = structuredClone(sample);
      changed.scenes[0].beats[0][field] = "変更した文です。";
      const source = JSON.stringify(changed);
      writeFileSync(video, source);
      await expect(polishVideo(["fixture", "--apply"])).rejects.toThrow(
        "先に video:polish を実行してください",
      );
      expect(readFileSync(video, "utf8")).toBe(source);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
  for (const option of ["--only", "--skip"])
    it(`${option}で文を選び、外した理由を表示する`, async () => {
      await polishVideo(["fixture"]);
      fetchMock.mockClear();
      await polishVideo(["fixture", "--apply", option, "hook#2"]);
      const result = readVideo();
      expect(result.scenes[0].beats[0].say).toBe(
        option === "--only" ? sample.scenes[0].beats[0].say : "学ぶ場所を見てみましょう。",
      );
      expect(result.scenes[0].beats[1].say).toBe(
        option === "--only" ? "学ぶ順番を見てみましょう。" : sample.scenes[0].beats[1].say,
      );
      expect(console.info).toHaveBeenLastCalledWith(
        expect.stringContaining(option === "--only" ? "--only の対象外" : "--skip で除外"),
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  it("知らないid・両方指定・applyなしの選択を拒む", async () => {
    await polishVideo(["fixture"]);
    fetchMock.mockClear();
    const source = readFileSync(video, "utf8");
    for (const args of [
      ["--apply", "--only", "unknown#1"],
      ["--apply", "--skip", "unknown#1"],
      ["--apply", "--only", "hook#1", "--skip", "hook#2"],
      ["--only", "hook#1"],
      ["--apply", "--skip", ""],
      ["--apply", "--only", "hook#1,"],
    ]) {
      await expect(polishVideo(["fixture", ...args])).rejects.toThrow();
      expect(readFileSync(video, "utf8")).toBe(source);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("選択しても機械的に弾かれた案やcutは反映しない", async () => {
    response.lines[0].rewrite = "987回です。";
    response.lines[1].verdict = "cut";
    await polishVideo(["fixture"]);
    fetchMock.mockClear();
    await polishVideo(["fixture", "--apply", "--only", "hook#1,hook#2"]);
    expect(readVideo().scenes).toEqual(sample.scenes);
    expect(console.info).toHaveBeenLastCalledWith(expect.stringContaining("反映しません"));
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("dry-runは送信内容を表示し、applyと一緒なら反映予定だけを表示する", async () => {
    const source = readFileSync(video, "utf8");
    await polishVideo(["fixture", "--dry-run", "--thinking", "high"]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(execFileSync).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledTimes(1);
    expect(console.info).toHaveBeenLastCalledWith(expect.stringContaining("SYSTEM"));
    expect(console.info).toHaveBeenLastCalledWith(expect.stringContaining("thinking: high"));
    expect(console.info).toHaveBeenLastCalledWith(expect.stringContaining("## 書く順番"));
    expect(console.info).toHaveBeenLastCalledWith(expect.not.stringContaining("効果音"));
    expect(readFileSync(video, "utf8")).toBe(source);
    await polishVideo(["fixture"]);
    fetchMock.mockClear();
    const polished = readFileSync(video, "utf8");
    vi.mocked(execFileSync).mockClear();
    await polishVideo(["fixture", "--apply", "--dry-run"]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(execFileSync).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenLastCalledWith(expect.stringContaining("反映予定"));
    expect(readFileSync(video, "utf8")).toBe(polished);
  });
  it("複数対象で知らないidや古い報告があれば、どの文も先に反映しない", async () => {
    await polishVideo(["fixture"]);
    const otherDir = join(root, "other");
    mkdirSync(otherDir, { recursive: true });
    writeFileSync(join(otherDir, "video.json"), JSON.stringify(sample));
    fixture.topics.push({ stageSlug: "fixture", id: "other", topicDir: otherDir });
    fetchMock.mockClear();
    const source = readFileSync(video, "utf8");
    await expect(polishVideo(["fixture", "--apply"])).rejects.toThrow(
      "先に video:polish を実行してください",
    );
    expect(readFileSync(video, "utf8")).toBe(source);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
