import { sceneSfxCues } from "../../src/scene-sfx.js";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BoardScene, BoardState } from "../../src/video-storyboard.js";
import { SCENE_PACING, sceneSpeeches, sceneVideoSequence } from "../../src/scene-timeline.js";
import { describe, expect, it } from "vitest";
import {
  beginVideoCacheRun,
  pruneVideoCache,
  touchVideoCacheFile,
  sceneVideoSourceHash,
  shouldPruneVideoCache,
  sceneCacheHash,
  type SceneCacheInput,
} from "./scene-cache.js";
const plan = (): SceneCacheInput<BoardScene, BoardState> => ({
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
  speeches: ["ファイルです。"],
  audio: [new Int16Array([1, 2, 3])],
  sfx: [],
  code: { renderer: "v1", encoder: "v1" },
});
describe("場面キャッシュ", () => {
  it("効果音の時刻・音の種類・合成コードが変われば作り直す", () => {
    const input: SceneCacheInput = { ...plan(), sfx: [{ kind: "switch", at: 1 }] };
    const hash = sceneCacheHash(input);
    expect(sceneCacheHash({ ...input, sfx: [{ kind: "switch", at: 2 }] })).not.toBe(hash);
    expect(sceneCacheHash({ ...input, sfx: [{ kind: "title", at: 1 }] })).not.toBe(hash);
    expect(
      sceneCacheHash({ ...input, code: { ...input.code, "../src/scene-sfx.ts": "new timbre" } }),
    ).not.toBe(hash);
  });
  it.each([0])("文字場面%sの読み・音声・声の変更でキャッシュを変える", (i) => {
    const { scene, timing } = sceneVideoSequence([], [], { title: "STELLA", takeaway: "VS Code" })[
      i
    ];
    const input: SceneCacheInput = {
      ...plan(),
      board: undefined,
      start: undefined,
      scene,
      timing,
      speeches: sceneSpeeches(scene, {}),
    };
    const before = sceneCacheHash(input);
    expect(
      sceneCacheHash({
        ...input,
        speeches: sceneSpeeches(scene, { STELLA: "ステラ", "VS Code": "ブイエスコード" }),
      }),
    ).not.toBe(before);
    expect(sceneCacheHash({ ...input, audio: [new Int16Array([4, 5, 6])] })).not.toBe(before);
    expect(sceneCacheHash({ ...input, voice: "other-voice" })).not.toBe(before);
    expect(sceneCacheHash({ ...input, timing: { ...timing, start: 99 } })).toBe(before);
  });
  it("前の場面が伸びても、変更のない場面を再生成しない", () => {
    const a = plan(),
      b = plan();
    b.timing.start = 42;
    expect(sceneCacheHash(a)).toBe(sceneCacheHash(b));
  });
  const edits: [string, (p: SceneCacheInput<BoardScene, BoardState>) => void][] = [
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
      "辞書を適用した読み",
      (p) => {
        p.speeches = ["ふぁいるです。"];
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

it("抽出コマの作業フォルダーだけが違ってもキャッシュを再利用する", () => {
  const a = {
    ...plan(),
    assetRoot: "file:///tmp/work-one",
    html: '<img src="file:///tmp/work-one/clips/web/read/open/000001.jpg">',
    assets: { "clip:web/read#open": "content-hash" },
  };
  const b = {
    ...a,
    assetRoot: "file:///tmp/work-two",
    html: a.html.replaceAll("work-one", "work-two"),
  };
  expect(sceneCacheHash(a)).toBe(sceneCacheHash(b));
  expect(sceneCacheHash({ ...b, assets: { "clip:web/read#open": "new-content-hash" } })).not.toBe(
    sceneCacheHash(a),
  );
});

describe("配信前の新方式ハッシュ", () => {
  const input = () => ({
    version: 1,
    title: "STELLAで学ぶ流れ",
    header: "STELLAの使い方",
    takeaway: "Webで読み、VS Codeで書きます。",
    storyboard: {
      schema: 1 as const,
      brief: { goal: "説明する", stuck: "迷う", points: ["読む"], leaveOut: [] },
      boards: { main: plan().board },
      scenes: [plan().scene],
      art: {
        learner: {
          prompt: "learner",
          regions: { face: [0, 0, 1, 1] as [number, number, number, number] },
        },
      },
    },
    readings: { ファイル: "ふぁいる", 未使用: "みしよう" },
    voice: "gemini/model-one/voice/style",
    assets: {
      "shot:web/read": "png-and-json-sha256",
      "clip:web/read#open": "json-and-video-sha256",
    },
    code: { renderer: "v1" },
  });
  it("schema 1 の場面と配信のハッシュを維持する", () => {
    expect(sceneCacheHash(plan())).toBe("0dc71d1989c88b2b553891fa101efd63");
    expect(sceneVideoSourceHash(input())).toBe("61298f02d212474d640556d90f0bc881");
  });
  it("用語のフリガナの変更で配信用動画を作り直す", () => {
    const original = input();
    const withTerm = (ruby: string) => ({
      ...original,
      storyboard: {
        ...original.storyboard,
        schema: 2 as const,
        scenes: original.storyboard.scenes.map((scene) => ({
          ...scene,
          beats: scene.beats.map((beat) => ({ ...beat, term: { text: "ファイル", ruby } })),
        })),
      },
    });
    expect(sceneVideoSourceHash(withTerm("ふぁいる"))).not.toBe(
      sceneVideoSourceHash(withTerm("ファイル")),
    );
  });
  it("schema 2 の間の設定を場面と配信のハッシュに含める", () => {
    const scene = plan();
    const video = input();
    const sceneV2 = { ...scene, schema: 2 as const };
    const videoV2 = { ...video, storyboard: { ...video.storyboard, schema: 2 as const } };
    const v1 = [sceneCacheHash(scene), sceneVideoSourceHash(video)];
    const v2 = [sceneCacheHash(sceneV2), sceneVideoSourceHash(videoV2)];
    const pacing: { between: number } = SCENE_PACING[2];
    const original = pacing.between;
    try {
      pacing.between += 0.1;
      expect([sceneCacheHash({ ...scene, schema: 1 }), sceneVideoSourceHash(video)]).toEqual(v1);
      expect(sceneCacheHash(sceneV2)).not.toBe(v2[0]);
      expect(sceneVideoSourceHash(videoV2)).not.toBe(v2[1]);
    } finally {
      pacing.between = original;
    }
  });
  it("文・使う読み・素材の中身・音声モデル・領域・描画が変わると変わる", () => {
    const edits = [
      (p: ReturnType<typeof input>) => {
        p.title = "新しいタイトル";
      },
      (p: ReturnType<typeof input>) => {
        p.header = "新しい見出し";
      },
      (p: ReturnType<typeof input>) => {
        p.takeaway = "書いて、確かめて、提出します。";
      },
      (p: ReturnType<typeof input>) => {
        p.storyboard.scenes[0].beats[0].say = "別の文です。";
      },
      (p: ReturnType<typeof input>) => {
        p.readings.ファイル = "べつのよみ";
      },
      (p: ReturnType<typeof input>) => {
        p.assets["shot:web/read"] = "changed";
      },
      (p: ReturnType<typeof input>) => {
        p.assets["clip:web/read#open"] = "changed";
      },
      (p: ReturnType<typeof input>) => {
        p.voice = "gemini/model-two/voice/style";
      },
      (p: ReturnType<typeof input>) => {
        p.storyboard.art.learner.regions.face[0] = 0.1;
      },
      (p: ReturnType<typeof input>) => {
        p.code.renderer = "v2";
      },
    ];
    for (const edit of edits) {
      const p = input();
      const before = sceneVideoSourceHash(p);
      edit(p);
      expect(sceneVideoSourceHash(p)).not.toBe(before);
    }
  });
  it("brief・polish・prompt・未使用の読みだけの変更では変わらない", () => {
    const p = input(),
      before = sceneVideoSourceHash(p);
    p.storyboard.brief.goal = "書き直した設計";
    p.storyboard.art.learner.prompt = "new illustration prompt";
    p.readings.未使用 = "べつ";
    expect(
      sceneVideoSourceHash({ ...p, storyboard: { ...p.storyboard, polish: {} } } as typeof p),
    ).toBe(before);
  });
  it.each(["STELLA", "VS Code"])(
    "%sの読みの変更は、タイトルで読む場合だけ配信ハッシュを変える",
    (word) => {
      const p = input();
      const before = sceneVideoSourceHash(p);
      const after = sceneVideoSourceHash({ ...p, readings: { ...p.readings, [word]: "別の読み" } });
      expect(after === before).toBe(word === "VS Code");
    },
  );
  it("headerだけにある語の読みは配信ハッシュに影響しない", () => {
    const p = input();
    expect(sceneVideoSourceHash({ ...p, readings: { ...p.readings, 開発環境: "別の読み" } })).toBe(
      sceneVideoSourceHash(p),
    );
  });
  it("オブジェクトのキー順では変わらない", () => {
    const p = input();
    expect(
      sceneVideoSourceHash({
        ...p,
        assets: Object.fromEntries(Object.entries(p.assets).reverse()),
      }),
    ).toBe(sceneVideoSourceHash(p));
  });
  it("効果音の生成コードも配信ハッシュに含める", () => {
    const p = input();
    const code = { ...p.code, "../src/scene-sfx.ts": "original timbre and cue timing" };
    expect(sceneVideoSourceHash({ ...p, code })).not.toBe(
      sceneVideoSourceHash({
        ...p,
        code: { ...code, "../src/scene-sfx.ts": "changed timbre or timing" },
      }),
    );
  });
});

it("今回使ったものと30日以内のキャッシュを残し、それより古い未使用分だけ消す", () => {
  const now = 40 * 86400000;
  expect(shouldPruneVideoCache(true, 0, now)).toBe(false);
  expect(shouldPruneVideoCache(false, now - 30 * 86400000, now)).toBe(false);
  expect(shouldPruneVideoCache(false, now - 30 * 86400000 - 1, now)).toBe(true);
  expect(shouldPruneVideoCache(false, now + 1, now)).toBe(false);
});

it("使用した場面・音声は時刻を更新し、古い未使用ファイルだけを実際に削除する", () => {
  const root = mkdtempSync(join(tmpdir(), "stella-cache-prune-"));
  try {
    beginVideoCacheRun();
    const used = join(root, "tts", "used.wav"),
      stale = join(root, "scenes", "hash", "clip.mp4"),
      recent = join(root, "tts", "recent.mp3");
    mkdirSync(join(root, "tts"), { recursive: true });
    mkdirSync(join(root, "scenes", "hash"), { recursive: true });
    const old = new Date(Date.now() - 31 * 86400000);
    for (const file of [used, stale, recent]) writeFileSync(file, "cache");
    for (const file of [used, stale]) utimesSync(file, old, old);
    touchVideoCacheFile(used);
    pruneVideoCache(root);
    expect(existsSync(used)).toBe(true);
    expect(statSync(used).mtimeMs).toBeGreaterThan(old.getTime());
    expect(existsSync(stale)).toBe(false);
    expect(existsSync(recent)).toBe(true);
    pruneVideoCache(join(root, "absent"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it("figure の図解・素材・開始状態はそれぞれ場面キャッシュに入る", () => {
  const fixture = plan();
  const input: SceneCacheInput = {
    ...fixture,
    scene: {
      kind: "code",
      id: "code",
      role: "point",
      point: 1,
      title: "概念図",
      code: ["const a = 1;"],
      show: true,
      panel: { kind: "figure", board: "main" },
      beats: [{ say: "値です。", figure: { pulse: ["a"] } }],
    },
    figureStart: { visible: ["a"], marks: {}, zoom: "all", tags: { a: "1" } },
    assets: { "art:item": "before" },
  };
  const hash = sceneCacheHash(input);
  expect(
    sceneCacheHash({
      ...input,
      figureStart: { ...fixture.start, visible: ["a"], tags: { a: "2" } },
    }),
  ).not.toBe(hash);
  expect(sceneCacheHash({ ...input, board: { ...fixture.board, rows: 2 } })).not.toBe(hash);
  expect(sceneCacheHash({ ...input, assets: { "art:item": "after" } })).not.toBe(hash);
});

it("schema 2 で生成したキューはキャッシュを変え、schema 1 のキャッシュは従来どおり", () => {
  const input = plan();
  const cues = (schema: 1 | 2) => sceneSfxCues(input.scene, input.timing, undefined, schema);
  expect(sceneCacheHash({ ...input, schema: 1, sfx: cues(1) })).toBe(sceneCacheHash(input));
  const lesson = { ...input, schema: 2 as const };
  expect(cues(2)).toEqual([{ kind: "scene", at: 0 }]);
  expect(sceneCacheHash({ ...lesson, sfx: cues(2) })).not.toBe(sceneCacheHash(lesson));
});
