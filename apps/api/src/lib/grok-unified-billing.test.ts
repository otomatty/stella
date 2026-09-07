/**
 * Issue #204 — Grok Unified Billing REST (TDD).
 */

import { describe, expect, it, vi } from "vitest";

import { completeGrokMessage } from "./grok-complete.js";
import { streamGrokChat } from "./grok-chat.js";

const ACCOUNT_ID = "0a0dd103e779842ba2c67cbde20574a0";
const GATEWAY_ID = "stella-ai";

describe("streamGrokChat Unified Billing", () => {
  it("POSTs to ai/v1/chat/completions with cf-aig-gateway-id and xai/grok model", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("data: [DONE]\n\n", {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const iter = streamGrokChat({
      env: {
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
        AI_GATEWAY_ID: GATEWAY_ID,
        AI_GATEWAY_CF_API_TOKEN: "gateway-token",
        CHAT_MODEL: "grok-4.6",
      },
      system: "sys",
      messages: [{ role: "user", content: "hi" }],
    });
    for await (const _ of iter) {
      // drain
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/v1/chat/completions`,
    );
    expect(url).not.toMatch(/\/grok/);
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer gateway-token");
    expect(headers.get("cf-aig-gateway-id")).toBe(GATEWAY_ID);
    const body = JSON.parse(init.body as string) as { model: string; stream: boolean };
    expect(body.model).toBe("xai/grok-4.6");
    expect(body.stream).toBe(true);

    vi.unstubAllGlobals();
  });
});

describe("completeGrokMessage Unified Billing", () => {
  it("POSTs to ai/v1/chat/completions without stream", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await completeGrokMessage({
      env: {
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
        AI_GATEWAY_ID: GATEWAY_ID,
        AI_GATEWAY_CF_API_TOKEN: "gateway-token",
        CHAT_MODEL: "grok-4.6",
      },
      system: "sys",
      messages: [{ role: "user", content: "review" }],
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { model: string; stream: boolean };
    expect(body.model).toBe("xai/grok-4.6");
    expect(body.stream).toBe(false);

    vi.unstubAllGlobals();
  });
});
