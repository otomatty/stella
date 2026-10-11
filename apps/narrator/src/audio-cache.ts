import type { Usage } from "@stella/book-core/providers";
export interface CachedAudio {
  seconds: number;
  usage: Usage;
  reference: string;
}
export function cachedAudio(
  metadata: Record<string, string> | undefined,
  hash: string,
  model: string,
): CachedAudio | null {
  if (!metadata || metadata.hash !== hash || metadata.model !== model || !metadata.reference)
    return null;
  const seconds = Number(metadata.seconds),
    inputTokens = Number(metadata.inputTokens),
    outputTokens = Number(metadata.outputTokens);
  if (![seconds, inputTokens, outputTokens].every((value) => Number.isFinite(value) && value >= 0))
    return null;
  return { seconds, usage: { inputTokens, outputTokens }, reference: metadata.reference };
}
