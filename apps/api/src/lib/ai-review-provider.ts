import type { AiFailure } from "@stella/shared/review/ai-review";
import type { Env } from "../env.js";
import type { BuiltReviewPrompt } from "./ai-review-prompt.js";
import { resolveAnthropicModel } from "./anthropic-complete.js";

export type AiReviewProvider = "anthropic" | "openai";

export type AiReviewProviderEnv = Pick<
  Env,
  | "AI_REVIEW_PROVIDER"
  | "AI_REVIEW_MODEL"
  | "ANTHROPIC_MODEL"
  | "ANTHROPIC_API_KEY"
  | "OPENAI_API_KEY"
  | "AI_GATEWAY_ID"
  | "CLOUDFLARE_ACCOUNT_ID"
>;

/** 通信元に依存しない完了。正常終了以外の本文は判定に使わない。 */
export interface ReviewCompletion {
  text: string;
  status: "completed" | "refusal" | "incomplete";
  model: string;
  usage: Record<string, number | null>;
}

export interface ReviewCompletionArgs {
  env: AiReviewProviderEnv;
  model: string;
  prompt: BuiltReviewPrompt;
  schema: Record<string, unknown>;
  maxTokens: number;
  timeoutMs: number;
}

export class ReviewProviderError extends Error {
  constructor(
    message: string,
    readonly failure: AiFailure = "error",
    readonly retryable = false,
  ) {
    super(message);
    this.name = "ReviewProviderError";
  }
}

/** 接続先の誤記やモデル未指定で、別のプロバイダーを呼ばない。 */
export function resolveReviewProvider(env: AiReviewProviderEnv): {
  provider: AiReviewProvider;
  model: string;
} {
  const provider = env.AI_REVIEW_PROVIDER?.trim() || "anthropic";
  if (provider !== "anthropic" && provider !== "openai")
    throw new ReviewProviderError(
      "AI_REVIEW_PROVIDER は anthropic / openai を指定してください",
      "unavailable",
    );
  if (provider === "openai") {
    const model = env.AI_REVIEW_MODEL?.trim();
    if (!model)
      throw new ReviewProviderError("OpenAI では AI_REVIEW_MODEL が必要です", "unavailable");
    return { provider, model };
  }
  return { provider, model: resolveAnthropicModel(env, env.AI_REVIEW_MODEL?.trim()) };
}

export function requireReviewCredentials(
  env: AiReviewProviderEnv,
  provider: AiReviewProvider,
): void {
  const keyName = provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
  if (!env[keyName]?.trim())
    throw new ReviewProviderError(`${keyName} が未設定です`, "unavailable");
  if (provider === "anthropic" && env.AI_GATEWAY_ID && !env.CLOUDFLARE_ACCOUNT_ID?.trim())
    throw new ReviewProviderError("AI Gateway に CLOUDFLARE_ACCOUNT_ID が必要です", "unavailable");
}

export function aiReviewConfigured(env: AiReviewProviderEnv): boolean {
  try {
    requireReviewCredentials(env, resolveReviewProvider(env).provider);
    return true;
  } catch {
    return false;
  }
}
