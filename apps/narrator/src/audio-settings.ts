import { ttsProvider, type ProviderConfig } from "@stella/book-core/providers";
export interface AudioSettings {
  model: string;
  voice: string;
  language: string;
  fake: boolean;
}
export function audioSettings(config: ProviderConfig): AudioSettings {
  return {
    model: ttsProvider(config).model,
    voice: config.TTS_VOICE,
    language: config.TTS_LANGUAGE ?? "ja-JP",
    fake: config.FAKE_PROVIDERS === "1",
  };
}
export function audioConfig(config: ProviderConfig, settings: AudioSettings): ProviderConfig {
  // Credentials can rotate, but a resumed Workflow keeps the synthesis inputs
  // from its persisted prepare step, including completed batches.
  return {
    ...config,
    TTS_MODEL: settings.model,
    TTS_VOICE: settings.voice,
    TTS_LANGUAGE: settings.language,
    FAKE_PROVIDERS: settings.fake ? "1" : "0",
  };
}
