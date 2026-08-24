/**
 * Issue #204 — skill sheet parse stays on Anthropic via AI Gateway (TDD).
 */

import { describe, expect, it, vi } from "vitest";

import { parseSkillSheetFromPdf } from "./skill-sheet-parse.js";
import { resolveAnthropicClientConfig } from "./ai-gateway.js";

const GATEWAY_ENV = {
  ANTHROPIC_API_KEY: "test-key",
  CLOUDFLARE_ACCOUNT_ID: "0a0dd103e779842ba2c67cbde20574a0",
  AI_GATEWAY_ID: "falcon-ai",
} as const;

const emptyDraftJson = JSON.stringify({
  sections: {
    basic: {},
    skills: [],
    projects: [],
    certifications: [],
    self_pr: "",
  },
});

describe("parseSkillSheetFromPdf with AI Gateway", () => {
  it("passes gateway env through the shared Anthropic client when AI_GATEWAY_ID is set", async () => {
    const completeStructuredMessage = vi.fn().mockResolvedValue(emptyDraftJson);

    await parseSkillSheetFromPdf({
      pdfBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      env: GATEWAY_ENV,
      completeStructuredMessage,
    });

    expect(completeStructuredMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        env: expect.objectContaining({
          AI_GATEWAY_ID: GATEWAY_ENV.AI_GATEWAY_ID,
          CLOUDFLARE_ACCOUNT_ID: GATEWAY_ENV.CLOUDFLARE_ACCOUNT_ID,
        }),
      }),
    );

    expect(
      resolveAnthropicClientConfig({
        ANTHROPIC_API_KEY: GATEWAY_ENV.ANTHROPIC_API_KEY,
        CLOUDFLARE_ACCOUNT_ID: GATEWAY_ENV.CLOUDFLARE_ACCOUNT_ID,
        AI_GATEWAY_ID: GATEWAY_ENV.AI_GATEWAY_ID,
      }),
    ).toEqual(
      expect.objectContaining({
        baseURL: expect.stringContaining("/anthropic"),
      }),
    );
  });

  it("does not route skill sheet parse to Grok when CHAT_PROVIDER=grok", async () => {
    const completeStructuredMessage = vi.fn().mockResolvedValue(emptyDraftJson);
    const completeGrokMessage = vi.fn();

    await parseSkillSheetFromPdf({
      pdfBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      env: {
        ...GATEWAY_ENV,
        CHAT_PROVIDER: "grok",
        CHAT_MODEL: "grok-4.6",
      },
      completeStructuredMessage,
      // @ts-expect-error grok injection must never be wired for skill sheet parse
      completeGrokMessage,
    });

    expect(completeStructuredMessage).toHaveBeenCalled();
    expect(completeGrokMessage).not.toHaveBeenCalled();
  });
});
