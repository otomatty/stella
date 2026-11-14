import { describe, expect, it } from "vitest";
import { sceneCacheHash, type SceneCacheInput } from "./scene-cache.js";
const plan = (): SceneCacheInput => ({
  version: 1,
  board: { cols: 1, rows: 1, nodes: [{ id: "a", label: "ファイル", icon: "file", at: [1, 1] }] },
  start: { visible: [], marks: {}, zoom: "all" },
  scene: {
    id: "a",
    role: "hook",
    title: "ファイル",
    board: "main",
    beats: [{ say: "ファイルです。", show: ["a"] }],
  },
  timing: { start: 12, duration: 3, beats: [{ start: 0.5, end: 2, say: "ファイルです。" }] },
  html: "<svg></svg>",
  voice: "fake/1",
  audio: [new Int16Array([1, 2, 3])],
  code: { renderer: "v1", encoder: "v1" },
});
describe("場面キャッシュ", () => {
  it("前の場面が伸びても、変更のない場面を再生成しない", () => {
    const a = plan(),
      b = plan();
    b.timing.start = 42;
    expect(sceneCacheHash(a)).toBe(sceneCacheHash(b));
  });
  const edits: [string, (p: SceneCacheInput) => void][] = [
    [
      "生成の版",
      (p) => {
        p.version++;
      },
    ],
    [
      "図解",
      (p) => {
        p.board.nodes[0].label = "別の図";
      },
    ],
    [
      "引き継ぐ可視状態",
      (p) => {
        p.start.visible = ["a"];
      },
    ],
    [
      "引き継ぐ印",
      (p) => {
        p.start.marks.a = "check";
      },
    ],
    [
      "引き継ぐカメラ",
      (p) => {
        p.start.zoom = ["a"];
      },
    ],
    [
      "文",
      (p) => {
        p.scene.beats[0].say = "別の文です。";
      },
    ],
    [
      "動き",
      (p) => {
        p.scene.beats[0].pulse = ["a"];
      },
    ],
    [
      "声",
      (p) => {
        p.voice = "fake/2";
      },
    ],
    [
      "音声",
      (p) => {
        p.audio[0][1] = 4;
      },
    ],
    [
      "描画コード",
      (p) => {
        p.code.renderer = "v2";
      },
    ],
    [
      "SVGや書体",
      (p) => {
        p.html = "<svg>changed</svg>";
      },
    ],
  ];
  for (const [name, edit] of edits)
    it(`${name}が変わった場面を作り直す`, () => {
      const p = plan(),
        before = sceneCacheHash(p);
      edit(p);
      expect(sceneCacheHash(p)).not.toBe(before);
    });
  it("PCMの部分配列は対象のバイトだけをハッシュする", () => {
    const p = plan(),
      a = sceneCacheHash(p);
    p.audio = [new Int16Array([99, 1, 2, 3, 99]).subarray(1, 4)];
    expect(sceneCacheHash(p)).toBe(a);
  });
});
