/**
 * Issue #204 — Cloudflare AI Gateway URL construction (TDD; module not implemented yet).
 */

import { describe, expect, it } from "vitest";

import {
  buildAnthropicGatewayBaseUrl,
  buildUnifiedBillingChatCompletionsUrl,
  resolveAnthropicClientConfig,
  resolveUnifiedBillingGrokModel,
  assertGatewayRequestUrlNotWorkersAiPath,
  MissingGatewayConfigError,
} from "./ai-gateway.js";

/** wrangler.toml account_id / deploy CLOUDFLARE_ACCOUNT_ID convention. */
const ACCOUNT_ID = "0a0dd103e779842ba2c67cbde20574a0";
const GATEWAY_ID = "falcon-ai";

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

describe("assertGatewayRequestUrlNotWorkersAiPath", () => {
  it("rejects the Issue-forbidden workers-ai URL shape", () => {
    expect(() =>
      assertGatewayRequestUrlNotWorkersAiPath(
        `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/openai/whisper`,
      ),
    ).toThrow(/workers-ai|forbidden/i);

    expect(() =>
      assertGatewayRequestUrlNotWorkersAiPath(
        `https://gateway.ai.cloudflare.com/v1/${ACCOUNT_ID}/${GATEWAY_ID}/anthropic`,
      ),
    ).not.toThrow();
  });
});
