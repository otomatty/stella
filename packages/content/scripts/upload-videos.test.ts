import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";

const { put, get, buildVideos } = vi.hoisted(() => ({
  put: vi.fn(async (_key: string, _body: Uint8Array, _contentType: string) => undefined),
  get: vi.fn(async (): Promise<Uint8Array | null> => null),
  buildVideos: vi.fn(),
}));

vi.mock("./lib/r2.js", () => ({
  createR2Client: vi.fn(() => ({
    get,
    put,
    putFile: vi.fn(),
    remove: vi.fn(),
  })),
  putAll: vi.fn(),
}));

vi.mock("./build-video.js", async (original) => {
  const actual = await original<typeof import("./build-video.js")>();
  return { ...actual, buildVideos };
});

import { videoKeyHash, videoKeys, videoManifestKey } from "../src/material-video.js";
import { createR2Client, putAll } from "./lib/r2.js";
import { createTtsProvider } from "./lib/tts.js";
import {
  assessVideoTtsBudget,
  uploadVideos,
  videoTtsDecision,
  type VideoTtsBudget,
} from "./upload-videos.js";
import type { PendingVideoTts } from "./build-video.js";

const manifest = join(import.meta.dirname, "../dist/video-manifest.json");

afterEach(() => {
  buildVideos.mockReset();
  put.mockReset();
  vi.mocked(putAll).mockClear();
  vi.useRealTimers();
  get.mockReset();
  get.mockResolvedValue(null);
  vi.mocked(createR2Client).mockClear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  rmSync(manifest, { force: true });
  delete process.env.VIDEO_TTS_MODEL;
  delete process.env.GITHUB_STEP_SUMMARY;
});

function targets(speeches: string[]): PendingVideoTts[] {
  return [
    {
      stageSlug: "dev-env-basics",
      id: "1-1-9",
      sourceHash: "hash",
      kind: "scene",
      speeches,
    },
  ];
}

const budget = (needed: number): VideoTtsBudget => ({
  day: "2026-11-23",
  limit: 100,
  used: 100 - 1,
  remaining: 1,
  needed,
  topics: [],
});

it("残り以下なら作り、dry-run は上限を超えても止めない", () => {
  expect(videoTtsDecision(budget(1), false)).toBe("run");
  expect(videoTtsDecision(budget(2), false)).toBe("stop");
  expect(videoTtsDecision(budget(2), true)).toBe("dry-run");
});

it("上限を超えると 1 本も作らず R2 に書かない", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("VIDEO_TTS_DAILY_LIMIT", "1");
  let generated = false;
  buildVideos.mockImplementation(async (_args, _skip, beforeGenerate) => {
    await beforeGenerate?.(targets([`over-${crypto.randomUUID()}`, `over-${crypto.randomUUID()}`]));
    generated = true;
    return { reports: [], failures: [] };
  });
  await expect(uploadVideos(["--tts", "gemini"])).rejects.toThrow(/上限を超える/);
  expect(generated).toBe(false);
  expect(put).not.toHaveBeenCalled();
});

it("dry-run は回数を出して終わり、R2 に書かない", async () => {
  vi.stubEnv("VIDEO_TTS_DAILY_LIMIT", "1");
  buildVideos.mockImplementation(async (_args, _skip, beforeGenerate) => {
    await beforeGenerate?.(targets([`dry-${crypto.randomUUID()}`, `dry-${crypto.randomUUID()}`]));
    throw new Error("生成に進みました");
  });
  await expect(uploadVideos(["--tts", "gemini", "--dry-run"])).resolves.toBeUndefined();
  expect(put).not.toHaveBeenCalled();
});

it("--force は --topics が無いと R2 を開かない", async () => {
  await expect(uploadVideos(["--force", "--tts", "fake"])).rejects.toThrow("--force");
  expect(createR2Client).not.toHaveBeenCalled();
});

it("例外でも呼び出し日の回数を一度だけ保存する", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-23T07:59:59Z"));
  get.mockResolvedValue(
    new TextEncoder().encode(
      JSON.stringify({
        version: 1,
        objects: {},
        durations: {},
        ttsUsage: { day: "2026-11-22", requests: 1 },
      }),
    ),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              details: [
                {
                  "@type": "type.googleapis.com/google.rpc.QuotaFailure",
                  violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel" }],
                },
              ],
            },
          }),
          { status: 429 },
        ),
    ),
  );
  buildVideos.mockImplementation(async (_args, _skip, beforeGenerate) => {
    await beforeGenerate?.([]);
    const synthesize = (text: string) => createTtsProvider({ provider: "gemini" }).synthesize(text);
    await expect(synthesize("日付が変わる前")).rejects.toThrow("429");
    vi.setSystemTime(new Date("2026-11-23T08:00:00Z"));
    await expect(synthesize("日付が変わった後")).rejects.toThrow("429");
    vi.setSystemTime(new Date("2026-11-24T08:00:00Z"));
    throw new Error("生成エラー");
  });
  await expect(uploadVideos(["--tts", "gemini"])).rejects.toThrow("生成エラー");
  expect(put).toHaveBeenCalledTimes(1);
  const body = put.mock.calls[0][1];
  expect(JSON.parse(new TextDecoder().decode(body)).ttsUsage).toEqual({
    "2026-11-22": 2,
    "2026-11-23": 1,
  });
});

