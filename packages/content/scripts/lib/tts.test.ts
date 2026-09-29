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
  pcmToWav,
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

describe("withRetry", () => {
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

  it("最大 5 回待ったら諦める", async () => {
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
    expect(sleep).toHaveBeenCalledTimes(5);
  });
});

describe("gemini プロバイダ", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
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
