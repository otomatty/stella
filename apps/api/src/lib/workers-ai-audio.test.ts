/**
 * Issue #204 — Workers AI audio via AI Gateway (TDD; module not implemented yet).
 */

import { describe, expect, it, vi } from "vitest";

import { transcribeAudioViaGateway } from "./workers-ai-audio.js";

const ACCOUNT_ID = "0a0dd103e779842ba2c67cbde20574a0";
const GATEWAY_ID = "falcon-ai";

describe("transcribeAudioViaGateway", () => {
  it("sends cf-aig-gateway-id header when AI_GATEWAY_ID is set", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ text: "hello" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await transcribeAudioViaGateway({
      audioBytes: new Uint8Array([1, 2, 3]),
      env: {
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
        AI_GATEWAY_ID: GATEWAY_ID,
        AI_GATEWAY_CF_API_TOKEN: "cf-token",
      },
      model: "@cf/openai/whisper",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get("cf-aig-gateway-id")).toBe(GATEWAY_ID);

    vi.unstubAllGlobals();
  });

  it("must not call the Issue-forbidden workers-ai direct URL shape", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ text: "hello" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await transcribeAudioViaGateway({
      audioBytes: new Uint8Array([1, 2, 3]),
      env: {
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
        AI_GATEWAY_ID: GATEWAY_ID,
        AI_GATEWAY_CF_API_TOKEN: "cf-token",
      },
      model: "@cf/openai/whisper",
    });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).not.toMatch(/\/workers-ai\//);
    expect(url).not.toMatch(/\/ai\/run\/@cf\//);

    vi.unstubAllGlobals();
  });

  it("sends model and audio under input per AI Gateway REST", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ text: "hello" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const audioBytes = new Uint8Array([1, 2, 3]);
    await transcribeAudioViaGateway({
      audioBytes,
      env: {
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
        AI_GATEWAY_ID: GATEWAY_ID,
        AI_GATEWAY_CF_API_TOKEN: "cf-token",
      },
      model: "@cf/openai/whisper",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      model?: string;
      audio?: unknown;
      input?: { audio?: string };
    };
    expect(body.model).toBe("@cf/openai/whisper");
    expect(body.audio).toBeUndefined();
    expect(body.input?.audio).toBe(btoa(String.fromCharCode(...audioBytes)));

    vi.unstubAllGlobals();
  });
});
