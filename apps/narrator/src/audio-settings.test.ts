import { afterEach, describe, expect, it, vi } from "vitest";
import { ttsProvider, type ProviderConfig } from "@stella/book-core/providers";
import { audioSettings, audioConfig } from "./audio-settings";
import { cachedAudio } from "./audio-cache";
afterEach(() => vi.restoreAllMocks());
const settings = { model: "gemini-original", voice: "Kore", language: "ja-JP", fake: false };
const metadata = {
  hash: "chapter",
  model: settings.model,
  voice: settings.voice,
  language: settings.language,
  provider: "google",
  reference: "chunk",
  seconds: "1",
  inputTokens: "100",
  outputTokens: "50",
};
describe("frozen TTS settings", () => {
  it("keeps the persisted model, voice and language after configuration changes", async () => {
    const config = {
      TTS_MODEL: settings.model,
      TTS_VOICE: settings.voice,
      GEMINI_API_KEY: "test-key",
      FAKE_PROVIDERS: "0",
    } as ProviderConfig;
    const saved = JSON.parse(JSON.stringify(audioSettings(config)));
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          steps: [
            {
              type: "model_output",
              content: [{ type: "audio", data: "AAA=", mime_type: "audio/L16;rate=24000" }],
            },
          ],
        }),
      ),
    );
    const resumed = audioConfig(
      {
        ...config,
        TTS_MODEL: "gemini-new",
        TTS_VOICE: "Charon",
        TTS_LANGUAGE: "en-US",
        GEMINI_API_KEY: "rotated-key",
        FAKE_PROVIDERS: "1",
      },
      saved,
    );
    await ttsProvider(resumed).synthesize("Text");
    const request = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      model: settings.model,
      generation_config: {
        speech_config: [{ voice: settings.voice, language: settings.language }],
      },
    });
    expect(resumed.GEMINI_API_KEY).toBe("rotated-key");
    expect(resumed.FAKE_PROVIDERS).toBe("0");
  });
  it("reuses only matching voice, language, model, provider and chapter", () => {
    expect(cachedAudio(metadata, "chapter", settings)).not.toBeNull();
    for (const changed of [
      { voice: "Charon" },
      { language: "en-US" },
      { model: "gemini-new" },
      { provider: "fake" },
      { hash: "new-chapter" },
      { voice: undefined },
    ])
      expect(
        cachedAudio({ ...metadata, ...changed } as Record<string, string>, "chapter", settings),
      ).toBeNull();
  });
});
