/**
 * Issue #3 — Anthropic client routes through AI Gateway when configured (TDD).
 */

import { describe, expect, it, vi } from "vitest";

import { completeMessage } from "./anthropic-complete.js";

const anthropicCtor = vi.hoisted(() => vi.fn());
const anthropicCreate = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ content: [{ type: "text", text: "ok" }] }),
);

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: anthropicCreate,
      };

      constructor(config: unknown) {
        anthropicCtor(config);
      }
    },
  };
});

const GATEWAY_ENV = {
  ANTHROPIC_API_KEY: "sk-test",
  CLOUDFLARE_ACCOUNT_ID: "0a0dd103e779842ba2c67cbde20574a0",
  AI_GATEWAY_ID: "stella-ai",
  ANTHROPIC_MODEL: "claude-sonnet-4-6",
} as const;

const DIRECT_ENV = {
  ANTHROPIC_API_KEY: "sk-test",
  ANTHROPIC_MODEL: "claude-sonnet-4-6",
} as const;

describe("completeMessage Anthropic client config", () => {
  it("uses AI Gateway anthropic baseURL when AI_GATEWAY_ID is set", async () => {
    anthropicCtor.mockClear();

    await completeMessage({
      env: GATEWAY_ENV,
      system: "system",
      messages: [{ role: "user", content: "review" }],
    });

    expect(anthropicCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: `https://gateway.ai.cloudflare.com/v1/${GATEWAY_ENV.CLOUDFLARE_ACCOUNT_ID}/${GATEWAY_ENV.AI_GATEWAY_ID}/anthropic`,
      }),
    );
  });

  it("calls Anthropic directly without baseURL when AI_GATEWAY_ID is unset", async () => {
    anthropicCtor.mockClear();

    await completeMessage({
      env: DIRECT_ENV,
      system: "system",
      messages: [{ role: "user", content: "review" }],
    });

    expect(anthropicCtor).toHaveBeenCalledWith({ apiKey: "sk-test" });
  });
});
