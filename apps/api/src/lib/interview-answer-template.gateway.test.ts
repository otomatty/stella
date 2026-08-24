/**
 * Issue #206 — personal answer template generation stays on Anthropic / Gateway (TDD).
 */

import { describe, expect, it, vi } from "vitest";

import { resolveAnthropicClientConfig } from "./ai-gateway.js";
import { submitPersonalTemplateGenerationBatch } from "./interview-answer-template.js";

const GATEWAY_ENV = {
  ANTHROPIC_API_KEY: "test-key",
  CLOUDFLARE_ACCOUNT_ID: "0a0dd103e779842ba2c67cbde20574a0",
  AI_GATEWAY_ID: "falcon-ai",
} as const;

describe("submitPersonalTemplateGenerationBatch with AI Gateway (#206)", () => {
  it("routes batch submission through the shared Anthropic client config when AI_GATEWAY_ID is set", async () => {
    const createMessageBatch = vi.fn().mockResolvedValue({ id: "batch_gateway" });

    await submitPersonalTemplateGenerationBatch({
      env: { ...GATEWAY_ENV, CHAT_PROVIDER: "anthropic" },
      tenantId: "ses",
      profileId: "seed-learner",
      skillSheetId: "sheet-1",
      questionNos: [101],
      createMessageBatch,
      insertGenerationJob: vi.fn(),
    });

    expect(createMessageBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        clientConfig: resolveAnthropicClientConfig(GATEWAY_ENV),
      }),
    );
  });

  it("does not route personal template generation to Grok when CHAT_PROVIDER=grok", async () => {
    const createMessageBatch = vi.fn().mockResolvedValue({ id: "batch_claude_only" });
    const createGrokBatch = vi.fn();

    await submitPersonalTemplateGenerationBatch({
      env: {
        ...GATEWAY_ENV,
        CHAT_PROVIDER: "grok",
        CHAT_MODEL: "grok-4.6",
      },
      tenantId: "ses",
      profileId: "seed-learner",
      skillSheetId: "sheet-1",
      questionNos: [101],
      createMessageBatch,
      // @ts-expect-error grok batch injection must never be wired for answer templates
      createGrokBatch,
      insertGenerationJob: vi.fn(),
    });

    expect(createMessageBatch).toHaveBeenCalled();
    expect(createGrokBatch).not.toHaveBeenCalled();
  });
});
