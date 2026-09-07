/**
 * Grok chat via Cloudflare AI Gateway Unified Billing REST (Issue #204).
 */

import type { ChatRole, ChatStreamEvent } from "@stella/shared/ai/types";

import type { Env } from "../env.js";
import {
  assertAiGatewayRuntimeConfig,
  buildUnifiedBillingChatCompletionsUrl,
  resolveUnifiedBillingGrokModel,
} from "./ai-gateway.js";

const DEFAULT_GROK_MODEL = "grok-4.6";

interface StreamGrokChatArgs {
  env: Pick<
    Env,
    "CLOUDFLARE_ACCOUNT_ID" | "AI_GATEWAY_ID" | "CHAT_MODEL" | "AI_GATEWAY_CF_API_TOKEN"
  >;
  system: string;
  messages: { role: ChatRole; content: string }[];
  model?: string;
  signal?: AbortSignal;
}

export class MissingAiGatewayTokenError extends Error {
  constructor() {
    super("AI_GATEWAY_CF_API_TOKEN が設定されていません");
    this.name = "MissingAiGatewayTokenError";
  }
}

export async function* streamGrokChat(
  args: StreamGrokChatArgs,
): AsyncGenerator<ChatStreamEvent, void, unknown> {
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
      stream: true,
      messages: [{ role: "system", content: args.system }, ...args.messages],
    }),
    signal: args.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Grok chat failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") {
        yield { type: "done" };
        return;
      }
      try {
        const parsed = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          yield { type: "text", delta };
        }
      } catch {
        // ignore malformed SSE chunks
      }
    }
  }

  yield { type: "done" };
}
