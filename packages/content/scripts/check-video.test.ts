import { join } from "node:path";
import { expect, it } from "vitest";
import { narrationOnlyFiles } from "./check-video.js";

it("絵コンテも収録も同じフォルダーにない台本だけを返す", () => {
  const slides = join("slides", "narration.json");
  const nested = join("recording", "other", "narration.json");
  expect(
    narrationOnlyFiles([
      slides,
      join("slides", "screen.vtt"),
      join("slides", "other", "video.json"),
      join("storyboard", "narration.json"),
      join("storyboard", "video.json"),
      join("recording", "narration.json"),
      join("recording", "screen.mp4"),
      nested,
      join("fully-covered", "narration.json"),
      join("fully-covered", "video.json"),
      join("fully-covered", "screen.mp4"),
    ]),
  ).toEqual([slides, nested]);
});
