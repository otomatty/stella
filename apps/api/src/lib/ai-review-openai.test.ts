import { afterEach, describe, expect, it, vi } from "vitest";
import { callAiReview } from "./ai-review-completion.js";
import type { BuiltReviewPrompt } from "./ai-review-prompt.js";
import { aiReviewConfigured, type AiReviewProviderEnv } from "./ai-review-provider.js";

const prompt: BuiltReviewPrompt = {
  system: [{ type: "text", text: "レビューの指示", cacheBoundary: true }],
  messages: [{ role: "user", content: [{ type: "text", text: "提出" }] }],
  lines: new Map(),
  variableChars: 2,
};
const env: AiReviewProviderEnv = {
  AI_REVIEW_PROVIDER: "openai",
  AI_REVIEW_MODEL: "selected-model",
  OPENAI_API_KEY: "private-test-key",
  ANTHROPIC_API_KEY: "other-private-key",
  AI_GATEWAY_ID: "gateway",
  CLOUDFLARE_ACCOUNT_ID: "account",
};
const output = {
  rubric: [],
  confidence: "high",
  findings: [],
  learnerReply: { message: "確認しました", goodPoints: [], nextSteps: [] },
};
function response(overrides: Record<string, unknown> = {}) {
  return {
    id: "resp_test",
    object: "response",
    model: "selected-model-snapshot",
    status: "completed",
    output: [
      {
        type: "message",
        role: "assistant",
        status: "completed",
        content: [{ type: "output_text", text: JSON.stringify(output), annotations: [] }],
      },
    ],
    usage: {
      input_tokens: 12,
      output_tokens: 8,
      input_tokens_details: { cached_tokens: 5 },
      output_tokens_details: { reasoning_tokens: 2 },
    },
    ...overrides,
  };
}
function mockResponse(body: unknown, status = 200) {
  const fetch = vi.fn(async () => Response.json(body, { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
afterEach(() => vi.unstubAllGlobals());

describe("OpenAI による一次レビュー (公式 SDK の HTTP 通信を検査)", () => {
  it("直接 Responses API を呼び、厳密なスキーマ・出力上限・保存の無効化を指定する", async () => {
    const fetch = mockResponse(response());
    const result = await callAiReview(env, prompt, 1000);
    expect(result).toMatchObject({
      ok: true,
      provider: "openai",
      model: "selected-model-snapshot",
      output,
      usage: { inputTokens: 12, cacheReadInputTokens: 5, reasoningTokens: 2 },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("https://api.openai.com/v1/responses");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer private-test-key");
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      model: "selected-model",
      store: false,
      max_output_tokens: 16000,
      text: {
        format: { type: "json_schema", strict: true, schema: { additionalProperties: false } },
      },
    });
    expect(body.input.map((m: { role: string }) => m.role)).toEqual(["developer", "user"]);
    expect(init.body).not.toContain("cacheBoundary");
    expect(init.body).not.toContain("cache_control");
  });

  it.each([
    { status: "incomplete", incomplete_details: { reason: "max_output_tokens" } },
    { status: "failed", error: { code: "server_error" } },
    {
      output: [
        {
          type: "message",
          status: "incomplete",
          content: [{ type: "output_text", text: JSON.stringify(output) }],
        },
      ],
    },
    {
      output: [
        { type: "message", status: "completed", content: [{ type: "output_text", text: "{}" }] },
      ],
    },
  ])("正常終了していない応答やスキーマ違反を確定に使わない (%j)", async (overrides) => {
    mockResponse(response(overrides));
    expect(await callAiReview(env, prompt, 1000)).toMatchObject({
      ok: false,
      failure: "invalid-format",
      retryable: false,
    });
  });

  it("拒否を人の確認へ回す", async () => {
    mockResponse(
      response({
        output: [
          {
            type: "message",
            status: "completed",
            content: [{ type: "refusal", refusal: "refused" }],
          },
        ],
      }),
    );
    expect(await callAiReview(env, prompt, 1000)).toMatchObject({
      ok: false,
      failure: "refusal",
      retryable: false,
    });
  });

  it.each([
    [429, "rate_limit_exceeded", true],
    [500, "server_error", true],
    [429, "insufficient_quota", false],
    [429, "credit_balance_exhausted", false],
    [401, "invalid_api_key", false],
    [400, "invalid_json_schema", false],
  ])("HTTP %i / %s の再試行を分類し、SDK 内では再試行しない", async (status, code, retryable) => {
    const fetch = mockResponse(
      { error: { code, message: "秘密の入力を含む可能性がある本文", type: code } },
      status,
    );
    const result = await callAiReview(env, prompt, 1000);
    expect(result).toMatchObject({ ok: false, failure: "error", retryable, provider: "openai" });
    expect(JSON.stringify(result)).not.toContain("秘密の入力");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("時間切れは待ち行列の再試行に任せる", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: unknown, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener(
              "abort",
              () => reject(new DOMException("aborted", "AbortError")),
              { once: true },
            );
          }),
      ),
    );
    expect(await callAiReview(env, prompt, 20)).toMatchObject({
      ok: false,
      failure: "timeout",
      retryable: true,
    });
  });

  it.each([{ OPENAI_API_KEY: " " }, { AI_REVIEW_MODEL: " " }, { AI_REVIEW_PROVIDER: "opneai" }])(
    "設定不備では他サービスを呼ばない (%j)",
    async (overrides) => {
      const fetch = mockResponse(response());
      expect(aiReviewConfigured({ ...env, ...overrides })).toBe(false);
      expect(await callAiReview({ ...env, ...overrides }, prompt, 1000)).toMatchObject({
        ok: false,
        failure: "unavailable",
        retryable: false,
      });
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("OpenAI は Anthropic の鍵や Gateway に依存しない", () => {
    expect(aiReviewConfigured({ ...env, ANTHROPIC_API_KEY: "", CLOUDFLARE_ACCOUNT_ID: "" })).toBe(
      true,
    );
    expect(
      aiReviewConfigured({ ...env, AI_REVIEW_PROVIDER: "anthropic", CLOUDFLARE_ACCOUNT_ID: "" }),
    ).toBe(false);
  });
});
