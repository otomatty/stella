/**
 * Grok non-streaming completion via AI Gateway Unified Billing REST (Issue #204).
 */

import type { ChatRole } from "@falcon/shared/ai/types";

import type { Env } from "../env.js";
import {
  assertAiGatewayRuntimeConfig,
  buildUnifiedBillingChatCompletionsUrl,
  resolveUnifiedBillingGrokModel,
} from "./ai-gateway.js";
import { MissingAiGatewayTokenError } from "./grok-chat.js";

const DEFAULT_GROK_MODEL = "grok-4.6";

interface CompleteGrokArgs {
  env: Pick<
    Env,
    "CLOUDFLARE_ACCOUNT_ID" | "AI_GATEWAY_ID" | "CHAT_MODEL" | "AI_GATEWAY_CF_API_TOKEN"
  >;
  system: string;
  messages: { role: ChatRole; content: string }[];
  model?: string;
  signal?: AbortSignal;
}

export async function completeGrokMessage(args: CompleteGrokArgs): Promise<string> {
  assertAiGatewayRuntimeConfig(args.env);

  const token = args.env.AI_GATEWAY_CF_API_TOKEN;
  if (!token) {
    throw new MissingAiGatewayTokenError();
  }

  const gatewayId = args.env.AI_GATEWAY_ID;
  if (!gatewayId) {
    throw new MissingAiGatewayTokenError();
  }

  const url = buildUnifiedBillingChatCompletionsUrl(args.env);
  const model = resolveUnifiedBillingGrokModel(
    args.model ?? args.env.CHAT_MODEL ?? DEFAULT_GROK_MODEL,
  );

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "cf-aig-gateway-id": gatewayId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: "system", content: args.system }, ...args.messages],
    }),
    signal: args.signal,
  });

  if (!response.ok) {
    throw new Error(`Grok completion failed (${response.status})`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}
