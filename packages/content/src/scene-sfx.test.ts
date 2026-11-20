import { describe, expect, it } from "vitest";
import {
  SCENE_SFX_PEAK_DBFS,
  SCENE_SFX_SECONDS,
  sceneSfxCues,
  synthesizeSceneSfx,
} from "./scene-sfx.js";
import { sceneTimelines, sceneVideoSequence } from "./scene-timeline.js";
import { viewFrame } from "./scene-view.js";
import {
  storyboardStates,
  type BoardScene,
  type Scene,
  type VideoStoryboard,
  type ViewScene,
} from "./video-storyboard.js";

describe.each([24000, 48000])("%sHzの効果音", (rate) => {
  it.each(["switch", "title"] as const)(
    "%sは決定的で、指定の長さ・ピーク・滑らかな両端を持つ",
    (kind) => {
      const pcm = synthesizeSceneSfx(kind, rate);
      expect(pcm).toEqual(synthesizeSceneSfx(kind, rate));
      expect(pcm.length).toBe(Math.round(SCENE_SFX_SECONDS[kind] * rate));
      const peak = pcm.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
      expect(20 * Math.log10(peak / 32768)).toBeCloseTo(SCENE_SFX_PEAK_DBFS, 2);
      expect(pcm[0]).toBe(0);
      expect(pcm.at(-1)).toBe(0);
      expect(pcm.subarray(0, Math.round(rate * 0.005)).every((v) => Math.abs(v) < peak / 2)).toBe(
        true,
      );
      expect(pcm.subarray(-Math.round(rate * 0.005)).every((v) => Math.abs(v) < peak / 50)).toBe(
        true,
      );
    },
  );
});

const scene: ViewScene = {
  kind: "view",
  id: "view",
  role: "point",
  title: "操作",
  image: "shot:vscode/edit",
  beats: [
    { say: "押します", click: "button" },
    { say: "Webへ", clip: "web/open#main" },
    { say: "同じアプリ", image: "shot:web/next" },
    { say: "戻る", image: "shot:vscode/edit" },
  ],
};
const timing = sceneTimelines([scene], [[1, 1, 1, 1]])[0];
it("窓の入れ替えだけを、冒頭0秒と文のstartで鳴らす。全体のstartや再生開始時刻を使わない", () => {
  const shifted = { ...timing, start: 99, beats: structuredClone(timing.beats) };
  shifted.beats[1].clip = { start: timing.beats[1].start + 1, end: 10, speed: 1 };
  expect(sceneSfxCues(scene, shifted, "shot:web/prior")).toEqual([
    { kind: "switch", at: 0 },
    { kind: "switch", at: timing.beats[1].start },
    { kind: "switch", at: timing.beats[3].start },
  ]);
});
it.each([undefined, "shot:vscode/other", "art:illustration"])(
  "前の画像%sから窓が入れ替わらなければ冒頭は鳴らさない",
  (previous) => {
    expect(sceneSfxCues({ ...scene, beats: [scene.beats[0]] }, timing, previous)).toEqual([]);
  },
);
it("文字場面だけに0.1秒のチャイムを足し、boardや同名の通常場面には足さない", () => {
  const entries = sceneVideoSequence([], [], { title: "タイトル", takeaway: "まとめ" });
  expect(entries.map(({ scene, timing }) => sceneSfxCues(scene, timing))).toEqual([
    [{ kind: "title", at: 0.1 }],
  ]);
  expect(
    sceneSfxCues({ id: "title", title: "図解", role: "hook", board: "main", beats: [] }, timing),
  ).toEqual([]);
});
it("効果音の時刻がviewFrameの窓の入れ替わり開始と一致する", () => {
  const storyboard: VideoStoryboard = {
    schema: 1,
    brief: { goal: "操作", stuck: "迷う", points: ["切り替え"], leaveOut: [] },
    scenes: [scene],
  };
  const state = storyboardStates(storyboard)[0];
  if (state.kind !== "view") throw new Error("viewではありません");
  const previous = { ...state.start, image: "shot:web/prior" };
  const images = Object.fromEntries(
    [previous.image, scene.image, "clip:web/open#main", "shot:web/next"].map((id) => [
      id,
      {
        url: id,
        width: 1600,
        height: 1000,
        regions: { button: [0, 0, 10, 10] as [number, number, number, number] },
      },
    ]),
  );
  for (const cue of sceneSfxCues(scene, timing, previous.image)) {
    const frame = viewFrame({ state, timing, images, previous }, cue.at);
    expect(frame.switching).toBe(true);
    expect(frame.fade).toBe(0);
    expect(viewFrame({ state, timing, images, previous }, cue.at + 0.1).fade).toBeCloseTo(0.1);
  }
});

