import { describe, expect, it } from "vitest";
import { buildContentManifest } from "./manifest.js";
import { collectPdfTargets } from "./material-pdf.js";
import {
  hasVideo,
  mergeVideoFailure,
  serializeVideoManifest,
  summarizeVideoError,
  videoKeyHash,
  videoKeys,
  type VideoState,
} from "./material-video.js";

describe("教材動画の配信", () => {
  const failure = { stageSlug: "dev-env-basics", id: "0-1-1", reason: "最初の理由\n詳細" };
  it("同じトピックの 2 件目の失敗は捨て、最初の理由を残す", () => {
    const first = mergeVideoFailure(undefined, failure);
    expect(first).toEqual({ stageSlug: failure.stageSlug, error: "最初の理由" });
    expect(mergeVideoFailure(first, { ...failure, reason: "次の理由" })).toBe(first);
  });
  it("成功と同じ ID の失敗は例外にする", () => {
    const success = { ...videoKeys(failure.stageSlug, failure.id, "hash"), durationSec: 30 };
    expect(() => mergeVideoFailure(success, failure)).toThrow(
      `レッスン ID が重複しています: ${failure.id}`,
    );
  });
  it("別ステージの同じ ID の失敗は例外にする", () => {
    const first = mergeVideoFailure(undefined, failure);
    expect(() => mergeVideoFailure(first, { ...failure, stageSlug: "another-stage" })).toThrow(
      `レッスン ID が重複しています: ${failure.id}`,
    );
  });
  it("失敗理由は先頭行を使い、省略記号を含めて 200 文字までにする", () => {
    expect(summarizeVideoError("失敗\r\n詳細")).toBe("失敗");
    expect(summarizeVideoError("失敗\n詳細")).toBe("失敗");
    expect(summarizeVideoError("失敗\r詳細")).toBe("失敗");
    expect(summarizeVideoError("")).toBe("");
    expect(summarizeVideoError("あ".repeat(200))).toBe("あ".repeat(200));
    expect(summarizeVideoError("あ".repeat(201))).toBe(`${"あ".repeat(199)}…`);
    expect(summarizeVideoError("😀".repeat(201))).toBe(`${"😀".repeat(199)}…`);
  });
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
    const failure = { stageSlug: "another-stage", error: "読み上げに失敗しました" };
    const text = serializeVideoManifest({ c: failure, b: entry, a: entry });
    expect(Object.keys(JSON.parse(text))).toEqual(["a", "b", "c"]);
    expect(JSON.parse(text).a).toEqual(entry);
    expect(JSON.parse(text).c).toEqual(failure);
    expect(serializeVideoManifest({})).toBe("{}\n");
  });
});
