import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
import { createTtsProvider, lessonVideoTtsCacheDir, synthesizeCached } from "./lib/tts.js";
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

it("--preview は動画を上げず、呼び出し回数だけ台帳に残し、manifest を書かない", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-23T12:00:00Z"));
  get.mockResolvedValue(
    new TextEncoder().encode(
      JSON.stringify({ version: 1, objects: { kept: 1 }, durations: {}, ttsUsage: {} }),
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
  const plan = {
    stageSlug: "dev-env-basics",
    id: `preview-${crypto.randomUUID()}`,
    sourceHash: "hash",
  };
  buildVideos.mockImplementation(async (args, skip, beforeGenerate) => {
    expect(args).toEqual(["dev-env-basics", "--topics", plan.id, "--tts", "gemini"]);
    expect(skip(plan)).toBe(false);
    await beforeGenerate?.([]);
    const synthesize = (text: string) => createTtsProvider({ provider: "gemini" }).synthesize(text);
    await expect(synthesize("確認用")).rejects.toThrow("429");
    return { reports: [{ ...plan, durationSec: 4 }], failures: [] };
  });
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  await uploadVideos(["dev-env-basics", "--topics", plan.id, "--tts", "gemini", "--preview"]);
  expect(putAll).not.toHaveBeenCalled();
  expect(put).toHaveBeenCalledTimes(1);
  const saved = JSON.parse(new TextDecoder().decode(put.mock.calls[0][1]));
  expect(saved.objects).toEqual({ kept: 1 });
  expect(saved.durations).toEqual({});
  expect(saved.ttsUsage).toEqual({ "2026-11-23": 1 });
  expect(() => readFileSync(manifest, "utf8")).toThrow();
  expect(log.mock.calls.map((call) => String(call[0])).join("\n")).toMatch(
    /確認ページ: .*dist\/video\/index\.html .*python3 -m http\.server -d packages\/content\/dist\/video/,
  );
  expect(log.mock.calls.map((call) => String(call[0])).join("\n")).toContain("--cached-only");
  log.mockRestore();
});

it("--cached-only は必要回数が 1 以上なら何も書かずに失敗する", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  let generated = false;
  buildVideos.mockImplementation(async (_args, _skip, beforeGenerate) => {
    await beforeGenerate?.(targets([`cache-${crypto.randomUUID()}`]));
    generated = true;
    return { reports: [], failures: [] };
  });
  await expect(uploadVideos(["--tts", "gemini", "--cached-only"])).rejects.toThrow(/--preview/);
  expect(generated).toBe(false);
  expect(put).not.toHaveBeenCalled();
  expect(putAll).not.toHaveBeenCalled();
  expect(() => readFileSync(manifest, "utf8")).toThrow();
});

