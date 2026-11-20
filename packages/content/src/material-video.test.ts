import { describe, expect, it } from "vitest";
import { buildContentManifest } from "./manifest.js";
import { collectPdfTargets } from "./material-pdf.js";
import {
  hasVideo,
  mergeVideoFailure,
  serializeVideoManifest,
  slideAssetHashes,
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
import type { VideoStoryboard, ViewScene } from "./video-storyboard.js";

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
    const first: ViewScene = {
      kind: "view",
      id: "first",
      role: "hook",
      title: "最初",
      image: "shot:example/first",
      beats: [{ say: "最初" }],
    };
    const last: ViewScene = { ...first, id: "last", title: "最後", image: "shot:example/last" };
    expect(
      storyboardVideoScenes(
        [
          { id: "title", startSec: 0, durationSec: 2.6 },
          { id: "first", startSec: 2.6001, durationSec: 3.1259 },
          { id: "last", startSec: 5.726, durationSec: 4.2344 },
        ],
        { scenes: [first, last] },
        { [first.image]: "first-hash", [last.image]: "last-hash" },
      ),
    ).toEqual([
      {
        id: "first",
        startSec: 2.6,
        durationSec: 3.126,
        hash: videoSceneHash({ definition: first, assets: { [first.image]: "first-hash" } }),
      },
      {
        id: "last",
        startSec: 5.726,
        durationSec: 4.234,
        hash: videoSceneHash({ definition: last, assets: { [last.image]: "last-hash" } }),
      },
    ]);
  });

  const storyboard: Pick<VideoStoryboard, "scenes" | "boards"> = {
    scenes: [
      {
        kind: "view",
        id: "view",
        title: "操作",
        role: "hook",
        image: "shot:editor/start",
        beats: [
          { say: "画像", image: "shot:editor/next" },
          { say: "操作", clip: "web/example#open" },
        ],
      },
      { id: "board", title: "概要", role: "recap", board: "main", beats: [{ say: "まとめ" }] },
    ],
    boards: {
      main: { cols: 4, rows: 4, nodes: [{ id: "main", label: "概要", at: [1, 1], art: "main" }] },
      other: {
        cols: 4,
        rows: 4,
        nodes: [{ id: "other", label: "別の盤面", at: [1, 1], art: "other" }],
      },
    },
  };
  const timings = storyboard.scenes.map(({ id }, i) => ({ id, startSec: i * 5, durationSec: 5 }));
  const hashes = {
    "shot:editor/start": "start-hash",
    "shot:editor/next": "next-hash",
    "clip:web/example#open": "clip-hash",
    "art:main": "main-hash",
    "art:other": "other-hash",
  };

  it.each([
    ["shot:editor/start", "view"],
    ["shot:editor/next", "view"],
    ["clip:web/example#open", "view"],
    ["art:main", "board"],
    ["art:other", null],
  ] as const)("素材 %s の変更は使っている場面だけに反映する", (ref, changedScene) => {
    const original = storyboardVideoScenes(timings, storyboard, hashes);
    const updated = storyboardVideoScenes(timings, storyboard, {
      ...hashes,
      [ref]: "changed",
    });
    expect(
      updated.filter((scene, i) => scene.hash !== original[i].hash).map(({ id }) => id),
    ).toEqual(changedScene ? [changedScene] : []);
  });

  it("盤面の定義が変わると参照する場面だけのハッシュが変わる", () => {
    const [view, board] = storyboardVideoScenes(timings, storyboard, hashes);
    const updated = storyboardVideoScenes(
      timings,
      {
        ...storyboard,
        boards: { ...storyboard.boards, main: { cols: 5, rows: 4, nodes: [] } },
      },
      hashes,
    );
    expect(updated[0].hash).toBe(view.hash);
    expect(updated[1].hash).not.toBe(board.hash);
  });

  it("スライドには1始まりの ID を付け、題名と読み上げ文と本文をハッシュにする", () => {
    const slides = [
      { title: "最初", body: "最初の本文", startSec: 0, durationSec: 3.4567 },
      { title: "最後", body: "最後の本文", startSec: 3.4567, durationSec: 4.5433 },
    ];
    const narration = [{ cues: [{ text: "一文。" }, { text: "二文。" }] }, { cues: [] }];
    const original = slideVideoScenes(slides, narration);
    expect(original).toEqual([
      {
        id: "slide-1",
        startSec: 0,
        durationSec: 3.457,
        hash: videoSceneHash(["最初", "一文。二文。", "最初の本文"]),
      },
      {
        id: "slide-2",
        startSec: 3.457,
        durationSec: 4.543,
        hash: videoSceneHash(["最後", "", "最後の本文"]),
      },
    ]);
    const updated = slideVideoScenes(
      [{ ...slides[0], body: "変更した本文" }, slides[1]],
      narration,
    );
    expect(updated[0].hash).not.toBe(original[0].hash);
    expect(updated[1]).toEqual(original[1]);
  });

  it("参照している画像の内容だけを場面のハッシュに加える", () => {
    const image = "tenant/ses/stages/example/diagram.svg";
    const unused = "tenant/ses/stages/example/unused.svg";
    const slides = [
      { title: "図", body: "![図](assets/diagram.svg)", startSec: 0, durationSec: 5 },
      { title: "説明", body: "本文", startSec: 5, durationSec: 5 },
    ];
    const renderedBodies = [`![図](${image})`, "本文"];
    const narration = [{ cues: [] }, { cues: [{ text: "説明します。" }] }];
    const scenes = (assetHashes: Record<string, string>) =>
      slideVideoScenes(
        slides.map((slide, i) => ({
          ...slide,
          assetHashes: slideAssetHashes(renderedBodies[i], assetHashes),
        })),
        narration,
      );
    const original = scenes({ [image]: "a".repeat(64), [unused]: "b".repeat(64) });
    const updated = scenes({ [image]: "c".repeat(64), [unused]: "b".repeat(64) });
    expect(updated[0].hash).not.toBe(original[0].hash);
    expect(updated[1]).toEqual(original[1]);
    expect(scenes({ [image]: "a".repeat(64), [unused]: "d".repeat(64) })).toEqual(original);
    expect(original[1].hash).toBe(videoSceneHash(["説明", "説明します。", "本文"]));
  });
});
