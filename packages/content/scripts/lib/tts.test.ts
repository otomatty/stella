import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createTtsProvider,
  cueHash,
  geminiAudioField,
  grokAudioField,
  mapPool,
  parseQuotaError,
  pcmToWav,
  QuotaExhaustedError,
  RetryableError,
  synthesizeCached,
  type TtsProvider,
  withRetry,
} from "./tts.js";

describe("応答から音声を拾う", () => {
  it("gemini: REST と SDK の綴りのどちらでも読める", () => {
    expect(geminiAudioField({ output_audio: { data: "QUJD" } })).toBe("QUJD");
    expect(geminiAudioField({ outputAudio: { data: "QUJD" } })).toBe("QUJD");
    expect(geminiAudioField({ output_audio: {} })).toBeUndefined();
  });

  it("gemini: steps の content から最後の音声を読める", () => {
    expect(
      geminiAudioField({
        status: "completed",
        object: "interaction",
        steps: [
          { type: "model_output", content: [{ type: "audio", data: "QUJD" }] },
          {
            type: "model_output",
            content: [
              { type: "audio", data: "REVG" },
              { type: "audio", mime_type: "audio/wav", data: "R0hJ" },
              { type: "text", data: "text" },
              { type: "audio", data: "" },
            ],
          },
        ],
      }),
    ).toBe("R0hJ");
  });

  it("gemini: 音声以外や空・文字列以外の data は拾わない", () => {
    expect(
      geminiAudioField({
        steps: [
          {
            content: [
              { type: "text", data: "QUJD" },
              { data: "QUJD" },
              { type: "audio", data: "" },
              { type: "audio", data: 123 },
              { type: "audio" },
            ],
          },
        ],
      }),
    ).toBeUndefined();
  });

  it("gemini: steps や content の形が不正でも例外を投げない", () => {
    for (const steps of [undefined, null, {}, "steps", 123]) {
      expect(geminiAudioField({ steps })).toBeUndefined();
    }
    expect(
      geminiAudioField({
        steps: [
          null,
          "step",
          123,
          [],
          {},
          { content: null },
          { content: {} },
          { content: "content" },
          { content: [null, "content", 123, [], {}] },
          { content: [{ type: "audio", data: "QUJD" }] },
        ],
      }),
    ).toBe("QUJD");
  });

  it("grok: Cloudflare の封筒の深さが違っても読める (workers-ai.ts と同じ)", () => {
    expect(grokAudioField({ audio: "a" })).toBe("a");
    expect(grokAudioField({ result: { audio: "b" } })).toBe("b");
    expect(grokAudioField({ result: { state: "done", result: { audio: "https://x" } } })).toBe(
      "https://x",
    );
    expect(grokAudioField({ result: {} })).toBeUndefined();
  });
});

