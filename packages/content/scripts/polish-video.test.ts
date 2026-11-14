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
const video = join(root, "topic/video.json"),
  report = join(root, "dist/video-polish/fixture/topic.json");
const readVideo = () => JSON.parse(readFileSync(video, "utf8")) as BoardStoryboard;
const readReport = () => JSON.parse(readFileSync(report, "utf8"));
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
  writeFileSync(join(root, "VIDEO_GUIDE.md"), "テスト用ガイド");
  response = {
    summary: "簡潔な台本です。文を短くできます。",
    lines: sample.scenes.flatMap((s) =>
      s.beats.map((_, i) => ({
        id: `${s.id}#${i + 1}`,
        verdict: "keep" as const,
        kinds: [],
        reason: "修正不要です",
      })),
    ),
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
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("VIDEO_POLISH_MODEL", "fixture-model");
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("video:polish の取得と保存済みの案の反映", () => {
  it("取得時は本文を保ちハッシュを保存し、反映時はAPIを呼ばず読んだ案を反映する", async () => {
    await polishVideo(["fixture", "--model", "chosen-model"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(readVideo().scenes).toEqual(sample.scenes);
    const saved = readFileSync(report, "utf8");
    expect(readReport()).toMatchObject({
      sayHash: sayHash(sample),
      model: "chosen-model",
      response,
    });
    expect(readFileSync(report.replace(/\.json$/, ".md"), "utf8")).toContain(response.summary);
    fetchMock.mockClear();
    vi.stubEnv("GEMINI_API_KEY", "");
    // 次の応答が違っても、反映には保存済みの案だけを使う。
    response.lines[0].rewrite = "別の案です。";
    await polishVideo(["fixture", "--apply", "--model", "unused-model"]);
    expect(fetchMock).not.toHaveBeenCalled();
    const result = readVideo();
    expect(result.scenes[0].beats[0].say).toBe("学ぶ場所を見てみましょう。");
    expect(result.scenes[0].beats[1].say).toBe("学ぶ順番を見てみましょう。");
    expect(result.polish).toEqual({ model: "chosen-model", sayHash: sayHash(result) });
    expect(readFileSync(report, "utf8")).toBe(saved);
    const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
    expect(execFileSync).toHaveBeenCalledTimes(2);
    expect(execFileSync).toHaveBeenLastCalledWith(
      join(repoRoot, "node_modules/.bin/biome"),
      ["format", "--write", video],
      { cwd: repoRoot, shell: false, stdio: "pipe" },
    );
    expect(console.warn).not.toHaveBeenCalled();
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
    await polishVideo(["fixture", "--dry-run"]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(execFileSync).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenLastCalledWith(expect.stringContaining("SYSTEM"));
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
