import { describe, expect, it } from "vitest";
import { buildContentManifest } from "./manifest.js";
import { collectPdfTargets } from "./material-pdf.js";
import {
  hasVideo,
  serializeVideoManifest,
  videoKeyHash,
  videoKeys,
  type VideoState,
} from "./material-video.js";

describe("教材動画の配信", () => {
  it("format 2 の slides を動画用に集め、配布 PDF の対象は変えない", () => {
    const manifest = buildContentManifest();
    expect(
      collectPdfTargets(manifest).some(
        (t) => t.stageSlug === "dev-env-basics" && t.kind === "slides",
      ),
    ).toBe(false);
    const topics = collectPdfTargets(manifest, { includeFormat2Slides: true });
    expect(
      topics.find((t) => t.stageSlug === "dev-env-basics" && t.lessonId === "00-1-1")?.kind,
    ).toBe("slides");
  }, 60_000);
  const keys = videoKeys("dev-env-basics", "0-1-1", "abc123");
  it("動画・字幕・表紙は同じハッシュで、旧版と別のキーを使う", () => {
    expect(keys).toEqual({
      video: "lesson-video/ses/dev-env-basics/0-1-1/abc123.mp4",
      captions: "lesson-video/ses/dev-env-basics/0-1-1/abc123.vtt",
      poster: "lesson-video/ses/dev-env-basics/0-1-1/abc123.jpg",
    });
    expect(videoKeys("dev-env-basics", "0-1-1", "new").video).not.toBe(keys.video);
  });
  it("3ファイルと長さがそろったときだけ既存と判定する", () => {
    const state: VideoState = { version: 1, objects: {}, durations: {} };
    for (const key of Object.values(keys)) {
      expect(hasVideo(state, keys)).toBe(false);
      state.objects[videoKeyHash(key)] = 100;
    }
    expect(hasVideo(state, keys)).toBe(false);
    state.durations[videoKeyHash(keys.video)] = 45;
    expect(hasVideo(state, keys)).toBe(true);
    delete state.objects[videoKeyHash(keys.captions)];
    expect(hasVideo(state, keys)).toBe(false);
  });
  it("manifest を安定したレッスン ID 順の JSON にする", () => {
    const entry = { ...keys, durationSec: 45 };
    const text = serializeVideoManifest({ b: entry, a: entry });
    expect(Object.keys(JSON.parse(text))).toEqual(["a", "b"]);
    expect(JSON.parse(text).a).toEqual(entry);
    expect(serializeVideoManifest({})).toBe("{}\n");
  });
});
