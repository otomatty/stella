/**
 * Chat provider selection for SSE chat / review-draft (Issue #204).
 */

import type { Env } from "../env.js";
import { assertAiGatewayRuntimeConfig } from "./ai-gateway.js";
import { ApiError } from "./authz.js";

export type ChatProvider = "anthropic" | "grok";

type ChatProviderEnv = Pick<
  Env,
  "CHAT_PROVIDER" | "CHAT_MODEL" | "AI_GATEWAY_ID" | "CLOUDFLARE_ACCOUNT_ID"
>;

export function resolveChatProvider(env: ChatProviderEnv): ChatProvider {
  if (env.CHAT_PROVIDER === "grok") {
    return "grok";
  }
  return "anthropic";
}

export function assertGrokGatewayConfigured(env: ChatProviderEnv): void {
  if (resolveChatProvider(env) !== "grok") {
    return;
  }
  if (!env.AI_GATEWAY_ID) {
    throw new ApiError("Grok chat requires AI Gateway (AI_GATEWAY_ID)", 503);
  }
  assertAiGatewayRuntimeConfig(env);
}