const board = {
  cols: 3,
  rows: 1,
  nodes: [
    { id: "a", label: "値", icon: "file" as const, at: [1, 1] as [number, number] },
    { id: "b", label: "先", icon: "file" as const, at: [2, 1] as [number, number] },
  ],
  links: [{ id: "ab", from: "a", to: "b" }],
};

function lessonCues(scene: Scene, schema: 1 | 2 = 2) {
  const [timing] = sceneTimelines([scene], [scene.beats.map(() => 1)], undefined, schema);
  const [state] = storyboardStates({
    schema,
    brief: { goal: "", stuck: "", points: [], leaveOut: [] },
    boards: { main: board },
    scenes: [scene],
  });
  return { timing, cues: sceneSfxCues(scene, timing, undefined, schema, state) };
}

it("印・札・移動を状態から拾い、1文1音を優先順に鳴らす", () => {
  const motion = { travel: { along: ["ab"] } };
  const quiz: BoardScene = {
    id: "quiz",
    role: "quiz",
    title: "問題",
    board: "main",
    think: 3.5,
    beats: [
      {
        say: "用語",
        term: { text: "値" },
        show: ["a", "b", "ab"],
        mark: [{ on: "a", kind: "check" }],
      },
      {
        say: "正解",
        mark: [
          { on: "a", kind: "cross" },
          { on: "b", kind: "check" },
        ],
      },
      {
        say: "不正解",
        mark: [
          { on: "a", kind: "question" },
          { on: "b", kind: "cross" },
        ],
      },
      { say: "疑問", mark: [{ on: "b", kind: "question" }], tag: { a: "1" } },
      { say: "変わらない", mark: [{ on: "b", kind: "question" }], tag: { a: "1" } },
      { say: "札が変わる", tag: { a: "2" }, ...motion },
      { say: "移動", ...motion },
      {
        say: "隠れた札と印",
        hide: ["b", "ab"],
        tag: { b: "3" },
        mark: [{ on: "b", kind: "cross" }],
      },
      { say: "まだ隠れている札", tag: { b: "4" } },
      { say: "札を外す", untag: ["a"] },
      { say: "札を付ける", tag: { a: "1" } },
    ],
  };
  const { cues, timing } = lessonCues(quiz);
  const start = (index: number) => timing.beats[index].start;
  const think = timing.think?.start ?? Number.NaN;
  expect(cues).toEqual([
    { kind: "quiz", at: 0 },
    { kind: "term", at: start(0) },
    { kind: "correct", at: start(1) },
    { kind: "wrong", at: start(2) },
    { kind: "question", at: start(3) },
    { kind: "pop", at: start(5) + 0.1 },
    { kind: "move", at: start(6) },
    { kind: "pop", at: start(10) + 0.1 },
    ...[0, 1, 2, 3].map((offset) => ({ kind: "tick", at: think + offset })),
    { kind: "timeup", at: think + 3.5 },
  ]);
  expect(lessonCues({ ...quiz, think: 3 }).cues.slice(-4)).toEqual([
    { kind: "tick", at: think },
    { kind: "tick", at: think + 1 },
    { kind: "tick", at: think + 2 },
    { kind: "timeup", at: think + 3 },
  ]);
  expect(lessonCues(quiz, 1).cues).toEqual([]);
});

