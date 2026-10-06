/**
 * 非ストリーミングの Anthropic 完了 (JSON 応答用)。
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  ContentBlockParam,
  MessageParam,
  StopReason,
  TextBlockParam,
} from "@anthropic-ai/sdk/resources/messages/messages.js";
import type { ChatRole } from "@stella/shared/ai/types";

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

/** API キーとゲートウェイ設定からクライアントを作る。キーが無ければ MissingApiKeyError。 */
function createClient(env: AnthropicEnv): Anthropic {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new MissingApiKeyError();
  }
  return new Anthropic(
    resolveAnthropicClientConfig({
      ANTHROPIC_API_KEY: apiKey,
      CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
      AI_GATEWAY_ID: env.AI_GATEWAY_ID,
    }),
  );
}

/** 使うモデル。`override` (用途ごとの設定) → `ANTHROPIC_MODEL` → 既定の順。 */
export function resolveAnthropicModel(
  env: Pick<Env, "ANTHROPIC_MODEL">,
  override?: string | undefined,
): string {
  return override || env.ANTHROPIC_MODEL || DEFAULT_MODEL;
}

async function createCompletion(args: StructuredCompleteArgs): Promise<string> {
  const client = createClient(args.env);
  const model = resolveAnthropicModel(args.env);
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

export interface JsonSchemaCompleteArgs {
  env: AnthropicEnv;
  /** 用途ごとのモデル (未設定なら ANTHROPIC_MODEL → 既定)。 */
  model?: string;
  /** キャッシュの区切り (`cache_control`) は呼び出し側がブロックに付ける。 */
  system: TextBlockParam[];
  messages: MessageParam[];
  /** 構造化出力 (`output_config.format`) の JSON スキーマ。 */
  schema: Record<string, unknown>;
  maxTokens: number;
  timeoutMs: number;
  signal?: AbortSignal;
}

export interface JsonSchemaCompletion {
  text: string;
  stopReason: StopReason | null;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens: number | null;
    cacheCreationInputTokens: number | null;
  };
}

/**
 * 構造化出力で JSON を返させる非ストリーミングの完了 (AI の一次レビュー用)。
 *
 * 再試行は呼び出し側の待ち行列が持つので、SDK の自動再試行は切る (待ち時間の上限を守るため)。
 * 拒否や打ち切り (`stopReason`) の扱いも呼び出し側が決める。
 */
export async function completeJsonSchema(
  args: JsonSchemaCompleteArgs,
): Promise<JsonSchemaCompletion> {
  const client = createClient(args.env);
  const model = resolveAnthropicModel(args.env, args.model);
  const timeoutSignal = AbortSignal.timeout(args.timeoutMs);
  const signal = args.signal ? AbortSignal.any([args.signal, timeoutSignal]) : timeoutSignal;
  const response = await client.messages.create(
    {
      model,
      max_tokens: args.maxTokens,
      system: args.system,
      messages: args.messages,
      output_config: { format: { type: "json_schema", schema: args.schema } },
    },
    { signal, maxRetries: 0, timeout: args.timeoutMs },
  );
  const text = response.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("");
  return {
    text,
    stopReason: response.stop_reason,
    model: response.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadInputTokens: response.usage.cache_read_input_tokens ?? null,
      cacheCreationInputTokens: response.usage.cache_creation_input_tokens ?? null,
    },
  };
}