describe("pcmToWav", () => {
  it("44 バイトの RIFF ヘッダを付ける", () => {
    const wav = pcmToWav(new Uint8Array(100), 24_000);
    const buf = Buffer.from(wav);
    expect(buf.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(buf.readUInt32LE(24)).toBe(24_000);
    expect(buf.readUInt32LE(40)).toBe(100);
    expect(wav.length).toBe(144);
  });
});

describe("parseQuotaError", () => {
  const quotaBody = (quotaId: string, quotaMetric = "", retryDelay = "39s") =>
    JSON.stringify({
      error: {
        code: 429,
        message: "You exceeded your current quota",
        status: "RESOURCE_EXHAUSTED",
        details: [
          {
            "@type": "type.googleapis.com/google.rpc.QuotaFailure",
            violations: [{ quotaId, quotaMetric, quotaValue: "100" }],
          },
          { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay },
        ],
      },
    });

  it("日次上限の ID・値と再試行までの秒数を拾う", () => {
    expect(parseQuotaError(quotaBody("GenerateRequestsPerDayPerProjectPerModel"))).toEqual({
      daily: true,
      retryAfterSec: 39,
      description: "GenerateRequestsPerDayPerProjectPerModel=100",
    });
  });

  it("分あたりの上限を日次上限にしない", () => {
    expect(parseQuotaError(quotaBody("GenerateRequestsPerMinutePerProjectPerModel"))).toEqual({
      daily: false,
      retryAfterSec: 39,
      description: "GenerateRequestsPerMinutePerProjectPerModel=100",
    });
  });

  it("日次上限はどれかの violation の ID または metric で、大文字小文字を問わず判定する", () => {
    for (const violation of [
      { quotaId: "generateRequestsPERDAY" },
      { quotaMetric: "generativelanguage.googleapis.com/generate_requests_PER_DAY" },
    ]) {
      const body = JSON.stringify({
        error: {
          details: [
            {
              "@type": "type.googleapis.com/google.rpc.QuotaFailure",
              violations: [{ quotaId: "PerMinute", quotaValue: "10" }, violation],
            },
          ],
        },
      });
      expect(parseQuotaError(body).daily).toBe(true);
    }
  });

  it("retryDelay の小数秒を読み、不正な値や未指定は undefined にする", () => {
    expect(parseQuotaError(quotaBody("PerMinute", "", "1.5s")).retryAfterSec).toBe(1.5);
    for (const retryDelay of ["", "39", "-1s", "NaNs", "Infinitys"]) {
      expect(parseQuotaError(quotaBody("PerMinute", "", retryDelay)).retryAfterSec).toBeUndefined();
    }
    expect(parseQuotaError('{"error":{"message":"quota"}}')).toEqual({
      daily: false,
      description: "quota",
    });
  });

  it("quotaId が無ければ message の先頭 200 文字を説明にする", () => {
    expect(parseQuotaError(JSON.stringify({ error: { message: "a".repeat(300) } }))).toEqual({
      daily: false,
      description: "a".repeat(200),
    });
  });

  it("JSON でない本文や不正な形でも例外を投げず本文の先頭 200 文字を返す", () => {
    for (const body of [
      "not JSON".repeat(50),
      "null",
      "[]",
      '{"error":null}',
      '{"error":{"details":[null,{}, {"violations":123}]}}',
    ]) {
      expect(parseQuotaError(body)).toMatchObject({
        daily: false,
        description: body.slice(0, 200),
      });
    }
  });
});

describe("withRetry", () => {
  it("指定された待機秒数とバックオフの大きい方を使い、120 秒を上限にする", async () => {
    const sleep = vi.fn(async (_ms: number) => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let calls = 0;
    try {
      await withRetry(
        "t",
        async () => {
          const delay = [39, 1.5, 300][calls++];
          if (delay !== undefined) throw new RetryableError("429 (quota)", delay);
        },
        sleep,
      );
      expect(sleep.mock.calls.map((c) => c[0])).toEqual([39000, 2000, 120000]);
      expect(warn.mock.calls.map((c) => c[0])).toEqual([
        "  t: 429 (quota) — 39 秒後に再試行",
        "  t: 429 (quota) — 2 秒後に再試行",
        "  t: 429 (quota) — 120 秒後に再試行",
      ]);
    } finally {
      warn.mockRestore();
    }
  });

  it("日次上限は再試行も待機もしない", async () => {
    const error = new QuotaExhaustedError("1 日の上限");
    const fn = vi.fn(async () => {
      throw error;
    });
    const sleep = vi.fn(async (_ms: number) => undefined);
    await expect(withRetry("t", fn, sleep)).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("回数制限・一時障害は待って再試行し、それ以外はすぐ投げる", async () => {
    const sleep = vi.fn(async (_ms: number) => undefined);
    let calls = 0;
    const ok = await withRetry(
      "t",
      async () => {
        calls++;
        if (calls < 3) throw new RetryableError("429");
        return "done";
      },
      sleep,
    );
    expect(ok).toBe("done");
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([1000, 2000]);
    await expect(
      withRetry(
        "t",
        async () => {
          throw new Error("400");
        },
        sleep,
      ),
    ).rejects.toThrow("400");
  });

  it("最大 7 回待ったら諦める", async () => {
    const sleep = vi.fn(async (_ms: number) => undefined);
    await expect(
      withRetry(
        "t",
        async () => {
          throw new RetryableError("503");
        },
        sleep,
      ),
    ).rejects.toThrow("503");
    expect(sleep).toHaveBeenCalledTimes(7);
  });
});

describe("gemini プロバイダ", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("日次上限に達したインスタンスは以降通信せず失敗し、別インスタンスには影響しない", async () => {
    vi.stubEnv("GEMINI_API_KEY", "secret-key");
    const fetchMock = vi.fn().mockResolvedValueOnce(
      Response.json(
        {
          error: {
            details: [
              {
                "@type": "type.googleapis.com/google.rpc.QuotaFailure",
                violations: [{ quotaId: "GenerateRequestsPerDay", quotaValue: "100" }],
              },
            ],
          },
        },
        { status: 429 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const p = createTtsProvider({ provider: "gemini" });
    await expect(p.synthesize("最初の文")).rejects.toThrow(QuotaExhaustedError);
    await expect(p.synthesize("次の文")).rejects.toThrow(
      "gemini: HTTP 429 1 日の上限に達しました (GenerateRequestsPerDay=100)",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValueOnce(
      Response.json({ output_audio: { data: Buffer.from([1, 2]).toString("base64") } }),
    );
    await createTtsProvider({ provider: "gemini" }).synthesize("別の文");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("400 のエラーでは本文をメッセージに含める", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    const response = new Response("private error body", { status: 400 });
    const text = vi.spyOn(response, "text");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    await expect(createTtsProvider({ provider: "gemini" }).synthesize("文")).rejects.toThrow(
      "gemini: HTTP 400 private error body",
    );
    expect(text).toHaveBeenCalledTimes(1);
  });

  it("分あたりの上限では説明をログに出し、retryDelay を待って再試行する", async () => {
    vi.stubEnv("GEMINI_API_KEY", "secret-key");
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          {
            error: {
              details: [
                {
                  "@type": "type.googleapis.com/google.rpc.QuotaFailure",
                  violations: [{ quotaId: "GenerateRequestsPerMinute", quotaValue: "10" }],
                },
                { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "1.5s" },
              ],
            },
          },
          { status: 429 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({ output_audio: { data: Buffer.from([1, 2]).toString("base64") } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    try {
      const result = createTtsProvider({ provider: "gemini" }).synthesize("文");
      await vi.advanceTimersByTimeAsync(1499);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      await result;
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenCalledExactlyOnceWith(
        "  gemini: gemini: HTTP 429 (GenerateRequestsPerMinute=10) — 1.5 秒後に再試行",
      );
    } finally {
      vi.useRealTimers();
      warn.mockRestore();
    }
  });

  it("鍵が無ければ代わりの手段を案内して落ちる", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const p = createTtsProvider({ provider: "gemini" });
    await expect(p.synthesize("こんにちは")).rejects.toThrow(/--tts openjtalk/);
  });

  it("参考設計書の形で呼び、PCM で返ってきても WAV にする", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      Response.json({ output_audio: { data: Buffer.from([1, 2, 3, 4]).toString("base64") } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const p = createTtsProvider({ provider: "gemini", voice: "Charon", style: "ゆっくり" });
    const audio = await p.synthesize("こんにちは");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/interactions");
    const body = JSON.parse(String(init.body));
    expect(body.input[0].content[0]).toMatchObject({
      text: "こんにちは",
      annotations: [{ type: "speech_metadata", style: "ゆっくり" }],
    });
    expect(body.generation_config.speech_config[0].voice).toBe("Charon");
    expect(Buffer.from(audio.bytes.subarray(0, 4)).toString("ascii")).toBe("RIFF");
    expect(p.identity).toContain("Charon");
  });
});

describe("synthesizeCached", () => {
  it("同じ読み上げ文は 2 回目から呼ばない。refresh で作り直す", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tts-cache-"));
    try {
      const synthesize = vi.fn(async () => ({
        bytes: new Uint8Array([1, 2, 3]),
        ext: "wav" as const,
      }));
      const p: TtsProvider = {
        unit: "cue",
        identity: "t/1",
        concurrency: 1,
        nondeterministic: true,
        synthesize,
      };
      const a = await synthesizeCached(p, "文", dir);
      const b = await synthesizeCached(p, "文", dir);
      expect(a.cached).toBe(false);
      expect(b).toEqual({ file: a.file, cached: true });
      expect(synthesize).toHaveBeenCalledTimes(1);
      await synthesizeCached(p, "文", dir, true);
      expect(synthesize).toHaveBeenCalledTimes(2);
      expect(readdirSync(dir)).toEqual([`${cueHash("t/1", "文")}.wav`]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("同じ読み上げ文を同時に頼まれても 1 回しか合成しない (作り直しも 1 回まで)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tts-cache-"));
    try {
      let release: () => void = () => undefined;
      const gate = new Promise<void>((r) => {
        release = r;
      });
      const synthesize = vi.fn(async () => {
        await gate;
        return { bytes: new Uint8Array([1]), ext: "wav" as const };
      });
      const p: TtsProvider = {
        unit: "cue",
        identity: "t/2",
        concurrency: 4,
        nondeterministic: true,
        synthesize,
      };
      const both = Promise.all([
        synthesizeCached(p, "同時", dir),
        synthesizeCached(p, "同時", dir),
      ]);
      release();
      const [a, b] = await both;
      expect(a.file).toBe(b.file);
      expect(synthesize).toHaveBeenCalledTimes(1);
      await Promise.all([
        synthesizeCached(p, "同時", dir, true),
        synthesizeCached(p, "同時", dir, true),
      ]);
      await synthesizeCached(p, "同時", dir, true);
      expect(synthesize).toHaveBeenCalledTimes(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("別々の文でも同時実行数を守り、失敗しても残りの合成を続ける", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tts-cache-"));
    try {
      let running = 0;
      let peak = 0;
      const failure = new Error("合成に失敗しました");
      const synthesize = vi.fn(async (speech: string) => {
        running++;
        peak = Math.max(peak, running);
        try {
          await new Promise((r) => setTimeout(r, 5));
          if (speech === "最初の文") throw failure;
          return { bytes: new Uint8Array([1]), ext: "wav" as const };
        } finally {
          running--;
        }
      });
      const p: TtsProvider = {
        unit: "cue",
        identity: "t/3",
        concurrency: 1,
        nondeterministic: true,
        synthesize,
      };
      const results = await Promise.allSettled(
        ["最初の文", "次の文", "最後の文"].map((speech) => synthesizeCached(p, speech, dir)),
      );
      expect(results.map((result) => result.status)).toEqual([
        "rejected",
        "fulfilled",
        "fulfilled",
      ]);
      expect(results[0]).toEqual({ status: "rejected", reason: failure });
      expect(synthesize).toHaveBeenCalledTimes(3);
      expect(peak).toBe(1);
      expect(running).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("声が変わればキーも変わる", () => {
    expect(cueHash("gemini/a", "文")).not.toBe(cueHash("gemini/b", "文"));
  });
});

describe("mapPool", () => {
  it("並列数を守って順序どおりの結果を返す", async () => {
    let running = 0;
    let peak = 0;
    const out = await mapPool([1, 2, 3, 4, 5], 2, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50]);
    expect(peak).toBe(2);
  });
});

it("プロバイダごとの合成単位", () => {
  expect(createTtsProvider({ provider: "gemini" }).unit).toBe("topic");
  for (const provider of ["grok", "openjtalk", "fake"] as const) {
    expect(createTtsProvider({ provider }).unit).toBe("cue");
  }
});
