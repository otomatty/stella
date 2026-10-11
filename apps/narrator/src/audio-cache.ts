import type { Usage } from "@stella/book-core/providers";
import type { AudioSettings } from "./audio-settings";
export interface CachedAudio {
  seconds: number;
  usage: Usage;
  reference: string;
}
export function cachedAudio(
  metadata: Record<string, string> | undefined,
  hash: string,
  settings: AudioSettings,
): CachedAudio | null {
  if (
    !metadata ||
    metadata.hash !== hash ||
    metadata.model !== settings.model ||
    metadata.voice !== settings.voice ||
    metadata.language !== settings.language ||
    metadata.provider !== (settings.fake ? "fake" : "google") ||
    !metadata.reference
  )
    return null;
  const seconds = Number(metadata.seconds),
    inputTokens = Number(metadata.inputTokens),
    outputTokens = Number(metadata.outputTokens);
  if (![seconds, inputTokens, outputTokens].every((value) => Number.isFinite(value) && value >= 0))
    return null;
  return { seconds, usage: { inputTokens, outputTokens }, reference: metadata.reference };
}
