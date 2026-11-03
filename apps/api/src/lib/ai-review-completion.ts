import {
  AI_REVIEW_OUTPUT_SCHEMA,
  type AiFailure,
  type AiReviewOutput,
  parseAiReviewOutput,
} from "@stella/shared/review/ai-review";
import { completeAnthropicReview } from "./ai-review-anthropic.js";
import { completeOpenAiReview } from "./ai-review-openai.js";
import type { BuiltReviewPrompt } from "./ai-review-prompt.js";
import {
  type AiReviewProvider,
  type AiReviewProviderEnv,
  type ReviewCompletion,
  type ReviewCompletionArgs,
  requireReviewCredentials,
  resolveReviewProvider,
  ReviewProviderError,
} from "./ai-review-provider.js";

export const MAX_REVIEW_OUTPUT_TOKENS = 16_000;

/** 本番と評価で同じ入力・スキーマ・出力上限を使う。 */
export function reviewCompletionRequest(prompt: BuiltReviewPrompt, model: string) {
  return { model, prompt, schema: AI_REVIEW_OUTPUT_SCHEMA, maxTokens: MAX_REVIEW_OUTPUT_TOKENS };
}

export type AiCallResult =
  | { ok: true; output: AiReviewOutput; model: string; usage: Record<string, number | null> }
  | { ok: false; failure: AiFailure; retryable: boolean; detail: string; model: string | null };

/** 正常終了とスキーマを両方確かめる。途中まで正しい JSON でも確定に使わない。 */
export function interpretAiCompletion(completion: ReviewCompletion): AiCallResult {
  if (completion.status === "refusal")
    return {
      ok: false,
      failure: "refusal",
      retryable: false,
      detail: "refusal",
      model: completion.model,
    };
  const output = completion.status === "completed" ? parseAiReviewOutput(completion.text) : null;
  if (!output)
    return {
      ok: false,
      failure: "invalid-format",
      retryable: false,
      detail: completion.status,
      model: completion.model,
    };
  return { ok: true, output, model: completion.model, usage: completion.usage };
}

/** 再試行は待ち行列だけが担う。別のプロバイダー・モデルへの自動切り替えはしない。 */
export async function callAiReview(
  env: AiReviewProviderEnv,
  prompt: BuiltReviewPrompt,
  timeoutMs: number,
): Promise<AiCallResult & { provider: AiReviewProvider | null }> {
  let provider: AiReviewProvider | null = null;
  let model: string | null = null;
  try {
    const resolved = resolveReviewProvider(env);
    provider = resolved.provider;
    requireReviewCredentials(env, provider);
    model = resolved.model;
    const args: ReviewCompletionArgs = {
      env,
      ...reviewCompletionRequest(prompt, model),
      timeoutMs,
    };
    const completion = await (provider === "openai"
      ? completeOpenAiReview(args)
      : completeAnthropicReview(args));
    return { ...interpretAiCompletion(completion), provider };
  } catch (error) {
    if (error instanceof ReviewProviderError)
      return {
        ok: false,
        failure: error.failure,
        retryable: error.retryable,
        detail: error.message,
        model,
        provider,
      };
    const timeout =
      error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
    return {
      ok: false,
      failure: timeout ? "timeout" : "error",
      retryable: timeout,
      detail: timeout ? "timeout" : "AI review call failed",
      model,
      provider,
    };
  }
}
