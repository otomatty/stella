import { rmSync } from "node:fs";
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

import { createR2Client } from "./lib/r2.js";
import { createTtsProvider } from "./lib/tts.js";
import { uploadVideos, videoTtsDecision, type VideoTtsBudget } from "./upload-videos.js";
import type { PendingVideoTts } from "./build-video.js";

const manifest = join(import.meta.dirname, "../dist/video-manifest.json");

afterEach(() => {
  buildVideos.mockReset();
  put.mockClear();
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

it("日付が変わった台帳は 0 から数え、失敗した呼び出しも保存する", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  get.mockResolvedValue(
    new TextEncoder().encode(
      JSON.stringify({
        version: 1,
        objects: {},
        durations: {},
        ttsUsage: { day: "2000-01-01", requests: 100 },
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
    await expect(createTtsProvider({ provider: "gemini" }).synthesize("呼び出し")).rejects.toThrow(
      "429",
    );
    return { reports: [], failures: [] };
  });
  await uploadVideos(["--tts", "gemini"]);
  const body = put.mock.calls[0]?.[1];
  if (!body) throw new Error("台帳が保存されていません");
  const saved = JSON.parse(new TextDecoder().decode(body)) as {
    ttsUsage: { day: string; requests: number };
  };
  expect(saved.ttsUsage.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(saved.ttsUsage.day).not.toBe("2000-01-01");
  expect(saved.ttsUsage.requests).toBe(1);
});