it("台帳の保存も失敗した場合は生成の例外を返す", async () => {
  put.mockRejectedValueOnce(new Error("保存エラー"));
  buildVideos.mockImplementation(async (_args, _skip, beforeGenerate) => {
    await beforeGenerate?.([]);
    throw new Error("生成エラー");
  });
  await expect(uploadVideos(["--tts", "fake"])).rejects.toThrow("生成エラー");
  expect(put).toHaveBeenCalledTimes(1);
});

it("使用済み回数が上限を超えても、必要 0 回なら続ける", () => {
  const assessed = assessVideoTtsBudget(
    [],
    "gemini",
    "",
    { "2026-11-23": 101 },
    100,
    new Date("2026-11-23T09:00:00Z"),
  );
  expect(assessed).toMatchObject({ used: 101, remaining: 0, needed: 0 });
  expect(videoTtsDecision(assessed, false)).toBe("run");
});

it("--topics にはステージが必要で、オプションの値はステージと見なさない", async () => {
  await expect(uploadVideos(["--topics", "1-1-9", "--tts", "fake"])).rejects.toThrow(
    "対象ステージ",
  );
  expect(createR2Client).not.toHaveBeenCalled();
});

it.each([
  "not json",
  '{"version":1,"objects":[],"durations":{}}',
  '{"version":1,"objects":{},"durations":{},"ttsUsage":{"day":"2026-11-23","requests":-1}}',
])("不正な台帳では生成も保存も行わない (%s)", async (body) => {
  get.mockResolvedValue(new TextEncoder().encode(body));
  await expect(uploadVideos(["--tts", "fake"])).rejects.toThrow("動画の台帳を読めませんでした");
  expect(buildVideos).not.toHaveBeenCalled();
  expect(put).not.toHaveBeenCalled();
});

it("台帳の取得失敗では生成も保存も行わない", async () => {
  get.mockRejectedValueOnce(new Error("通信エラー"));
  await expect(uploadVideos(["--tts", "fake"])).rejects.toThrow("通信エラー");
  expect(buildVideos).not.toHaveBeenCalled();
  expect(put).not.toHaveBeenCalled();
});

it("強制作成は公開中のキーを保持し、通常の再実行で新しい版を使う", async () => {
  const plan = {
    stageSlug: "dev-env-basics",
    id: `test-${crypto.randomUUID()}`,
    sourceHash: "hash",
  };
  const original = videoKeys(plan.stageSlug, plan.id, plan.sourceHash);
  const objects = Object.fromEntries(Object.values(original).map((key) => [videoKeyHash(key), 1]));
  get.mockResolvedValue(
    new TextEncoder().encode(
      JSON.stringify({
        version: 1,
        objects,
        durations: { [videoKeyHash(original.video)]: 10 },
      }),
    ),
  );
  const dir = join(import.meta.dirname, "../dist/video", plan.stageSlug, plan.id);
  const args = [plan.stageSlug, "--topics", plan.id, "--tts", "fake"];
  try {
    mkdirSync(dir, { recursive: true });
    for (const file of ["video.mp4", "captions.vtt", "poster.jpg"])
      writeFileSync(join(dir, file), "x");
    buildVideos.mockImplementation(async (_args, skip, beforeGenerate) => {
      expect(skip(plan)).toBe(false);
      await beforeGenerate([]);
      return { reports: [{ ...plan, durationSec: 20 }], failures: [] };
    });
    await uploadVideos([...args, "--force"]);
    const key = videoManifestKey(plan.stageSlug, plan.id);
    const published = JSON.parse(readFileSync(manifest, "utf8"))[key];
    expect(published.durationSec).toBe(20);
    for (const field of ["video", "captions", "poster"] as const) {
      expect(published[field]).not.toBe(original[field]);
    }
    expect(vi.mocked(putAll).mock.calls[0][1].map((file) => file.key)).toEqual([
      published.video,
      published.captions,
      published.poster,
    ]);
    const [, state] = put.mock.calls[0];
    expect(JSON.parse(new TextDecoder().decode(state)).objects).toMatchObject(objects);

    get.mockResolvedValue(state);
    buildVideos.mockImplementation(async (_args, skip, beforeGenerate) => {
      expect(skip(plan)).toBe(true);
      await beforeGenerate([]);
      return { reports: [], failures: [] };
    });
    await uploadVideos(args);
    expect(JSON.parse(readFileSync(manifest, "utf8"))[key]).toEqual(published);
    expect(putAll).toHaveBeenCalledTimes(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
