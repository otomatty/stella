/**
 * 面談対策の音声 (TTS / 文字起こし) が AI Gateway を通ることの回帰テスト (Issue #204)。
 * Gateway が構成されていれば Gateway 経由、 未構成なら直叩き REST にフォールバックする。
 */

import { describe, expect, it, vi } from "vitest";

import type { Env } from "../env.js";
import {
  buildTtsInput,
  synthesizeSpeech,
  transcribeAudio,
  workersAiConfigured,
} from "./workers-ai.js";

const ACCOUNT_ID = "0a0dd103e779842ba2c67cbde20574a0";

function envWithGateway(): Env {
  return {
    CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
    AI_GATEWAY_ID: "falcon-ai",
    AI_GATEWAY_CF_API_TOKEN: "cf-gateway-token",
  } as unknown as Env;
}

function envDirectOnly(): Env {
  return {
    CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
    WORKERS_AI_API_TOKEN: "workers-ai-token",
  } as unknown as Env;
}

describe("workersAiConfigured", () => {
  it("Gateway だけでも直叩きトークンだけでも有効", () => {
    expect(workersAiConfigured(envWithGateway())).toBe(true);
    expect(workersAiConfigured(envDirectOnly())).toBe(true);
  });

  it("アカウント ID もトークンも無ければ無効 (音声のみ 503)", () => {
    expect(workersAiConfigured({} as Env)).toBe(false);
    expect(workersAiConfigured({ CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID } as unknown as Env)).toBe(
      false,
    );
  });
});

describe("Gateway 経由 (AI_GATEWAY_ID 構成時)", () => {
  it("TTS は cf-aig-gateway-id を付け、 禁止 URL 形状を使わない", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: { audio: btoa("mp3") } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await synthesizeSpeech(envWithGateway(), "自己紹介をお願いします", "ja");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).not.toMatch(/\/ai\/run\/@cf\//);
    expect(url).not.toMatch(/\/workers-ai\//);
    expect(new Headers(init.headers).get("cf-aig-gateway-id")).toBe("falcon-ai");
    // モデル名は URL ではなく body に載せる。 既定は Unified Billing の Grok TTS。
    const body = JSON.parse(init.body as string) as {
      model?: string;
      input?: { text?: string; voice?: string; language?: string };
    };
    expect(body.model).toBe("xai/grok-tts");
    expect(body.input?.text).toBe("自己紹介をお願いします");
    expect(body.input?.voice).toBe("eve");
    expect(body.input?.language).toBe("ja");

    vi.unstubAllGlobals();
  });

  it("INTERVIEW_TTS_MODEL で Workers AI 自前モデルへ差し替えられる", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ audio: btoa("mp3") }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const env = { ...envWithGateway(), INTERVIEW_TTS_MODEL: "@cf/myshell-ai/melotts" } as Env;
    await synthesizeSpeech(env, "自己紹介をお願いします", "ja");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      model?: string;
      input?: { prompt?: string; lang?: string };
    };
    expect(body.model).toBe("@cf/myshell-ai/melotts");
    // MeloTTS は text/voice ではなく prompt/lang 形式
    expect(body.input?.prompt).toBe("自己紹介をお願いします");
    expect(body.input?.lang).toBe("ja");

    vi.unstubAllGlobals();
  });

  it("文字起こしも Gateway を通り、 素の { text } レスポンスを読める", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ text: " こんにちは " }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await transcribeAudio(envWithGateway(), new Uint8Array([1, 2, 3]));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).not.toMatch(/\/ai\/run\/@cf\//);
    expect(new Headers(init.headers).get("cf-aig-gateway-id")).toBe("falcon-ai");
    expect(result.text).toBe("こんにちは");

    vi.unstubAllGlobals();
  });
});

