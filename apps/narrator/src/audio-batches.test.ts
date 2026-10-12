import { describe, expect, it } from "vitest";
import { chunkParagraphs, toSpeechParagraphs } from "@stella/book-core/speech";
import { audioBatchStarts, audioConcatGroups, MAX_AUDIO_CHUNKS } from "./audio-batches";

describe("audio Workflow step budget", () => {
  it.each(["a", "あ"])(
    "fits a near-1MiB %s chapter within 1024 persisted steps",
    (character) => {
      const byteSize = new TextEncoder().encode(character).length;
      const markdown = character.repeat(Math.floor((1024 * 1024) / byteSize));
      const chunks = chunkParagraphs(toSpeechParagraphs(markdown), 300);
      expect(chunks.length).toBeGreaterThan(1024);
      const starts = audioBatchStarts(chunks.length);
      expect(starts.length + 64).toBeLessThanOrEqual(1024);
      const reconstructed = starts.flatMap((start, index) =>
        chunks.slice(start, starts[index + 1]),
      );
      expect(reconstructed).toEqual(chunks);
    },
    30000,
  ); // Coverage instrumentation of the full-size Markdown is slower in CI.
  it("accepts the last allowed batch and rejects an input needing more reserved steps", () => {
    const parts = Array.from({ length: MAX_AUDIO_CHUNKS }, (_, index) => ({
      key: String(index),
      bytes: index + 1,
      seconds: 1,
    }));
    const groups = audioConcatGroups(parts);
    expect(groups.every((group) => group.length <= 200)).toBe(true);
    expect(groups.flat()).toEqual(parts);
    expect(audioBatchStarts(MAX_AUDIO_CHUNKS).length + groups.length + 24).toBeLessThanOrEqual(
      1024,
    );
    expect(() => audioBatchStarts(MAX_AUDIO_CHUNKS + 1)).toThrow(/上限/);
  });
});
