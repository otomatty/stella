/**
 * Issue #204 — Cloudflare AI Gateway URL construction (TDD; module not implemented yet).
 */

import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";

import {
  buildAnthropicGatewayBaseUrl,
  buildUnifiedBillingChatCompletionsUrl,
  resolveAnthropicClientConfig,
  resolveUnifiedBillingGrokModel,
  MissingGatewayConfigError,
} from "./ai-gateway.js";

/** wrangler.toml account_id / deploy CLOUDFLARE_ACCOUNT_ID convention. */
const ACCOUNT_ID = "0a0dd103e779842ba2c67cbde20574a0";
const GATEWAY_ID = "stella-ai";

describe("buildAnthropicGatewayBaseUrl", () => {
  it("constructs unified anthropic proxy URL from account and gateway env vars", () => {
    expect(
      buildAnthropicGatewayBaseUrl({
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
        AI_GATEWAY_ID: GATEWAY_ID,
      }),
    ).toBe(`https://gateway.ai.cloudflare.com/v1/${ACCOUNT_ID}/${GATEWAY_ID}/anthropic`);
  });
});

describe("buildUnifiedBillingChatCompletionsUrl", () => {
  it("constructs Unified Billing chat completions REST endpoint", () => {
    expect(
      buildUnifiedBillingChatCompletionsUrl({
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
      }),
    ).toBe(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/v1/chat/completions`);
  });
});

describe("resolveUnifiedBillingGrokModel", () => {
  it("maps grok shorthand to xai provider prefix", () => {
    expect(resolveUnifiedBillingGrokModel("grok-4.6")).toBe("xai/grok-4.6");
  });

  it("passes through already-qualified model ids", () => {
    expect(resolveUnifiedBillingGrokModel("xai/grok-4.6")).toBe("xai/grok-4.6");
  });
});

describe("resolveAnthropicClientConfig", () => {
  it("omits baseURL when AI_GATEWAY_ID is unset (direct Anthropic)", () => {
    expect(
      resolveAnthropicClientConfig({
        ANTHROPIC_API_KEY: "sk-test",
      }),
    ).toEqual({ apiKey: "sk-test" });
  });

  it("sets Anthropic SDK baseURL to the gateway anthropic proxy when AI_GATEWAY_ID is set", () => {
    expect(
      resolveAnthropicClientConfig({
        ANTHROPIC_API_KEY: "sk-test",
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
        AI_GATEWAY_ID: GATEWAY_ID,
      }),
    ).toEqual({
      apiKey: "sk-test",
      baseURL: `https://gateway.ai.cloudflare.com/v1/${ACCOUNT_ID}/${GATEWAY_ID}/anthropic`,
      defaultHeaders: { "X-Api-Key": "sk-test", Authorization: null },
    });
  });

  it("fails closed when AI_GATEWAY_ID is set without runtime CLOUDFLARE_ACCOUNT_ID", () => {
    expect(() =>
      resolveAnthropicClientConfig({
        ANTHROPIC_API_KEY: "sk-test",
        AI_GATEWAY_ID: GATEWAY_ID,
      }),
    ).toThrow(MissingGatewayConfigError);
  });
});

/** 実際の SDK に設定を渡し、送られるヘッダーを確かめる (SDK 1.x で認証ヘッダーの既定が変わったため)。 */
async function sentHeaders(env: Parameters<typeof resolveAnthropicClientConfig>[0]) {
  const requests: Request[] = [];
  const client = new Anthropic({
    ...resolveAnthropicClientConfig(env),
    maxRetries: 0,
    fetch: async (input: string | URL | Request, init?: RequestInit) => {
      requests.push(new Request(input, init));
      return new Response(
        JSON.stringify({
          id: "msg_test",
          type: "message",
          role: "assistant",
          model: "claude-sonnet-4-6",
          content: [{ type: "text", text: "ok" }],
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });
  await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16,
    messages: [{ role: "user", content: "hi" }],
  });
  expect(requests).toHaveLength(1);
  const [request] = requests;
  if (!request) throw new Error("request was not sent");
  return { url: request.url, headers: request.headers };
}

describe("Anthropic SDK の認証ヘッダー", () => {
  it("ゲートウェイ経由では x-api-key だけでキーを送る", async () => {
    const { url, headers } = await sentHeaders({
      ANTHROPIC_API_KEY: "sk-test",
      CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
      AI_GATEWAY_ID: GATEWAY_ID,
    });
    expect(url).toBe(
      `https://gateway.ai.cloudflare.com/v1/${ACCOUNT_ID}/${GATEWAY_ID}/anthropic/v1/messages`,
    );
    expect(headers.get("x-api-key")).toBe("sk-test");
    expect(headers.has("authorization")).toBe(false);
  });

  it("直接呼ぶときは SDK の既定 (Authorization: Bearer) で送る", async () => {
    const { url, headers } = await sentHeaders({ ANTHROPIC_API_KEY: "sk-test" });
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(headers.get("authorization")).toBe("Bearer sk-test");
    expect(headers.has("x-api-key")).toBe(false);
  });
});
