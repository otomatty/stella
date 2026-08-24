/**
 * Cloudflare AI Gateway URL helpers (Issue #204).
 */

import type { Env } from "../env.js";

type GatewayEnv = Pick<Env, "CLOUDFLARE_ACCOUNT_ID" | "AI_GATEWAY_ID">;
type AnthropicClientEnv = Pick<
  Env,
  "ANTHROPIC_API_KEY" | "CLOUDFLARE_ACCOUNT_ID" | "AI_GATEWAY_ID"
>;

export class MissingGatewayConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingGatewayConfigError";
  }
}

/** Fail closed when gateway is enabled without a runtime account id binding. */
export function assertAiGatewayRuntimeConfig(
  env: Pick<Env, "AI_GATEWAY_ID" | "CLOUDFLARE_ACCOUNT_ID">,
): void {
  if (env.AI_GATEWAY_ID && !env.CLOUDFLARE_ACCOUNT_ID) {
    throw new MissingGatewayConfigError(
      "AI_GATEWAY_ID is set but CLOUDFLARE_ACCOUNT_ID is missing (wrangler.toml account_id is not a runtime binding)",
    );
  }
}

export function buildAnthropicGatewayBaseUrl(env: GatewayEnv): string {
  assertAiGatewayRuntimeConfig(env);
  return `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.AI_GATEWAY_ID}/anthropic`;
}

/** Unified Billing chat completions REST endpoint (Grok / third-party via AI Gateway). */
export function buildUnifiedBillingChatCompletionsUrl(
  env: Pick<Env, "CLOUDFLARE_ACCOUNT_ID">,
): string {
  return `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`;
}

/** Map CHAT_MODEL shorthand (grok-4.6) to Unified Billing provider id (xai/grok-4.6). */
export function resolveUnifiedBillingGrokModel(model: string): string {
  if (model.includes("/")) {
    return model;
  }
  if (model.startsWith("grok-")) {
    return `xai/${model}`;
  }
  return model;
}

export function resolveAnthropicClientConfig(env: AnthropicClientEnv): {
  apiKey: string;
  baseURL?: string;
} {
  assertAiGatewayRuntimeConfig(env);

  const config: { apiKey: string; baseURL?: string } = {
    apiKey: env.ANTHROPIC_API_KEY,
  };
  if (env.AI_GATEWAY_ID) {
    config.baseURL = buildAnthropicGatewayBaseUrl({
      CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID as string,
      AI_GATEWAY_ID: env.AI_GATEWAY_ID,
    });
  }
  return config;
}

/** Guard against the legacy Workers AI URL shape forbidden by Issue #204. */
export function assertGatewayRequestUrlNotWorkersAiPath(url: string): void {
  if (url.includes("/workers-ai/") || url.includes("/ai/run/@cf/")) {
    throw new Error("Forbidden workers-ai direct URL shape");
  }
}
