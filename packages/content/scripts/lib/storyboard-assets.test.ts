import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { storyboardAssets } from "./storyboard-assets.js";
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
