import Anthropic from "@anthropic-ai/sdk";
import type { TextBlockParam } from "@anthropic-ai/sdk/resources/messages/messages.js";
import type { BuiltReviewPrompt, ReviewTextBlock } from "./ai-review-prompt.js";
import {
  ReviewProviderError,
  type ReviewCompletion,
  type ReviewCompletionArgs,
} from "./ai-review-provider.js";
import { completeJsonSchema, type JsonSchemaCompletion } from "./anthropic-complete.js";

/** キャッシュの指定は Anthropic のアダプター内だけで API の形に変換する。 */
function textBlock(block: ReviewTextBlock): TextBlockParam {
  return {
    type: "text",
    text: block.text,
    ...(block.cacheBoundary ? { cache_control: { type: "ephemeral" as const } } : {}),
  };
}

export function anthropicReviewPrompt(prompt: BuiltReviewPrompt) {
  return {
    system: prompt.system.map(textBlock),
    messages: prompt.messages.map((message) => ({
      role: message.role,
      content: message.content.map(textBlock),
    })),
  };
}

export function normalizeAnthropicCompletion(completion: JsonSchemaCompletion): ReviewCompletion {
  return {
    ...completion,
    status:
      completion.stopReason === "refusal"
        ? "refusal"
        : completion.stopReason === "end_turn"
          ? "completed"
          : "incomplete",
  };
}

export async function completeAnthropicReview(
  args: ReviewCompletionArgs,
): Promise<ReviewCompletion> {
  try {
    return normalizeAnthropicCompletion(
      await completeJsonSchema({
        env: args.env,
        model: args.model,
        ...anthropicReviewPrompt(args.prompt),
        schema: args.schema,
        maxTokens: args.maxTokens,
        timeoutMs: args.timeoutMs,
      }),
    );
  } catch (error) {
    if (
      error instanceof Anthropic.APIConnectionTimeoutError ||
      error instanceof Anthropic.APIUserAbortError
    )
      throw new ReviewProviderError("anthropic timeout", "timeout", true);
    if (error instanceof Anthropic.APIConnectionError)
      throw new ReviewProviderError("anthropic connection error", "error", true);
    if (error instanceof Anthropic.APIError)
      throw new ReviewProviderError(
        `anthropic HTTP ${error.status ?? 0}`,
        "error",
        error.status === 429 || (error.status ?? 0) >= 500,
      );
    throw error;
  }
}
