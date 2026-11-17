import { describe, expect, it } from "vitest";
import {
  SCENE_SFX_PEAK_DBFS,
  SCENE_SFX_SECONDS,
  sceneSfxCues,
  synthesizeSceneSfx,
} from "./scene-sfx.js";
import { sceneTimelines, sceneVideoSequence } from "./scene-timeline.js";
import { viewFrame } from "./scene-view.js";
import { storyboardStates, type VideoStoryboard, type ViewScene } from "./video-storyboard.js";

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
