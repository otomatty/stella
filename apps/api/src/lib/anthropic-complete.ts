/**
 * 非ストリーミングの Anthropic 完了 (JSON 応答用)。
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages/messages.js";
import type { ChatRole } from "@falcon/shared/ai/types";

import type { Env } from "../env.js";
import { resolveAnthropicClientConfig } from "./ai-gateway.js";
import { MissingApiKeyError } from "./anthropic.js";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2048;
/** Cloudflare Workers CPU 制限に合わせて chat ストリームより短めに設定 */
const REQUEST_TIMEOUT_MS = 25_000;

type AnthropicEnv = Pick<
  Env,
  "ANTHROPIC_API_KEY" | "ANTHROPIC_MODEL" | "CLOUDFLARE_ACCOUNT_ID" | "AI_GATEWAY_ID"
>;

interface CompleteArgs {
  env: AnthropicEnv;
  system: string;
  messages: { role: ChatRole; content: string }[];
  signal?: AbortSignal;
}

export interface StructuredCompleteArgs {
  env: AnthropicEnv;
  system: string;
  messages: { role: ChatRole; content: string | ContentBlockParam[] }[];
  signal?: AbortSignal;
}

async function createCompletion(args: StructuredCompleteArgs): Promise<string> {
  const apiKey = args.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new MissingApiKeyError();
  }

  const client = new Anthropic(
    resolveAnthropicClientConfig({
      ANTHROPIC_API_KEY: apiKey,
      CLOUDFLARE_ACCOUNT_ID: args.env.CLOUDFLARE_ACCOUNT_ID,
      AI_GATEWAY_ID: args.env.AI_GATEWAY_ID,
    }),
  );
  const model = args.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = args.signal ? AbortSignal.any([args.signal, timeoutSignal]) : timeoutSignal;

  const response = await client.messages.create(
    {
      model,
      max_tokens: MAX_TOKENS,
      system: args.system,
      messages: args.messages.map((m) => ({ role: m.role, content: m.content })),
    },
    { signal },
  );

  const block = response.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

export async function completeMessage(args: CompleteArgs): Promise<string> {
  return createCompletion(args);
}

/** PDF / 画像など ContentBlockParam を含むメッセージ向けの非ストリーミング完了。 */
export async function completeStructuredMessage(args: StructuredCompleteArgs): Promise<string> {
  return createCompletion(args);
}
