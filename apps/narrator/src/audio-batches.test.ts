import { describe, expect, it } from "vitest";
import { chunkParagraphs, toSpeechParagraphs } from "@stella/book-core/speech";
import { audioBatchStarts } from "./audio-batches";

describe("audio Workflow step budget", () => {
  it.each(["a", "あ"])(
    "fits a near-1MiB %s chapter within 1024 persisted steps",
    (character) => {
      const byteSize = new TextEncoder().encode(character).length;
      const markdown = character.repeat(Math.floor((1024 * 1024) / byteSize));
      const chunks = chunkParagraphs(toSpeechParagraphs(markdown), 300);
      expect(chunks.length).toBeGreaterThan(1024);
      const starts = audioBatchStarts(chunks.length);
      expect(starts.length + 24).toBeLessThanOrEqual(1024);
      const reconstructed = starts.flatMap((start, index) =>
        chunks.slice(start, starts[index + 1]),
      );
      expect(reconstructed).toEqual(chunks);
    },
    30000,
  ); // Coverage instrumentation of the full-size Markdown is slower in CI.
  it("accepts the last allowed batch and rejects an input needing more reserved steps", () => {
    expect(audioBatchStarts(8000)).toHaveLength(1000);
    expect(() => audioBatchStarts(8001)).toThrow(/上限/);
  });
});
