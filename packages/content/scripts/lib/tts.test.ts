import { EventEmitter } from "node:events";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, posix, win32 } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { setupVideoTts } from "../setup-video-tts.js";

vi.mock("node:child_process", async (original) => ({
  ...(await original<typeof import("node:child_process")>()),
  spawn: vi.fn(),
  spawnSync: vi.fn(),
}));

import {
  countTtsCalls,
  createTtsProvider,
  cueHash,
  findOpenJtalkPython,
  hasCachedTts,
  openJtalkScript,
  geminiAudioField,
  grokAudioField,
  mapPool,
  parseQuotaError,
  pcmToWav,
  QuotaExhaustedError,
  readGeminiTtsCalls,
  requireCachedTts,
  RetryableError,
  synthesizeCached,
  trackGeminiTtsCalls,
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

  it("残高切れでは再試行せず、同じプロバイダで次の文も送らない", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ error: { message: "prepayment credits are depleted" } }, { status: 402 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const p = createTtsProvider({ provider: "gemini" });
    for (const speech of ["最初の文", "次の文"])
      await expect(p.synthesize(speech)).rejects.toThrow(
        /Gemini API の残高がありません.*prepayment credits are depleted.*--tts openjtalk/,
      );
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

  it("長い音声の合成に 5 分の時間切れを渡す", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    const signal = new AbortController().signal;
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(signal);
    const fetchMock = vi.fn(async () =>
      Response.json({ output_audio: { data: Buffer.from([1, 2]).toString("base64") } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    try {
      await createTtsProvider({ provider: "gemini" }).synthesize("読み上げ");
      expect(timeout).toHaveBeenCalledExactlyOnceWith(300_000);
      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
        expect.any(String),
        expect.objectContaining({ signal }),
      );
    } finally {
      timeout.mockRestore();
    }
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
  it("キャッシュ必須のあいだは無い読み上げと refresh を合成しない", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tts-cache-"));
    const synthesize = vi.fn(async () => ({ bytes: new Uint8Array([1]), ext: "wav" as const }));
    const provider: TtsProvider = {
      unit: "cue",
      identity: "t/cached-only",
      concurrency: 1,
      nondeterministic: true,
      synthesize,
    };
    try {
      requireCachedTts(true);
      const missing = synthesizeCached(provider, "無い", dir);
      await expect(missing).rejects.toThrow("音声は作りません");
      await expect(missing).rejects.not.toBeInstanceOf(RetryableError);
      await expect(synthesizeCached(provider, "無い", dir, true)).rejects.toThrow(
        "音声は作りません",
      );
      expect(synthesize).not.toHaveBeenCalled();
      requireCachedTts(false);
      const made = await synthesizeCached(provider, "無い", dir);
      expect(made.cached).toBe(false);
      expect(synthesize).toHaveBeenCalledTimes(1);
      requireCachedTts(true);
      await expect(synthesizeCached(provider, "無い", dir)).resolves.toEqual({
        file: made.file,
        cached: true,
      });
      await expect(synthesizeCached(provider, "無い", dir, true)).rejects.toThrow(
        "音声は作りません",
      );
      expect(synthesize).toHaveBeenCalledTimes(1);
    } finally {
      requireCachedTts(false);
      rmSync(dir, { recursive: true, force: true });
    }
  });

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

  it("同時の合成・作り直しは1回にまとめ、完了後の作り直しは再合成する", async () => {
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
      expect(synthesize).toHaveBeenCalledTimes(2);
      await synthesizeCached(p, "同時", dir, true);
      expect(synthesize).toHaveBeenCalledTimes(3);
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

const wave = Buffer.from(pcmToWav(new Uint8Array([1, 2]), 24_000));
const onnxWarning =
  "Warning: ONNX Runtime is not installed. Nani prediction will be disabled.\n" +
  "Please install ONNX Runtime by `pip install pyopenjtalk-plus[onnxruntime]`";
const commandResult = (status: number, stdout = Buffer.alloc(0), stderr = Buffer.alloc(0)) => ({
  status,
  stdout,
  stderr,
  pid: 1,
  output: [null, stdout, stderr],
  signal: null,
});

describe("Open JTalk の Python", () => {
  it.each([
    ["/opt/python", ["/opt/python"]],
    ["/content/.venv-tts/bin/python", ["/opt/python", "/content/.venv-tts/bin/python"]],
    ["python3", ["/opt/python", "/content/.venv-tts/bin/python", "python3"]],
    ["python", ["/opt/python", "/content/.venv-tts/bin/python", "python3", "python"]],
  ])("%s が最初に import に成功すれば選ぶ", (selected, commands) => {
    const run = vi.fn((command: string) => commandResult(command === selected ? 0 : 1));
    expect(findOpenJtalkPython(run, "/opt/python", "linux", "/content/.venv-tts")).toBe(selected);
    expect(run.mock.calls).toEqual(
      commands.map((command) => [command, ["-c", "import pyopenjtalk"]]),
    );
  });

  it("Windows では Scripts/python.exe を探す", () => {
    const run = vi.fn(() => commandResult(0));
    const python = findOpenJtalkPython(run, "", "win32", "C:/教材/.venv-tts");
    expect(python).toBe(String.raw`C:\教材\.venv-tts\Scripts\python.exe`);
    expect(run).toHaveBeenCalledExactlyOnceWith(python, ["-c", "import pyopenjtalk"]);
  });

  it("全候補が失敗したらセットアップのコマンドと fake を案内する", () => {
    const run = vi.fn(() => commandResult(1));
    expect(() => findOpenJtalkPython(run, "/opt/python", "linux", "/content/.venv-tts")).toThrow(
      /準備ができていません.*pyopenjtalk.*video:tts:setup.*--tts fake/,
    );
    expect(run).toHaveBeenCalledTimes(4);
  });
});

describe("ローカルの WAV", () => {
  function nextAudio(bytes: Buffer, status = 0, stderr = onnxWarning) {
    vi.mocked(spawnSync).mockReturnValue(commandResult(0));
    vi.mocked(spawn).mockImplementationOnce(() => {
      const child = Object.assign(new EventEmitter(), {
        stdin: Object.assign(new EventEmitter(), { end: vi.fn() }),
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
      });
      queueMicrotask(() => {
        child.stdout.emit("data", bytes);
        child.stderr.emit("data", Buffer.from(stderr));
        child.emit("close", status);
      });
      return child as unknown as ReturnType<typeof spawn>;
    });
  }

  it.each(["辞書のダウンロード", "RIFF0000AVI "])(
    "Open JTalk の出力 %s を拒み、キャッシュに書かない",
    async (output) => {
      const dir = mkdtempSync(join(tmpdir(), "tts-wav-"));
      try {
        nextAudio(Buffer.from(output));
        const provider = createTtsProvider({ provider: "openjtalk" });
        await expect(synthesizeCached(provider, "文", dir)).rejects.toThrow("RIFF/WAVE");
        expect(readdirSync(dir)).toEqual([]);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  );

  it("合成失敗時も ONNX Runtime の警告をエラーに含めない", async () => {
    nextAudio(Buffer.alloc(0), 1, `辞書の読み込みに失敗しました\n${onnxWarning}\n`);
    const synthesis = createTtsProvider({ provider: "openjtalk" }).synthesize("文");
    await expect(synthesis).rejects.toThrow("辞書の読み込みに失敗しました");
    await expect(synthesis).rejects.not.toThrow("ONNX Runtime");
  });

  it.each(["openjtalk", "fake"] as const)(
    "%s の壊れた WAV を捨て、正しい WAV を再利用する",
    async (name) => {
      const dir = mkdtempSync(join(tmpdir(), "tts-wav-"));
      try {
        const provider = createTtsProvider({ provider: name });
        const file = join(dir, `${cueHash(provider.identity, "文")}.wav`);
        writeFileSync(file, "壊れたキャッシュ");
        const synth = vi.spyOn(provider, "synthesize");
        if (name === "openjtalk") nextAudio(wave);
        expect(await synthesizeCached(provider, "文", dir)).toEqual({ file, cached: false });
        expect(await synthesizeCached(provider, "文", dir)).toEqual({ file, cached: true });
        expect(synth).toHaveBeenCalledTimes(1);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  );
});

describe("読み上げ回数の数え方", () => {
  afterEach(() => {
    trackGeminiTtsCalls(false);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("キャッシュにある動画と収録版を数えず、同じ読み上げは 1 回にまとめる", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tts-count-"));
    const identity = "gemini/count-test";
    const provider: TtsProvider = {
      unit: "topic",
      identity,
      concurrency: 1,
      nondeterministic: false,
      synthesize: async () => ({ bytes: Uint8Array.from([1, 2, 3]), ext: "wav" }),
    };
    try {
      const sceneSpeech = "題名\n\n場面1\n\n場面2";
      expect(
        countTtsCalls(
          [{ stageSlug: "stage", id: "1-1", kind: "scene", speeches: [sceneSpeech] }],
          identity,
          dir,
        ),
      ).toEqual({
        topics: [{ stageSlug: "stage", id: "1-1", kind: "scene", calls: 1 }],
        needed: 1,
      });
      await synthesizeCached(provider, sceneSpeech, dir);
      expect(hasCachedTts(identity, sceneSpeech, dir)).toBe(true);
      writeFileSync(join(dir, `${cueHash(identity, "空")}.wav`), Buffer.alloc(0));
      expect(hasCachedTts(identity, "空", dir)).toBe(false);
      writeFileSync(join(dir, `${cueHash(identity, "mp3")}.mp3`), Buffer.from([9]));
      expect(hasCachedTts(identity, "mp3", dir)).toBe(true);
      const counted = countTtsCalls(
        [
          { stageSlug: "stage", id: "1-1", kind: "scene", speeches: [sceneSpeech] },
          { stageSlug: "stage", id: "1-2", kind: "narration", speeches: ["トピックの読み"] },
          { stageSlug: "stage", id: "1-3", kind: "narration", speeches: ["トピックの読み"] },
          { stageSlug: "stage", id: "rec", kind: "recorded", speeches: [] },
        ],
        identity,
        dir,
      );
      expect(counted.topics.map((topic) => topic.calls)).toEqual([0, 1, 0, 0]);
      expect(counted.needed).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("数えるあいだの失敗した Gemini リクエストだけを足す", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
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
    const provider = createTtsProvider({ provider: "gemini" });
    trackGeminiTtsCalls(true);
    await expect(provider.synthesize("文")).rejects.toThrow("429");
    expect(readGeminiTtsCalls()).toBe(1);
    trackGeminiTtsCalls(false);
    await expect(provider.synthesize("文")).rejects.toThrow("429");
    expect(readGeminiTtsCalls()).toBe(1);
  });
});

describe("video:tts:setup", () => {
  it.each([
    {
      platform: "linux",
      uv: true,
      base: ["uv", "venv", "--python", ">=3.10,<3.14", "--no-python-downloads"],
    },
    { platform: "linux", uv: false, base: ["python3", "-m", "venv"] },
    { platform: "linux", uv: false, base: ["python", "-m", "venv"] },
    { platform: "linux", uv: false, base: ["python3.11", "-m", "venv"] },
    { platform: "win32", uv: false, base: ["py", "-3.11", "-m", "venv"] },
  ] as const)(
    "$platform の仮想環境を作る (uv=$uv) 2 回目は済んだ手順を飛ばす",
    ({ platform, uv, base }) => {
      const root = mkdtempSync(join(tmpdir(), "tts-setup-"));
      const venv = join(root, ".venv-tts");
      let created = false;
      let installed = false;
      const run = vi.fn((command: string, args: string[], _input?: string) => {
        if (args[0] === "--version") return commandResult(uv ? 0 : 1);
        if (args.includes("venv")) {
          mkdirSync(venv);
          created = true;
          return commandResult(0);
        }
        if (args.includes("install")) {
          installed = true;
          return commandResult(0);
        }
        if (args[0] === openJtalkScript) return commandResult(0, wave, Buffer.from(onnxWarning));
        if (command === base[0] && (platform !== "win32" || args[0] === "-3.11"))
          return commandResult(0);
        if (args[1]?.includes("sys.version_info")) return commandResult(created ? 0 : 1);
        return commandResult(installed ? 0 : 1);
      });
      try {
        setupVideoTts(run, platform, venv);
        const [command, ...args] = base;
        expect(run).toHaveBeenCalledWith(command, [...args, venv], undefined);
        const python = (platform === "win32" ? win32 : posix).join(
          venv,
          ...(platform === "win32" ? ["Scripts", "python.exe"] : ["bin", "python"]),
        );
        const dependencies = ["--only-binary", ":all:", "pyopenjtalk-plus"];
        expect(run).toHaveBeenCalledWith(
          uv ? "uv" : python,
          uv
            ? ["pip", "install", "--python", python, ...dependencies]
            : ["-m", "pip", "install", "--no-input", ...dependencies],
          undefined,
        );
        expect(run).toHaveBeenCalledWith(python, [openJtalkScript], "こんにちは。");
        expect(existsSync(join(venv, ".openjtalk-ready"))).toBe(true);
        run.mockClear();
        setupVideoTts(run, platform, venv);
        expect(run.mock.calls.map(([, args]) => args[0])).toEqual(["-c", "-c"]);
        expect(run.mock.calls[1][1][1]).toContain("import pyopenjtalk");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );

  it.each(["venv", "install", "synthesis", "wav"] as const)(
    "壊れた環境を作り直し、%s の失敗で片付けてから再実行を案内する",
    (failure) => {
      const root = mkdtempSync(join(tmpdir(), "tts-setup-"));
      const venv = join(root, ".venv-tts");
      try {
        mkdirSync(venv);
        writeFileSync(join(venv, ".openjtalk-ready"), "");
        const run = vi.fn((_command: string, args: string[]) => {
          if (args[0] === "--version") return commandResult(0);
          if (args[0] === "venv") {
            expect(existsSync(venv)).toBe(false);
            mkdirSync(venv);
            return commandResult(failure === "venv" ? 1 : 0);
          }
          if (args[1] === "install") return commandResult(failure === "install" ? 1 : 0);
          if (args[0] === openJtalkScript) {
            const stderr = Buffer.from(`原因の詳細\n${onnxWarning}\n`);
            return commandResult(
              failure === "synthesis" ? 1 : 0,
              Buffer.from("不正な音声"),
              stderr,
            );
          }
          return commandResult(args[1]?.includes("import pyopenjtalk") ? 1 : 0);
        });
        const message = {
          venv: "仮想環境を作れませんでした",
          install: "pyopenjtalk-plus の wheel をインストールできませんでした",
          synthesis: "原因の詳細",
          wav: "WAV (RIFF/WAVE) を取得できませんでした",
        }[failure];
        let error: unknown;
        try {
          setupVideoTts(run, "linux", venv);
        } catch (caught) {
          error = caught;
        }
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(message);
        expect((error as Error).message).toContain("video:tts:setup を再実行");
        expect((error as Error).message).not.toContain("ONNX Runtime");
        expect(existsSync(venv)).toBe(false);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );

  it("uv がなく Python 3.14 しか使えないなら対応する版を案内する", () => {
    const root = mkdtempSync(join(tmpdir(), "tts-setup-"));
    try {
      const run = vi.fn((command: string) => commandResult(command === "python3" ? 1 : 127));
      expect(() => setupVideoTts(run, "linux", join(root, ".venv-tts"))).toThrow(
        "Python 3.10〜3.13",
      );
      expect(run).toHaveBeenCalledWith("python3", [
        "-c",
        expect.stringContaining("sys.version_info"),
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
