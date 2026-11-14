import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { storyboardAssets, videoContentHash } from "./storyboard-assets.js";
import { sceneCacheHash, type SceneCacheInput } from "./scene-cache.js";
import { parseStoryboard } from "../../src/video-storyboard.js";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9VQAAAAASUVORK5CYII=",
  "base64",
);
describe("絵コンテのローカル素材", () => {
  it("ショットのピクセル・art の割合を読み、使う画像と JSON の中身をハッシュする", () => {
    const root = mkdtempSync(join(tmpdir(), "stella-assets-"));
    try {
      const topic = join(root, "topic");
      mkdirSync(join(root, "shots/web"), { recursive: true });
      mkdirSync(join(topic, "assets/art"), { recursive: true });
      const shot = { source: "fixture", width: 1, height: 1, regions: { button: [0, 0, 1, 1] } };
      writeFileSync(join(root, "shots/web/one.json"), JSON.stringify(shot));
      writeFileSync(join(root, "shots/web/one.png"), png);
      writeFileSync(join(topic, "assets/art/read.png"), png);
      const sb = {
        art: { read: { prompt: "Learner", regions: { face: [0, 0, 0.5, 1] } } },
        scenes: [{ kind: "view", image: "shot:web/one", beats: [{ image: "art:read" }] }],
      };
      const first = storyboardAssets(root, topic, sb);
      expect(first.images["shot:web/one"].url).toMatch(/^file:/);
      expect(first.images["art:read"].regions.face).toEqual([0, 0, 0.5, 1]);
      expect(first.context.artFiles.has("read")).toBe(true);
      writeFileSync(
        join(root, "shots/web/one.json"),
        JSON.stringify({ ...shot, source: "changed" }),
      );
      const second = storyboardAssets(root, topic, sb);
      expect(second.hashes["shot:web/one"]).not.toBe(first.hashes["shot:web/one"]);
      writeFileSync(
        join(topic, "assets/art/read.png"),
        Buffer.concat([png, Buffer.from("changed")]),
      );
      expect(storyboardAssets(root, topic, sb).hashes["art:read"]).not.toBe(
        first.hashes["art:read"],
      );
      const cache: SceneCacheInput = {
        version: 1,
        board: { cols: 1, rows: 1, nodes: [] },
        start: { image: "shot:web/one", zoom: "all", spot: [], label: [] },
        scene: {
          kind: "view",
          id: "s",
          role: "hook",
          title: "見る",
          image: "shot:web/one",
          beats: [{ say: "見ます。" }],
        },
        timing: { start: 0, duration: 3, beats: [] },
        html: "html",
        voice: "fake",
        audio: [],
        code: {},
        assets: first.hashes,
      };
      expect(sceneCacheHash(cache)).not.toBe(sceneCacheHash({ ...cache, assets: second.hashes }));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("素材がなくても文脈を作れ、ショットはエラー・art は警告になる", () => {
    const root = mkdtempSync(join(tmpdir(), "stella-assets-"));
    try {
      mkdirSync(join(root, "shots"));
      const sb = {
        schema: 1,
        brief: { goal: "見る。", stuck: "迷う。", points: ["見る。"], leaveOut: ["内部"] },
        art: { read: { prompt: "Learner" } },
        scenes: [
          {
            kind: "view",
            id: "h",
            role: "hook",
            title: "つかみ",
            image: "art:read",
            beats: [{ say: "迷いますか?" }],
          },
          {
            kind: "view",
            id: "p",
            role: "point",
            point: 1,
            title: "見る",
            image: "shot:web/missing",
            beats: [{ say: "見ます。" }],
          },
          {
            kind: "view",
            id: "r",
            role: "recap",
            title: "まとめ",
            image: "art:read",
            beats: [{ say: "まとめます。" }],
          },
        ],
      };
      const assets = storyboardAssets(root, root, sb);
      const result = parseStoryboard(sb, assets.context);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          level: "warning",
          message: "イラストがまだありません。video:art を実行してください",
        }),
      );
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          level: "error",
          message: "ショットがありません: shot:web/missing",
        }),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

it("クリップのJSONと動画の内容をハッシュし、欠けた動画と不正なmarkを知らせる", () => {
  const root = mkdtempSync(join(tmpdir(), "stella-clips-"));
  try {
    mkdirSync(join(root, "clips/web"), { recursive: true });
    const definition = {
      source: "fixture",
      video: "one.mp4",
      width: 1600,
      height: 1000,
      fps: 30,
      duration: 10,
      marks: { open: [2, 4] },
      regions: { top: [10, 10, 100, 100] },
    };
    const json = join(root, "clips/web/action.json");
    writeFileSync(json, JSON.stringify(definition));
    const sb = {
      scenes: [
        { kind: "view", image: "clip:web/action#open", beats: [{ clip: "web/action#open" }] },
      ],
    };
    expect(() => storyboardAssets(root, root, sb)).toThrow(
      "クリップの動画がありません: web/action",
    );
    expect(storyboardAssets(root, root, sb, { allowMissingClips: true }).context.clips).toEqual({});
    writeFileSync(join(root, "one.mp4"), "aaaa");
    writeFileSync(join(root, "two.mp4"), "bbbb");
    for (const file of ["one.mp4", "two.mp4"]) utimesSync(join(root, file), 100, 100);
    expect(videoContentHash(join(root, "one.mp4"))).not.toBe(
      videoContentHash(join(root, "two.mp4")),
    );
    const first = storyboardAssets(root, root, sb);
    expect(first.images["clip:web/action#open"].regions).toEqual(definition.regions);
    expect(first.context.clips?.["web/action"].marks.open).toEqual([2, 4]);
    writeFileSync(json, JSON.stringify({ ...definition, source: "changed" }));
    expect(storyboardAssets(root, root, sb).hashes).not.toEqual(first.hashes);
    writeFileSync(json, JSON.stringify({ ...definition, video: "two.mp4" }));
    expect(storyboardAssets(root, root, sb).hashes).not.toEqual(first.hashes);
    // 一つのプロセスでは同じ動画を読み直さない。
    const memoized = videoContentHash(join(root, "one.mp4"));
    rmSync(join(root, "one.mp4"));
    expect(videoContentHash(join(root, "one.mp4"))).toBe(memoized);
    for (const marks of [{ open: [4, 4] }, { open: [2, 11] }]) {
      writeFileSync(json, JSON.stringify({ ...definition, video: "two.mp4", marks }));
      expect(() => storyboardAssets(root, root, sb)).toThrow(
        "クリップの定義が不正です: web/action",
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