describe("直叩きフォールバック (AI_GATEWAY_ID 未設定時)", () => {
  it("Gateway ヘッダを付けず、 モデル名を URL に載せる", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ result: { text: "テスト" } }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await transcribeAudio(envDirectOnly(), new Uint8Array([1, 2, 3]));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/ai/run/@cf/openai/whisper-large-v3-turbo");
    expect(new Headers(init.headers).get("cf-aig-gateway-id")).toBeNull();
    expect(result.text).toBe("テスト");

    vi.unstubAllGlobals();
  });

  it("Grok TTS は Gateway 必須なので直叩きせず 503 で落とす", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(synthesizeSpeech(envDirectOnly(), "自己紹介をお願いします", "ja")).rejects.toThrow(
      /AI Gateway/,
    );
    // `/ai/run/xai/grok-tts` を叩いて 404 になるのではなく、 設定不足として即落ちる。
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("Workers AI 自前 TTS なら直叩きでも動く", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: { audio: btoa("mp3") } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const env = { ...envDirectOnly(), INTERVIEW_TTS_MODEL: "@cf/myshell-ai/melotts" } as Env;
    await synthesizeSpeech(env, "自己紹介をお願いします", "ja");

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/ai/run/@cf/myshell-ai/melotts");

    vi.unstubAllGlobals();
  });
});

describe("失敗時の診断情報", () => {
  it("既定の読み上げ失敗は上流本文を ApiError に載せない", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ message: "Unified billing is not enabled" }] }), {
        status: 401,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      synthesizeSpeech(envWithGateway(), "自己紹介をお願いします", "ja"),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof Error &&
        /401/.test(err.message) &&
        !err.message.includes("Unified billing is not enabled"),
    );

    vi.unstubAllGlobals();
  });

  it("診断付きの読み上げ失敗は上流本文を ApiError に載せる", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ message: "Unified billing is not enabled" }] }), {
        status: 401,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      synthesizeSpeech(envWithGateway(), "自己紹介をお願いします", "ja", true),
    ).rejects.toThrow(/401.*Unified billing is not enabled/);

    vi.unstubAllGlobals();
  });

  it("文字起こしの失敗は上流本文を ApiError に載せない", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ message: "Unified billing is not enabled" }] }), {
        status: 401,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(transcribeAudio(envWithGateway(), new Uint8Array([1, 2, 3]))).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof Error &&
        /401/.test(err.message) &&
        !err.message.includes("Unified billing is not enabled"),
    );

    vi.unstubAllGlobals();
  });

  it("JSON に audio が無いときは返却キーをエラーに含める", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, result: { duration: 1.2 } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      synthesizeSpeech(envWithGateway(), "自己紹介をお願いします", "ja"),
    ).rejects.toThrow(/keys=\[success,result\].*result\.keys=\[duration\]/);

    vi.unstubAllGlobals();
  });
});

describe("buildTtsInput", () => {
  it("モデルごとに入力スキーマを組み替える", () => {
    expect(buildTtsInput("xai/grok-tts", "本文", "ja", "rex")).toEqual({
      text: "本文",
      voice: "rex",
      language: "ja",
    });
    expect(buildTtsInput("openai/tts-1", "本文", "ja")).toEqual({
      input: "本文",
      voice: "alloy",
    });
    expect(buildTtsInput("@cf/deepgram/aura-2-en", "本文", "en", "thalia")).toEqual({
      text: "本文",
      speaker: "thalia",
    });
    expect(buildTtsInput("@cf/myshell-ai/melotts", "本文", "ja")).toEqual({
      prompt: "本文",
      lang: "ja",
    });
  });
});

describe("モデル呼び出しの上限 (#237)", () => {
  const directEnv = {
    CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
    WORKERS_AI_API_TOKEN: "token",
    INTERVIEW_TTS_MODEL: "@cf/myshell-ai/melotts",
  } as unknown as Env;

  const jsonOnce = (body: unknown) =>
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } }),
      );

  it("読み上げには上限を掛ける (ロックの保持時間を見積もれるようにする)", async () => {
    const fetchMock = jsonOnce({ result: { audio: btoa("mp3") } });
    vi.stubGlobal("fetch", fetchMock);

    await synthesizeSpeech(directEnv, "読み上げる本文", "ja");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("文字起こしには上限を掛けない (10 分超の録音を途中で切らない)", async () => {
    const fetchMock = jsonOnce({ result: { text: "こんにちは" } });
    vi.stubGlobal("fetch", fetchMock);

    await transcribeAudio(directEnv, new Uint8Array([1, 2, 3]));

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.signal).toBeUndefined();
  });
});
