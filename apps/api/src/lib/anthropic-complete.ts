/**
 * 非ストリーミングの Anthropic 完了 (JSON 応答用)。
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ChatRole } from "@falcon/shared/ai/types";

import type { Env } from "../env.js";
import { MissingApiKeyError } from "./anthropic.js";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2048;
/** Cloudflare Workers CPU 制限に合わせて chat ストリームより短めに設定 */
const REQUEST_TIMEOUT_MS = 25_000;

interface CompleteArgs {
  env: Pick<Env, "ANTHROPIC_API_KEY" | "ANTHROPIC_MODEL">;
  system: string;
  messages: { role: ChatRole; content: string }[];
  signal?: AbortSignal;
}

export async function completeMessage(args: CompleteArgs): Promise<string> {
  const apiKey = args.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new MissingApiKeyError();
  }

  const client = new Anthropic({ apiKey });
  const model = args.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = args.signal
    ? AbortSignal.any([args.signal, timeoutSignal])
    : timeoutSignal;

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
