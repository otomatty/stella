import { describe, expect, it } from "vitest";
import { buildContentManifest } from "./manifest.js";
import { collectPdfTargets } from "./material-pdf.js";
import {
  hasVideo,
  mergeVideoFailure,
  serializeVideoManifest,
  slideVideoScenes,
  storyboardVideoScenes,
  summarizeVideoError,
  videoKeyHash,
  videoKeys,
  videoManifestKey,
  videoSceneHash,
  type VideoManifest,
  type VideoState,
} from "./material-video.js";

describe("教材動画の配信", () => {
  const failure = { stageSlug: "dev-env-basics", id: "0-1-1", reason: "最初の理由\n詳細" };
  it("同じトピック ID でもステージごとに異なる manifest キーを作る", () => {
    expect(videoManifestKey("dev-env-basics", "0-1-1")).toBe("dev-env-basics/0-1-1");
    expect(videoManifestKey("devlab-ts-ch00", "0-1-1")).toBe("devlab-ts-ch00/0-1-1");
  });
  it("同じトピックの 2 件目の失敗は捨て、最初の理由を残す", () => {
    const first = mergeVideoFailure(undefined, failure);
    expect(first).toEqual({ stageSlug: failure.stageSlug, error: "最初の理由" });
    expect(mergeVideoFailure(first, { ...failure, reason: "次の理由" })).toBe(first);
  });
  it("成功と同じ ID の失敗は例外にする", () => {
    const success = { ...videoKeys(failure.stageSlug, failure.id, "hash"), durationSec: 30 };
    expect(() => mergeVideoFailure(success, failure)).toThrow(
      "レッスン ID が重複しています: dev-env-basics/0-1-1",
    );
  });
  it("別ステージの同じ ID の失敗は別々の項目に記録する", () => {
    const manifest: VideoManifest = {};
    for (const item of [failure, { ...failure, stageSlug: "devlab-ts-ch00", reason: "別の理由" }]) {
      const key = videoManifestKey(item.stageSlug, item.id);
      manifest[key] = mergeVideoFailure(manifest[key], item);
    }
    expect(manifest).toEqual({
      "dev-env-basics/0-1-1": { stageSlug: "dev-env-basics", error: "最初の理由" },
      "devlab-ts-ch00/0-1-1": { stageSlug: "devlab-ts-ch00", error: "別の理由" },
    });
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
    const legacyEntry = { ...keys, durationSec: 45 };
    const entry = {
      ...legacyEntry,
      scenes: [{ id: "intro", startSec: 2.6, durationSec: 3.125, hash: "0123456789abcdef" }],
    };
    const failure = { stageSlug: "another-stage", error: "読み上げに失敗しました" };
    const text = serializeVideoManifest({ c: failure, b: legacyEntry, a: entry });
    expect(Object.keys(JSON.parse(text))).toEqual(["a", "b", "c"]);
    expect(JSON.parse(text).a).toEqual(entry);
    expect(JSON.parse(text).b).toEqual(legacyEntry);
    expect(JSON.parse(text).c).toEqual(failure);
    expect(serializeVideoManifest({})).toBe("{}\n");
  });
});

describe("教材動画の場面", () => {
  it("絵コンテのハッシュはキー順に依存せず、内容が1文字違うと変わる", () => {
    const scene = { id: "intro", beats: [{ say: "はじめ", hold: 1 }] };
    const hash = videoSceneHash(scene);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
    expect(videoSceneHash({ beats: [{ hold: 1, say: "はじめ" }], id: "intro" })).toBe(hash);
    expect(videoSceneHash({ ...scene, beats: [{ say: "はじめる", hold: 1 }] })).not.toBe(hash);
  });

  it("絵コンテにある場面を再生順で返し、開始位置と長さをミリ秒に丸める", () => {
    const first = { id: "first", beats: [{ say: "最初" }] };
    const last = { id: "last", beats: [{ say: "最後" }] };
    expect(
      storyboardVideoScenes(
        [
          { id: "title", startSec: 0, durationSec: 2.6 },
          { id: "first", startSec: 2.6001, durationSec: 3.1259 },
          { id: "last", startSec: 5.726, durationSec: 4.2344 },
        ],
        [first, last],
      ),
    ).toEqual([
      { id: "first", startSec: 2.6, durationSec: 3.126, hash: videoSceneHash(first) },
      { id: "last", startSec: 5.726, durationSec: 4.234, hash: videoSceneHash(last) },
    ]);
  });

  it("スライドには1始まりの ID を付け、題名と順に連結した読み上げ文をハッシュにする", () => {
    const slides = [
      { title: "最初", startSec: 0, durationSec: 3.4567 },
      { title: "最後", startSec: 3.4567, durationSec: 4.5433 },
    ];
    const narration = [{ cues: [{ text: "一文。" }, { text: "二文。" }] }, { cues: [] }];
    expect(slideVideoScenes(slides, narration)).toEqual([
      {
        id: "slide-1",
        startSec: 0,
        durationSec: 3.457,
        hash: videoSceneHash(["最初", "一文。二文。"]),
      },
      { id: "slide-2", startSec: 3.457, durationSec: 4.543, hash: videoSceneHash(["最後", ""]) },
    ]);
  });
});
