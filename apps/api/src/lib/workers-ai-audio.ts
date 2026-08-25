/**
 * 音声モデル呼び出しを AI Gateway 経由にする共通トランスポート (Issue #204)。
 *
 * REST の `cf-aig-gateway-id` ヘッダ経路を使う (レガシーな `/ai/run/@cf/` URL は使わない)。
 * `runModelViaGateway` は `workers-ai.ts` (面談対策の TTS / 文字起こし) からも使い、
 * 音声トラフィックを Gateway のログ・使用量に載せる。
 */

import { assertGatewayRequestUrlNotWorkersAiPath } from "./ai-gateway.js";

interface TranscribeEnv {
  CLOUDFLARE_ACCOUNT_ID: string;
  AI_GATEWAY_ID: string;
  AI_GATEWAY_CF_API_TOKEN: string;
}

interface TranscribeAudioArgs {
  audioBytes: Uint8Array;
  env: TranscribeEnv;
  model: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

/**
 * AI Gateway の `/ai/run` を叩く共通トランスポート。
 *
 * `/ai/run` は**全モデル・全モダリティ共通の universal endpoint** で、 Workers AI 自前の
 * `@cf/author/model` と Unified Billing の第三者モデル `author/model` (例 `xai/grok-tts`)
 * のどちらも同じ `{ model, input }` 契約で受け付ける。 モデルごとの入力スキーマは
 * `input` の中身で表現する。 モデル名は URL ではなく body に載せる
 * (`/ai/run/@cf/...` は Gateway を素通りするため禁止)。
 */
export async function runModelViaGateway(args: {
  env: TranscribeEnv;
  model: string;
  input: Record<string, unknown>;
  /** 応答を待つ上限。 呼び出し側が所要時間を見積もれるようにする。 */
  signal?: AbortSignal;
}): Promise<Response> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${args.env.CLOUDFLARE_ACCOUNT_ID}/ai/run`;
  assertGatewayRequestUrlNotWorkersAiPath(url);

  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.env.AI_GATEWAY_CF_API_TOKEN}`,
      "cf-aig-gateway-id": args.env.AI_GATEWAY_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      input: args.input,
    }),
    ...(args.signal ? { signal: args.signal } : {}),
  });
}

export async function transcribeAudioViaGateway(
  args: TranscribeAudioArgs,
): Promise<{ text: string }> {
  const response = await runModelViaGateway({
    env: args.env,
    model: args.model,
    input: { audio: bytesToBase64(args.audioBytes) },
  });

  if (!response.ok) {
    throw new Error(`Workers AI transcription failed (${response.status})`);
  }

  const data = (await response.json()) as { text?: string; result?: { text?: string } };
  return { text: data.text ?? data.result?.text ?? "" };
}