it("--cached-only は必要 0 なら上げて manifest を書く", async () => {
  const plan = {
    stageSlug: "dev-env-basics",
    id: `cached-${crypto.randomUUID()}`,
    sourceHash: "hash",
  };
  const dir = join(import.meta.dirname, "../dist/video", plan.stageSlug, plan.id);
  try {
    mkdirSync(dir, { recursive: true });
    for (const file of ["video.mp4", "captions.vtt", "poster.jpg"])
      writeFileSync(join(dir, file), "x");
    buildVideos.mockImplementation(async (_args, skip, beforeGenerate) => {
      expect(skip(plan)).toBe(false);
      await beforeGenerate?.([]);
      return { reports: [{ ...plan, durationSec: 8 }], failures: [] };
    });
    await uploadVideos([plan.stageSlug, "--topics", plan.id, "--tts", "fake", "--cached-only"]);
    expect(putAll).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(readFileSync(manifest, "utf8"))[videoManifestKey(plan.stageSlug, plan.id)]
        .durationSec,
    ).toBe(8);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("--cached-only で Gemini を呼びかけると、そのトピックだけ失敗してほかは台帳に載る", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  const fetchMock = vi.fn(async () => new Response("called", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  const failed = {
    stageSlug: "dev-env-basics",
    id: `miss-${crypto.randomUUID()}`,
    sourceHash: "hash-a",
  };
  const made = {
    stageSlug: "dev-env-basics",
    id: `made-${crypto.randomUUID()}`,
    sourceHash: "hash-b",
  };
  const dir = join(import.meta.dirname, "../dist/video", made.stageSlug, made.id);
  const exitCode = process.exitCode;
  try {
    mkdirSync(dir, { recursive: true });
    for (const file of ["video.mp4", "captions.vtt", "poster.jpg"])
      writeFileSync(join(dir, file), "x");
    buildVideos.mockImplementation(async (_args, skip, beforeGenerate) => {
      expect(skip(made)).toBe(false);
      await beforeGenerate?.([]);
      const failures = [];
      try {
        await synthesizeCached(
          createTtsProvider({ provider: "gemini" }),
          "作り直し",
          lessonVideoTtsCacheDir(join(import.meta.dirname, "..")),
        );
      } catch (error) {
        failures.push({
          stageSlug: failed.stageSlug,
          id: failed.id,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
      return { reports: [{ ...made, durationSec: 8 }], failures };
    });
    await uploadVideos(["--tts", "gemini", "--cached-only"]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(putAll).toHaveBeenCalledTimes(1);
    const uploaded = vi.mocked(putAll).mock.calls[0][1].map((file) => file.key);
    expect(uploaded.every((key) => key.includes(made.id))).toBe(true);
    expect(uploaded.some((key) => key.includes(failed.id))).toBe(false);
    const saved = JSON.parse(new TextDecoder().decode(put.mock.calls[0][1]));
    expect(saved.ttsUsage).toBeUndefined();
    expect(Object.keys(saved.objects)).toHaveLength(3);
    const written = JSON.parse(readFileSync(manifest, "utf8"));
    expect(written[videoManifestKey(made.stageSlug, made.id)].durationSec).toBe(8);
    expect(written[videoManifestKey(failed.stageSlug, failed.id)].error).toContain(
      "音声は作りません",
    );
    expect(process.exitCode).toBe(1);
  } finally {
    process.exitCode = exitCode;
    rmSync(dir, { recursive: true, force: true });
  }
});

it("--cached-only の合成例外が外へ出ても動画は上げない", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  buildVideos.mockImplementation(async (_args, _skip, beforeGenerate) => {
    await beforeGenerate?.([]);
    await synthesizeCached(
      createTtsProvider({ provider: "gemini" }),
      "作り直し",
      lessonVideoTtsCacheDir(join(import.meta.dirname, "..")),
    );
    return { reports: [], failures: [] };
  });
  await expect(uploadVideos(["--tts", "gemini", "--cached-only"])).rejects.toThrow(
    /音声は作りません/,
  );
  expect(putAll).not.toHaveBeenCalled();
});

it.each([
  [["--preview", "--cached-only", "--tts", "fake"], "--cached-only"],
  [["--preview", "--dry-run", "--tts", "fake"], "--dry-run"],
])("同時に指定できない (%j)", async (args, message) => {
  await expect(uploadVideos(args)).rejects.toThrow(message);
  expect(createR2Client).not.toHaveBeenCalled();
});

it.each(["openjtalk", "grok"] as const)(
  "--cached-only は %s でもキャッシュに無い読み上げがあると何も書かずに止まる",
  async (tts) => {
    let generated = false;
    buildVideos.mockImplementation(async (_args, _skip, beforeGenerate) => {
      await beforeGenerate?.(targets([`miss-${crypto.randomUUID()}`]));
      generated = true;
      return { reports: [], failures: [] };
    });
    await expect(uploadVideos(["--tts", tts, "--cached-only"])).rejects.toThrow(/--preview/);
    expect(generated).toBe(false);
    expect(put).not.toHaveBeenCalled();
    expect(putAll).not.toHaveBeenCalled();
    expect(() => readFileSync(manifest, "utf8")).toThrow();
  },
);

it("--preview は --out の確認ページと HTTP での開き方を案内する", async () => {
  const out = mkdtempSync(join(tmpdir(), "stella-video preview-"));
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  try {
    buildVideos.mockResolvedValue({ reports: [], failures: [] });
    await uploadVideos(["--tts", "fake", "--preview", "--out", out]);
    expect(
      log.mock.calls.find(([message]) => String(message).startsWith("確認ページ"))?.[0],
    ).toContain(`${join(out, "index.html")} （python3 -m http.server -d '${out}'`);
  } finally {
    log.mockRestore();
    rmSync(out, { recursive: true, force: true });
  }
});

it("--out を付けると、その下のファイルを上げる", async () => {
  const plan = {
    stageSlug: "dev-env-basics",
    id: `out-${crypto.randomUUID()}`,
    sourceHash: "hash",
  };
  const root = mkdtempSync(join(tmpdir(), "stella-video-"));
  const dir = join(root, plan.stageSlug, plan.id);
  try {
    mkdirSync(dir, { recursive: true });
    for (const file of ["video.mp4", "captions.vtt", "poster.jpg"])
      writeFileSync(join(dir, file), "out");
    buildVideos.mockImplementation(async (args, skip, beforeGenerate) => {
      expect(skip(plan)).toBe(false);
      expect(args).toContain("--out");
      expect(args).toContain(root);
      await beforeGenerate?.([]);
      return { reports: [{ ...plan, durationSec: 3 }], failures: [] };
    });
    await uploadVideos([plan.stageSlug, "--topics", plan.id, "--tts", "fake", "--out", root]);
    const files = vi.mocked(putAll).mock.calls[0][1].map((file) => file.file as string);
    expect(files).toEqual([
      join(dir, "video.mp4"),
      join(dir, "captions.vtt"),
      join(dir, "poster.jpg"),
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it("保存直前に台帳を読み直し、並行した変更を残す", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-23T12:00:00Z"));
  const initial = {
    version: 1,
    objects: { kept: 1 },
    durations: {},
    ttsUsage: { "2026-11-23": 2 },
  };
  const concurrent = {
    version: 1,
    objects: { kept: 1, other: 9 },
    durations: { other: 4 },
    ttsUsage: { "2026-11-23": 5 },
  };
  get
    .mockResolvedValueOnce(new TextEncoder().encode(JSON.stringify(initial)))
    .mockResolvedValueOnce(new TextEncoder().encode(JSON.stringify(concurrent)));
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
  const plan = {
    stageSlug: "dev-env-basics",
    id: `merge-${crypto.randomUUID()}`,
    sourceHash: "hash",
  };
  const dir = join(import.meta.dirname, "../dist/video", plan.stageSlug, plan.id);
  try {
    mkdirSync(dir, { recursive: true });
    for (const file of ["video.mp4", "captions.vtt", "poster.jpg"])
      writeFileSync(join(dir, file), "x");
    buildVideos.mockImplementation(async (_args, skip, beforeGenerate) => {
      expect(skip(plan)).toBe(false);
      await beforeGenerate?.([]);
      await expect(createTtsProvider({ provider: "gemini" }).synthesize("並行")).rejects.toThrow(
        "429",
      );
      return { reports: [{ ...plan, durationSec: 6 }], failures: [] };
    });
    await uploadVideos([plan.stageSlug, "--topics", plan.id, "--tts", "gemini"]);
    const saved = JSON.parse(new TextDecoder().decode(put.mock.calls[0][1]));
    expect(saved.objects.kept).toBe(1);
    expect(saved.objects.other).toBe(9);
    expect(saved.durations.other).toBe(4);
    expect(saved.ttsUsage["2026-11-23"]).toBe(6);
    expect(Object.keys(saved.objects).length).toBeGreaterThan(2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("台帳の読み直しに失敗したら保存しない", async () => {
  get
    .mockResolvedValueOnce(
      new TextEncoder().encode(JSON.stringify({ version: 1, objects: {}, durations: {} })),
    )
    .mockRejectedValueOnce(new Error("読み直し"));
  const plan = {
    stageSlug: "dev-env-basics",
    id: `reread-${crypto.randomUUID()}`,
    sourceHash: "hash",
  };
  const dir = join(import.meta.dirname, "../dist/video", plan.stageSlug, plan.id);
  try {
    mkdirSync(dir, { recursive: true });
    for (const file of ["video.mp4", "captions.vtt", "poster.jpg"])
      writeFileSync(join(dir, file), "x");
    buildVideos.mockImplementation(async (_args, skip, beforeGenerate) => {
      expect(skip(plan)).toBe(false);
      await beforeGenerate?.([]);
      return { reports: [{ ...plan, durationSec: 2 }], failures: [] };
    });
    await expect(
      uploadVideos([plan.stageSlug, "--topics", plan.id, "--tts", "fake"]),
    ).rejects.toThrow(/もう一度実行してください/);
    expect(put).not.toHaveBeenCalled();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
