import OpenAI from "openai";
import type {
  Response,
  ResponseCreateParamsNonStreaming,
} from "openai/resources/responses/responses";
import {
  type ReviewCompletion,
  type ReviewCompletionArgs,
  ReviewProviderError,
} from "./ai-review-provider.js";

/** OpenAI の API 組織へ直接請求する。ChatGPT のログインや Gateway の課金とは独立。 */
export function openAiReviewRequest(
  args: Omit<ReviewCompletionArgs, "env" | "timeoutMs">,
): ResponseCreateParamsNonStreaming {
  return {
    model: args.model,
    store: false,
    max_output_tokens: args.maxTokens,
    input: [
      {
        role: "developer",
        content: args.prompt.system.map((block) => ({ type: "input_text", text: block.text })),
      },
      ...args.prompt.messages.map((message) => ({
        role: message.role,
        content: message.content.map((block) => ({
          type: "input_text" as const,
          text: block.text,
        })),
      })),
    ],
    text: {
      format: { type: "json_schema", name: "stella_review", strict: true, schema: args.schema },
    },
  };
}

export function normalizeOpenAiCompletion(response: Response): ReviewCompletion {
  const content = response.output.flatMap((item) => (item.type === "message" ? item.content : []));
  return {
    text: content.flatMap((item) => (item.type === "output_text" ? [item.text] : [])).join(""),
    status: content.some((item) => item.type === "refusal")
      ? "refusal"
      : response.status === "completed" &&
          response.output.every((item) => item.type !== "message" || item.status === "completed")
        ? "completed"
        : "incomplete",
    model: response.model,
    usage: {
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
      cacheReadInputTokens: response.usage?.input_tokens_details.cached_tokens ?? null,
      cacheCreationInputTokens: null,
      reasoningTokens: response.usage?.output_tokens_details.reasoning_tokens ?? null,
    },
  };
}

export async function completeOpenAiReview(args: ReviewCompletionArgs): Promise<ReviewCompletion> {
  const client = new OpenAI({
    apiKey: args.env.OPENAI_API_KEY,
    baseURL: "https://api.openai.com/v1",
    organization: null,
    project: null,
    maxRetries: 0,
    timeout: args.timeoutMs,
  });
  try {
    const response = await client.responses.create(openAiReviewRequest(args), {
      signal: AbortSignal.timeout(args.timeoutMs),
    });
    return normalizeOpenAiCompletion(response);
  } catch (error) {
    if (
      error instanceof OpenAI.APIConnectionTimeoutError ||
      error instanceof OpenAI.APIUserAbortError
    )
      throw new ReviewProviderError("openai timeout", "timeout", true);
    if (error instanceof OpenAI.APIConnectionError)
      throw new ReviewProviderError("openai connection error", "error", true);
    if (error instanceof OpenAI.APIError) {
      // クレジット・支出上限の不足は、同じ要求を繰り返しても解消しない。
      const quota =
        error.code === "insufficient_quota" || error.code === "credit_balance_exhausted";
      throw new ReviewProviderError(
        `openai HTTP ${error.status ?? 0}${quota ? " quota exhausted" : ""}`,
        "error",
        !quota && (error.status === 429 || (error.status ?? 0) >= 500),
      );
    }
    throw error;
  }
}
