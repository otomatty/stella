import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { sceneHtml, type ScenePageWindow } from "../scripts/lib/scene-html.js";
import { speechOf } from "./narration.js";
import { sceneTimelines } from "./scene-timeline.js";
import { viewFrame, viewBusyRanges, type ViewImage } from "./scene-view.js";
import { layoutBoard } from "./scene-layout.js";
import { buildPolishRequest } from "./video-polish.js";
import {
  parseStoryboard,
  storyboardStates,
  type VideoStoryboard,
  type ViewScene,
  type ViewSceneState,
  type StoryboardContext,
  type SceneState,
  type BoardScene,
} from "./video-storyboard.js";

const fresh = (): VideoStoryboard => ({
  schema: 1,
  brief: { goal: "説明できる。", stuck: "迷う。", points: ["画面を見る。"], leaveOut: ["内部"] },
  art: { art: { prompt: "A learner", regions: { top: [0, 0, 0.3, 0.3] } } },
  scenes: [
    {
      kind: "view",
      id: "hook",
      role: "hook",
      title: "画面",
      image: "art:art",
      beats: [{ say: "迷いますか?" }],
    },
    {
      kind: "view",
      id: "point",
      role: "point",
      point: 1,
      title: "見る",
      image: "shot:web/one",
      beats: [
        {
          say: "見ます。",
          zoom: "top",
          spot: ["top"],
          label: [{ at: "top", text: "ここで書く" }],
          click: "top",
        },
        { say: "次です。", image: "shot:vscode/two" },
      ],
    },
    {
      kind: "view",
      id: "recap",
      role: "recap",
      title: "まとめ",
      image: "shot:web/one",
      beats: [{ say: "まとめます。" }],
    },
  ],
});
const context: StoryboardContext = {
  shots: {
    "web/one": { width: 1200, height: 800, regions: { top: [100, 100, 100, 100] } },
    "vscode/two": { width: 1000, height: 1000, regions: {} },
  },
  artFiles: new Set(["art"]),
};
const images: Record<string, ViewImage> = Object.fromEntries(
  Object.entries(context.shots).map(([id, info]) => [
    `shot:${id}`,
    { ...info, url: `file:///tmp/${id}.png` },
  ]),
);
images["art:art"] = {
  url: "file:///tmp/art.png",
  width: 1000,
  height: 1000,
  regions: { top: [0, 0, 300, 300] },
};
function setup() {
  const sb = fresh(),
    states = storyboardStates(sb),
    state = states[1] as ViewSceneState;
  const timing = sceneTimelines(sb.scenes, [[2], [2, 2], [2]])[1];
  return { sb, state, timing, input: { state, timing, images } };
}
describe("view の絵コンテ", () => {
  it("boards を省略でき、実在情報は任意", () => {
    expect(parseStoryboard(fresh()).storyboard).toBeDefined();
    expect(parseStoryboard(fresh(), context).storyboard).toBeDefined();
    expect(parseStoryboard(fresh(), { ...context, artFiles: new Set() }).issues).toContainEqual(
      expect.objectContaining({
        level: "warning",
        message: "イラストがまだありません。video:art を実行してください",
      }),
    );
    expect(parseStoryboard(fresh(), { shots: {}, artFiles: new Set() }).issues).toContainEqual(
      expect.objectContaining({ level: "error", message: "ショットがありません: shot:web/one" }),
    );
  });
  it("画像の切り替え後の領域を使い、領域のない画像への演出を拒む", () => {
    for (const effect of [
      { spot: ["top"] },
      { zoom: "top" },
      { click: "top" },
      { label: [{ at: "top", text: "札" }] },
    ]) {
      const sb = fresh();
      Object.assign(sb.scenes[1].beats[1], effect);
      expect(
        parseStoryboard(sb, context).issues.some((i) => i.message.includes("存在しない領域")),
      ).toBe(true);
    }
    const sb = fresh();
    (sb.scenes[0] as ViewScene).beats[0].spot = ["missing"];
    expect(parseStoryboard(sb).storyboard).toBeUndefined();
  });
  it("型・参照の形・art の定義・ラベルの字数を検査する", () => {
    for (const effect of [
      { image: "https://bad" },
      { image: "shot:../bad" },
      { image: "art:missing" },
      { spot: "top" },
      { zoom: ["top"] },
      { label: [{ at: "top", text: "あ".repeat(13) }] },
    ]) {
      const sb = fresh();
      Object.assign(sb.scenes[1].beats[0], effect);
      expect(parseStoryboard(sb).storyboard, JSON.stringify(effect)).toBeUndefined();
    }
    const sb = fresh();
    if (!sb.art) throw new Error("art がありません");
    sb.art.art.regions = { bad: [0, 0, 2, 1] };
    expect(parseStoryboard(sb).issues.some((i) => i.path === "art")).toBe(true);
  });
  it("同じ画像の場面の先頭と、同じ zoom の空振りを拒む", () => {
    const sb = fresh(),
      scene = sb.scenes[1] as ViewScene;
    scene.image = "art:art";
    scene.beats = [{ say: "同じです。" }];
    expect(parseStoryboard(sb).issues.some((i) => i.path === "scenes[1].beats[0]")).toBe(true);
    scene.beats = [
      { say: "寄ります。", zoom: "top" },
      { say: "同じです。", zoom: "top" },
    ];
    expect(parseStoryboard(sb).issues.some((i) => i.path === "scenes[1].beats[1]")).toBe(true);
  });
  it("spot と札とクリックは持ち越さず、zoom は画像を変えるまで続く", () => {
    const sb = fresh(),
      scene = sb.scenes[1] as ViewScene;
    scene.beats.splice(1, 0, { say: "囲みます。", spot: ["top"] });
    const state = storyboardStates(sb)[1] as ViewSceneState;
    expect(state.beats[1].after).toMatchObject({
      image: "shot:web/one",
      zoom: "top",
      spot: ["top"],
      label: [],
    });
    expect(state.beats[1].after.click).toBeUndefined();
    expect(state.end).toEqual({ image: "shot:vscode/two", zoom: "all", spot: [], label: [] });
    expect((storyboardStates(sb)[2] as ViewSceneState).start.zoom).toBe("all");
  });
  it("view を挟んでも直前の board の状態を復元する", () => {
    const sb = fresh();
    sb.boards = {
      main: { cols: 1, rows: 1, nodes: [{ id: "a", label: "読む", art: "art", at: [1, 1] }] },
    };
    sb.scenes[0] = {
      id: "hook",
      role: "hook",
      title: "図",
      board: "main",
      beats: [{ say: "読みます。", show: ["a"] }],
    };
    sb.scenes[2] = {
      id: "recap",
      role: "recap",
      title: "図",
      board: "main",
      beats: [{ say: "まとめます。", focus: ["a"] }],
    };
    expect((storyboardStates(sb)[2] as SceneState).start.visible).toEqual(["a"]);
    expect(parseStoryboard(sb, context).storyboard).toBeDefined();
    sb.boards.main.nodes[0].art = "missing";
    expect(parseStoryboard(sb).storyboard).toBeUndefined();
  });
  it("指定された新しい試作の形が通り、引用は既存 narration と同じ読みになる", () => {
    const sb = JSON.parse(
      readFileSync(
        new URL(
          "../stages/dev-env-basics/modules/u00-start/l1-how-stella-works/t1-learning-loop/video.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    expect(parseStoryboard(sb).storyboard).toBeDefined();
    expect(speechOf({ text: "「課題」を押します。" }, {})).toBe("「課題」を押します。");
  });
});
describe("view の時刻による描画", () => {
  it.each([
    { name: "横長の領域も寄る", width: 1600, height: 194, expected: 1.32038835 },
    { name: "縦長は高さで制限する", width: 194, height: 1000, expected: 1.29770992 },
    { name: "小さい領域は上限にする", width: 20, height: 20, expected: 2.4 },
    { name: "画像全体は下限にする", width: 2560, height: 1600, expected: 1 },
  ])("24pxの余白と85%の倍率: $name", ({ width, height, expected }) => {
    const { input, timing } = setup();
    input.images = {
      ...input.images,
      "shot:web/one": {
        url: "file:///tmp/wide.png",
        width: 2560,
        height: 1600,
        regions: { top: [0, 0, width, height] },
      },
    };
    const start = timing.beats[0].start;
    const frame = viewFrame(input, start + 0.8),
      mid = viewFrame(input, start + 0.4);
    expect(frame.camera.scale).toBeCloseTo(expected, 6);
    expect(mid.camera.scale).toBeCloseTo((1 + expected) / 2, 6);
    const { box: b, camera: c } = frame;
    expect(b.x * c.scale + c.x).toBeLessThanOrEqual(b.x + 1e-9);
    expect(b.y * c.scale + c.y).toBeLessThanOrEqual(b.y + 1e-9);
    expect((b.x + b.w) * c.scale + c.x).toBeGreaterThanOrEqual(b.x + b.w - 1e-9);
    expect((b.y + b.h) * c.scale + c.y).toBeGreaterThanOrEqual(b.y + b.h - 1e-9);
    // 再生順に依存せず、巻き戻しても同じカメラになる。
    viewFrame(input, timing.duration);
    expect(viewFrame(input, start + 0.4).camera).toEqual(mid.camera);
  });

  it("縦横比・余白・倍率・カメラの制限・0.8秒の補間", () => {
    const { input, timing } = setup(),
      start = timing.beats[0].start;
    const a = viewFrame(input, start),
      mid = viewFrame(input, start + 0.4),
      end = viewFrame(input, start + 0.8);
    expect(a.box).toMatchObject({ y: 170, h: 780 });
    expect(a.box.x).toBeGreaterThanOrEqual(60);
    expect(a.camera.scale).toBe(1);
    expect(mid.camera.scale).toBeCloseTo(1.7);
    expect(end.camera.scale).toBe(2.4);
    expect(end.box.x * end.camera.scale + end.camera.x).toBeLessThanOrEqual(end.box.x);
    expect((end.box.x + end.box.w) * end.camera.scale + end.camera.x).toBeGreaterThanOrEqual(
      end.box.x + end.box.w,
    );
    expect(viewFrame(input, start + 0.4)).toEqual(mid);
  });
  it("クロスフェード・クリック移動・波紋・文末の消去", () => {
    const { input, timing } = setup(),
      start = timing.beats[0].start;
    const first = viewFrame(input, start),
      arrived = viewFrame(input, start + 0.7);
    expect(first.cursor).toBeDefined();
    expect(arrived.cursor?.ripple).toBe(0);
    expect(viewFrame(input, start + 0.95).cursor?.ripple).toBeCloseTo(0.5);
    expect(viewFrame(input, start + 1.2).cursor?.ripple).toBe(-1);
    expect(viewFrame(input, timing.beats[0].end).spots).toEqual([]);
    expect(viewFrame(input, timing.beats[0].end).cursor).toBeUndefined();
    const change = timing.beats[1].start;
    expect(viewFrame(input, change + 0.5).fade).toBeCloseTo(0.5);
    expect(viewFrame(input, change + 1).fade).toBeCloseTo(1);
    expect(viewFrame(input, change).old?.image).toBe("shot:web/one");
    expect(viewFrame(input, change).camera.scale).toBe(1);
  });
  it("同じ画像から始まる場面はフェードせず、カメラは全体へ戻る", () => {
    const { input } = setup();
    input.state.start = { ...input.state.start, image: "shot:web/one" };
    const frame = viewFrame({ ...input, previous: { ...input.state.start, zoom: "top" } }, 0);
    expect(frame.fade).toBe(1);
    expect(frame.old).toBeUndefined();
    expect(frame.camera.scale).toBe(1);
  });
  it("連続した click は前の領域から動く", () => {
    const { input, timing } = setup();
    input.state.beats[1].after = { ...input.state.beats[0].after, click: "top" };
    const start = timing.beats[1].start;
    expect(viewFrame(input, start).cursor).toMatchObject({
      x: viewFrame(input, start + 0.7).cursor?.x,
    });
  });
  it("HTML も時計を使わず、札のはみ出しと重なりを報告する", () => {
    const { sb, state, timing } = setup();
    const html = sceneHtml({
      board: { cols: 1, rows: 1, nodes: [] },
      scene: sb.scenes[1],
      state,
      timing,
      index: 1,
      total: 3,
      images,
    });
    const elements = new Map<string, { innerHTML: string; style: Record<string, string> }>();
    const document = {
      getElementById: (id: string) => {
        if (!elements.has(id)) elements.set(id, { innerHTML: "", style: {} });
        return elements.get(id);
      },
    };
    const window = {} as ScenePageWindow;
    runInNewContext(/<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? "", { window, document });
    window.__setTime(1);
    const snap = JSON.stringify([...elements]);
    window.__setTime(5);
    window.__setTime(1);
    expect(JSON.stringify([...elements])).toBe(snap);
    expect(elements.get("surface")?.innerHTML).toContain('stroke-width="4"');
    expect(html).not.toMatch(/requestAnimationFrame|Date\.now|https?:\/\//);
    expect(
      viewBusyRanges(timing).some(
        ([a, b]) => a <= timing.beats[0].start && b >= timing.beats[0].start + 1.2,
      ),
    ).toBe(true);
    expect(window.__overflows()).toEqual([]);
    state.beats[0].after.label = [
      { at: "top", text: "あ".repeat(50) },
      { at: "top", text: "札" },
    ];
    const badHtml = sceneHtml({
      board: { cols: 1, rows: 1, nodes: [] },
      scene: sb.scenes[1],
      state,
      timing,
      index: 1,
      total: 3,
      images,
    });
    runInNewContext(/<script>([\s\S]*)<\/script>/.exec(badHtml)?.[1] ?? "", { window, document });
    window.__setTime(1);
    expect(window.__overflows().some((s) => s.includes("はみ出し"))).toBe(true);
    expect(window.__overflows().some((s) => s.includes("重なって"))).toBe(true);
  });
  it("イラストのカードを広く配置し、校正へ画面と札と操作を渡す", () => {
    const b = {
      cols: 1,
      rows: 1,
      nodes: [{ id: "a", label: "読む", art: "art", at: [1, 1] as [number, number] }],
    };
    expect(layoutBoard(b).nodes.a.h).toBeGreaterThanOrEqual(450);
    const request = JSON.parse(buildPolishRequest(fresh(), "ガイド").user);
    expect(request.labels).toEqual(expect.arrayContaining(["Webアプリ", "VS Code", "ここで書く"]));
    expect(request.scenes[1].lines[0].picture).toEqual(
      expect.arrayContaining([
        "画面: Webアプリ の画面 (web/one)",
        "囲む: top",
        "寄る: top",
        "札: ここで書く",
        "押す: top",
      ]),
    );
  });
});

it("新しいまとめのイラストと矢印をセルに配置できる", () => {
  const sb = JSON.parse(
    readFileSync(
      new URL(
        "../stages/dev-env-basics/modules/u00-start/l1-how-stella-works/t1-learning-loop/video.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as VideoStoryboard;
  const boards = sb.boards ?? {};
  const board = boards.loop;
  const layout = layoutBoard(board);
  expect(Object.keys(layout.links)).toHaveLength(5);
  expect(Object.values(layout.nodes).every((b) => b.h >= 450 && b.y + b.h < 950)).toBe(true);
  const scene = sb.scenes.at(-1) as BoardScene;
  const state = storyboardStates(sb).at(-1) as SceneState;
  const timing = sceneTimelines([scene], [scene.beats.map(() => 2)])[0];
  const images = Object.fromEntries(
    board.nodes.map((n) => [
      `art:${n.art}`,
      { url: `file:///tmp/${n.art}.png`, width: 1000, height: 1000, regions: {} },
    ]),
  );
  const html = sceneHtml({ scene, state, board, timing, index: 4, total: 5, images });
  for (const node of board.nodes) expect(html).toContain(`href="file:///tmp/${node.art}.png"`);
});

const clipContext: StoryboardContext = {
  ...context,
  clips: {
    "web/action": {
      video: "fixture.mp4",
      width: 1200,
      height: 800,
      fps: 30,
      duration: 20,
      marks: { open: [2, 10], next: [10, 12] },
      regions: { top: [100, 100, 100, 100] },
    },
  },
};
function clipSetup() {
  const sb = fresh(),
    scene = sb.scenes[1] as ViewScene;
  scene.image = "clip:web/action#open";
  scene.beats = [
    { say: "操作します。", clip: "web/action#open", speed: 2, zoom: "top" },
    { say: "結果です。", spot: ["top"], label: [{ at: "top", text: "結果" }] },
  ];
  const state = storyboardStates(sb)[1] as ViewSceneState;
  const timing = sceneTimelines(sb.scenes, [[1], [1, 2], [1]], clipContext.clips)[1];
  const clipImages = {
    ...images,
    "clip:web/action#open": {
      ...images["shot:web/one"],
      frames: Array.from({ length: 240 }, (_, i) => `file:///tmp/frame-${i}.jpg`),
    },
  };
  return { sb, scene, state, timing, input: { state, timing, images: clipImages } };
}
describe("操作のクリップ", () => {
  it("参照・mark・speed・排他指定・区間の境界を検査する", () => {
    expect(parseStoryboard(clipSetup().sb, clipContext).storyboard).toBeDefined();
    for (const effect of [
      { clip: "clip:web/action#open" },
      { clip: "../action#open" },
      { clip: 3 },
      { clip: "web/missing#open" },
      { clip: "web/action#missing" },
      { image: "shot:web/one" },
      { speed: 0.49 },
      { speed: 3.01 },
      { speed: NaN },
    ]) {
      const { sb, scene } = clipSetup();
      Object.assign(scene.beats[0], effect);
      expect(parseStoryboard(sb, clipContext).storyboard, JSON.stringify(effect)).toBeUndefined();
    }
    for (const range of [
      [2, 2],
      [10, 2],
      [-1, 10],
      [2, 20.01],
      [2, Infinity],
    ]) {
      const ctx = structuredClone(clipContext);
      if (!ctx.clips) throw new Error("fixture");
      ctx.clips["web/action"].marks.open = range as [number, number];
      expect(
        parseStoryboard(clipSetup().sb, ctx).issues.some((i) => i.message.includes("区間が不正")),
      ).toBe(true);
    }
    for (const speed of [0.5, 1, 3]) {
      const { sb, scene } = clipSetup();
      scene.beats[0].speed = speed;
      expect(parseStoryboard(sb, clipContext).storyboard).toBeDefined();
    }
  });
  it("静止した最初のコマ・倍速再生・最後のコマの継承は時刻だけで決まる", () => {
    const { input, timing } = clipSetup(),
      beat = timing.beats[0];
    expect(viewFrame(input, 0).url).toBe("file:///tmp/frame-0.jpg");
    expect(viewFrame(input, beat.start + 1).url).toBe("file:///tmp/frame-60.jpg");
    expect(viewFrame(input, beat.end - 1 / 30).url).toBe("file:///tmp/frame-239.jpg");
    const frozen = viewFrame(input, timing.beats[1].start + 0.8);
    expect(frozen.url).toBe("file:///tmp/frame-239.jpg");
    expect(frozen.spots).toHaveLength(1);
    expect(frozen.labels[0].text).toBe("結果");
    expect(frozen.camera.scale).toBe(2.4);
    expect(viewFrame(input, beat.start + 1).url).toBe("file:///tmp/frame-60.jpg");
    const playback = beat.clip;
    if (!playback) throw new Error("playback is missing");
    expect(viewBusyRanges(timing).some(([a, b]) => a <= playback.start && b >= playback.end)).toBe(
      true,
    );
  });
  it("WebアプリとVS Codeの窓は札と一緒に動き、同じ組とartはフェードする", () => {
    const { input, timing } = setup(),
      start = timing.beats[1].start;
    const first = viewFrame(input, start),
      mid = viewFrame(input, start + 0.5),
      last = viewFrame(input, start + 1);
    expect(first.motion).toEqual({ scale: 0.9, x: 576 });
    expect(first.incomingOpacity).toBe(0);
    expect(viewFrame(input, start + 0.1).incomingOpacity).toBeCloseTo(0.5);
    expect(viewFrame(input, start + 0.2).incomingOpacity).toBeCloseTo(1);
    expect(mid.incomingOpacity).toBe(1);
    expect(mid.oldOpacity).toBe(1);
    expect(mid.oldDim).toBeCloseTo(0.5);
    expect(viewFrame(input, start + 0.7).oldOpacity).toBeCloseTo(1);
    expect(viewFrame(input, start + 0.85).oldOpacity).toBeCloseTo(0.5);
    expect(last.oldOpacity).toBeCloseTo(0);
    expect(last.oldMotion.x).toBeCloseTo(-115.2);
    expect(mid.motion.scale).toBeCloseTo(0.95);
    expect(mid.oldMotion.x).toBeCloseTo(-57.6);
    expect(last.motion).toEqual({ scale: 1, x: 0 });
    expect(last.oldMotion.scale).toBe(0.9);
    const opening = viewFrame({ ...input, previous: input.state.end }, 0.5);
    expect(opening.fade).toBe(0.5);
    expect(opening.incomingOpacity).toBe(1);
    expect(opening.oldOpacity).toBe(1);
    expect(opening.motion.scale).toBeCloseTo(0.95);
    input.state.beats[1].after.image = "art:art";
    expect(viewFrame(input, start + 0.2).fade).toBeCloseTo(0.5);
    expect(viewFrame(input, start + 0.2).motion).toEqual({ scale: 1, x: 0 });
    input.state.beats[1].after.image = "shot:web/other";
    input.images["shot:web/other"] = input.images["shot:web/one"];
    expect(viewFrame(input, start + 0.2).fade).toBeCloseTo(0.5);
  });
  it("HTMLのPromiseは表示するimgのデコードまで待ち、エラーも返す", async () => {
    const { sb, state, timing, input } = clipSetup();
    const html = sceneHtml({
      board: { cols: 1, rows: 1, nodes: [] },
      scene: sb.scenes[1],
      state,
      timing,
      index: 1,
      total: 3,
      images: input.images,
    });
    let finish: () => void = () => {
      throw new Error("decode has not started");
    };
    let decoding = Promise.resolve();
    const elements = new Map();
    const document = {
      getElementById: (id: string) => {
        if (!elements.has(id))
          elements.set(id, {
            innerHTML: "",
            style: {},
            querySelectorAll: () => [{ decode: () => decoding }],
            getBoundingClientRect: () => ({}),
          });
        return elements.get(id);
      },
    };
    const window = {} as ScenePageWindow;
    runInNewContext(/<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? "", { window, document });
    decoding = new Promise<void>((resolve) => {
      finish = resolve;
    });
    let resolved = false;
    const pending = window.__setTime(timing.beats[0].start + 1).then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);
    expect(elements.get("surface").innerHTML).toContain('src="file:///tmp/frame-60.jpg"');
    finish();
    await pending;
    expect(resolved).toBe(true);
    decoding = Promise.reject(new Error("decode failed"));
    await expect(window.__setTime(1)).rejects.toThrow("decode failed");
  });
  it("校正に操作とWebアプリの札を渡す", () => {
    const request = JSON.parse(buildPolishRequest(clipSetup().sb, "ガイド").user);
    expect(request.labels).toContain("Webアプリ");
    expect(request.scenes[1].lines[0].picture).toContain(
      "操作の動画: Webアプリ (web/action の open)",
    );
  });
});

it("推定時間はクリップを含めて80〜200秒、300秒を超えたらエラー", () => {
  for (const [duration, level] of [
    [60, "warning"],
    [90, undefined],
    [210, "warning"],
    [300, "error"],
  ] as const) {
    const { sb, scene } = clipSetup();
    scene.beats = [{ say: "操作します。", clip: "web/action#open" }];
    const ctx = structuredClone(clipContext);
    if (!ctx.clips) throw new Error("fixture");
    ctx.clips["web/action"].duration = duration;
    ctx.clips["web/action"].marks.open = [0, duration];
    const issue = parseStoryboard(sb, ctx).issues.find((i) => i.message.includes("推定時間"));
    expect(issue?.level, String(duration)).toBe(level);
  }
});

it("同じ組のフェードは不透明な旧画面の上に重ね、終わったら旧画面を外す", () => {
  const { sb, state, timing, input } = setup();
  state.beats[1].after.image = "shot:web/other";
  input.images = {
    ...input.images,
    "shot:web/other": { ...input.images["shot:web/one"], url: "file:///tmp/other.png" },
  };
  const html = sceneHtml({
    board: { cols: 1, rows: 1, nodes: [] },
    scene: sb.scenes[1],
    state,
    timing,
    index: 1,
    total: 3,
    images: input.images,
  });
  const elements = new Map<string, { innerHTML: string; style: Record<string, string> }>();
  const document = {
    getElementById: (id: string) => {
      if (!elements.has(id)) elements.set(id, { innerHTML: "", style: {} });
      return elements.get(id);
    },
  };
  const window = {} as ScenePageWindow;
  runInNewContext(/<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? "", { window, document });
  const start = timing.beats[1].start;
  window.__setTime(start + 0.2);
  const surface = elements.get("surface")?.innerHTML ?? "";
  expect(surface).toMatch(/^<g opacity="1"/);
  expect(viewFrame(input, start + 0.2).incomingOpacity).toBeCloseTo(0.5);
  expect(surface.indexOf('src="file:///tmp/web/one.png"')).toBeLessThan(
    surface.indexOf('src="file:///tmp/other.png"'),
  );
  window.__setTime(start + 0.4 + 1e-9);
  expect(elements.get("surface")?.innerHTML).not.toContain('src="file:///tmp/web/one.png"');
});