it("figureの状態とコードの行の印・意味の吹き出しで鳴らす", () => {
  const { timing, cues } = lessonCues({
    kind: "code",
    id: "syntax",
    role: "syntax",
    title: "コード",
    code: ["const a = 1;", "const b = 2;"],
    show: [0],
    panel: { kind: "figure", board: "main" },
    beats: [
      { say: "正解", figure: { show: ["a", "b", "ab"], mark: [{ on: "a", kind: "check" }] } },
      { say: "不正解", figure: { mark: [{ on: "a", kind: "cross" }] } },
      { say: "疑問", figure: { mark: [{ on: "a", kind: "question" }] } },
      { say: "札", figure: { tag: { a: "1" } } },
      { say: "同じ札と印", figure: { tag: { a: "1" }, mark: [{ on: "a", kind: "question" }] } },
      { say: "図の移動", figure: { travel: { along: ["ab"] } } },
      { say: "行の不正解", mark: [{ line: 0, kind: "cross" }] },
      {
        say: "同じ印・見えない行",
        mark: [
          { line: 0, kind: "cross" },
          { line: 1, kind: "cross" },
        ],
      },
      { say: "意味", part: { line: 0, text: "const", note: "定数" } },
    ],
  });
  const start = (index: number) => timing.beats[index].start;
  expect(cues).toEqual([
    { kind: "scene", at: 0 },
    { kind: "correct", at: start(0) },
    { kind: "wrong", at: start(1) },
    { kind: "question", at: start(2) },
    { kind: "pop", at: start(3) + 0.1 },
    { kind: "move", at: start(5) },
    { kind: "wrong", at: start(6) },
    { kind: "pop", at: start(8) + 0.1 },
  ]);
});

it("schema 2 でも窓の切り替えを保ち、場面の頭の切り替え音を重ねない", () => {
  const previous = "shot:web/prior";
  const legacy = sceneSfxCues(scene, timing, previous);
  expect(sceneSfxCues(scene, timing, previous, 1)).toEqual(legacy);
  expect(sceneSfxCues(scene, timing, previous, 2)).toEqual(legacy);
  expect(sceneSfxCues(scene, timing, undefined, 2)).toEqual([
    { kind: "scene", at: 0 },
    ...legacy.slice(1),
  ]);
  const [title] = sceneVideoSequence([], [], { title: "タイトル", takeaway: "まとめ" });
  expect(sceneSfxCues(title.scene, title.timing, undefined, 2)).toEqual([
    { kind: "title", at: 0.1 },
  ]);
});

it("ダイアログの pop は文の開始で鳴り、用語に次いで印・札・移動より優先する", () => {
  const dialog = { title: "完成したコード", code: ["const value = 1;"] };
  const scene: BoardScene = {
    id: "goal",
    role: "goal",
    title: "学ぶこと",
    board: "main",
    beats: [
      {
        say: "コードを見せます。",
        dialog,
        show: ["a", "b", "ab"],
        mark: [{ on: "a", kind: "check" }],
        tag: { a: "1" },
        travel: { along: ["ab"] },
      },
      { say: "用語を見せます。", term: { text: "値", ruby: "あたい" }, dialog },
    ],
  };
  const { timing, cues } = lessonCues(scene);
  expect(cues).toEqual([
    { kind: "scene", at: 0 },
    { kind: "pop", at: timing.beats[0].start },
    { kind: "term", at: timing.beats[1].start },
  ]);
  expect(lessonCues(scene, 1).cues).toEqual([]);
});

it("色分けが付く文だけで pop が鳴り、印と移動の間で優先する", () => {
  const classified: Scene = {
    kind: "code",
    id: "syntax",
    role: "syntax",
    title: "色分け",
    code: ["const x = 1;"],
    show: true,
    panel: { kind: "figure", board: "main" },
    beats: [
      {
        say: "決まった書き方",
        classify: { fixed: [{ line: 0, text: "const" }] },
        figure: { show: ["a", "ab", "b"] },
      },
      { say: "同じ色", classify: { fixed: [{ line: 0, text: "const" }] } },
      {
        say: "名前",
        classify: { free: [{ line: 0, text: "x" }] },
        figure: { travel: { along: ["ab"] } },
      },
      {
        say: "印",
        classify: { free: [{ line: 0, text: "1" }] },
        figure: { mark: [{ on: "a", kind: "check" }] },
      },
      {
        say: "色を変える",
        classify: { fixed: [{ line: 0, text: "x" }] },
        part: { line: 0, text: "x", note: "名前" },
      },
    ],
  };
  const { cues, timing } = lessonCues(classified);
  const start = (i: number) => timing.beats[i].start;
  expect(cues).toEqual([
    { kind: "scene", at: 0 },
    { kind: "pop", at: start(0) + 0.1 },
    { kind: "pop", at: start(2) + 0.1 },
    { kind: "correct", at: start(3) },
    { kind: "pop", at: start(4) + 0.1 },
  ]);
  expect(lessonCues(classified, 1).cues).toEqual([]);
  expect(sceneSfxCues(classified, timing, undefined, 2)).toContainEqual({
    kind: "pop",
    at: start(0) + 0.1,
  });
});
