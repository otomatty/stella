/**
 * Issue #204 — chat provider switch layer (TDD; module not implemented yet).
 */

import { describe, expect, it } from "vitest";

import { MissingGatewayConfigError } from "./ai-gateway.js";
import { resolveChatProvider, assertGrokGatewayConfigured } from "./chat-provider.js";

const GATEWAY_ENV = {
  CLOUDFLARE_ACCOUNT_ID: "0a0dd103e779842ba2c67cbde20574a0",
  AI_GATEWAY_ID: "stella-ai",
} as const;

describe("resolveChatProvider", () => {
  it("defaults to anthropic when CHAT_PROVIDER is unset (CI default)", () => {
    expect(resolveChatProvider({})).toBe("anthropic");
    expect(resolveChatProvider({ CHAT_MODEL: "claude-sonnet-4-6" })).toBe("anthropic");
  });

  it("selects grok when CHAT_PROVIDER=grok and CHAT_MODEL=grok-4.6", () => {
    expect(
      resolveChatProvider({
        CHAT_PROVIDER: "grok",
        CHAT_MODEL: "grok-4.6",
        ...GATEWAY_ENV,
      }),
    ).toBe("grok");
  });
});

describe("assertGrokGatewayConfigured", () => {
  it("allows grok when AI_GATEWAY_ID is set", () => {
    expect(() =>
      assertGrokGatewayConfigured({
        CHAT_PROVIDER: "grok",
        ...GATEWAY_ENV,
      }),
    ).not.toThrow();
  });

  it("signals 503 when CHAT_PROVIDER=grok but AI Gateway is unset", () => {
    expect(() =>
      assertGrokGatewayConfigured({
        CHAT_PROVIDER: "grok",
        CHAT_MODEL: "grok-4.6",
      }),
    ).toThrow(expect.objectContaining({ status: 503 }));
  });

  it("fails closed when CHAT_PROVIDER=grok and AI_GATEWAY_ID lacks runtime account id", () => {
    expect(() =>
      assertGrokGatewayConfigured({
        CHAT_PROVIDER: "grok",
        CHAT_MODEL: "grok-4.6",
        AI_GATEWAY_ID: "stella-ai",
      }),
    ).toThrow(MissingGatewayConfigError);
  });
});
