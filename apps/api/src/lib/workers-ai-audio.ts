/**
 * Workers AI audio transcription routed through AI Gateway (Issue #204).
 *
 * Uses the REST `cf-aig-gateway-id` header path — not the legacy `/ai/run/@cf/` URL.
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

export async function transcribeAudioViaGateway(
  args: TranscribeAudioArgs,
): Promise<{ text: string }> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${args.env.CLOUDFLARE_ACCOUNT_ID}/ai/run`;
  assertGatewayRequestUrlNotWorkersAiPath(url);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.env.AI_GATEWAY_CF_API_TOKEN}`,
      "cf-aig-gateway-id": args.env.AI_GATEWAY_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      input: {
        audio: bytesToBase64(args.audioBytes),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Workers AI transcription failed (${response.status})`);
  }

  const data = (await response.json()) as { text?: string; result?: { text?: string } };
  return { text: data.text ?? data.result?.text ?? "" };
}
