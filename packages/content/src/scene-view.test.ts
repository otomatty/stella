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
    expect(viewFrame(input, change + 0.2).fade).toBeCloseTo(0.5);
    expect(viewFrame(input, change + 0.4).fade).toBeCloseTo(1);
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
    expect(viewBusyRanges(timing).some(([a, b]) => a <= 0.5 && b >= 1.7)).toBe(true);
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
    expect(request.labels).toEqual(expect.arrayContaining(["Web", "VS Code", "ここで書く"]));
    expect(request.scenes[1].lines[0].picture).toEqual(
      expect.arrayContaining([
        "画面: Web の画面 (web/one)",
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
