import { describe, expect, it } from "vitest";
import { sceneTimelines, sceneVtt } from "./scene-timeline.js";
import type { Scene } from "./video-storyboard.js";
const scenes = [0, 1, 2].map(
  (_, i): Scene => ({
    id: String(i),
    role: i === 0 ? "hook" : i === 2 ? "recap" : "point",
    title: "図解",
    board: "main",
    beats: [{ say: "文です。" }, { say: "次です。" }],
  }),
);
describe("場面の時刻", () => {
  it("冒頭・文間・末尾の間を足し、30fpsの境界へ丸める", () => {
    const t = sceneTimelines(scenes, [
      [1, 2],
      [1.01, 2.01],
      [1, 2],
    ]);
    expect(t[0].beats).toEqual([
      { say: "文です。", start: 0.8, end: 1.8 },
      { say: "次です。", start: 2.7, end: 4.7 },
    ]);
    expect(t[0].duration).toBeCloseTo(6.8);
    expect(t[1].start).toBe(t[0].duration);
    expect(t[2].start).toBe(t[0].duration + t[1].duration);
    expect(t[2].duration).toBeCloseTo(7.6);
    for (const scene of t) expect(scene.duration * 30).toBeCloseTo(Math.round(scene.duration * 30));
  });
  it("字幕は全体時刻で1文1件、タグと&はエスケープする", () => {
    const t = sceneTimelines(scenes, [
      [1, 2],
      [1, 2],
      [1, 2],
    ]);
    t[0].beats[0].say = "<b>&";
    const vtt = sceneVtt(t);
    expect(vtt).toContain("00:00:00.800 --> 00:00:01.800\n&lt;b&gt;&amp;");
    expect(vtt).toContain("3\n00:00:07.600 --> 00:00:08.600");
    expect(vtt.match(/-->/g)).toHaveLength(6);
  });
});

it("操作と切り替えと0.6秒を待ち、字幕は音声が終わるところまで", () => {
  const clip = {
    video: "fixture.mp4",
    width: 1600,
    height: 1000,
    fps: 30,
    duration: 20,
    marks: { open: [2, 12] as [number, number] },
    regions: {},
  };
  const scene: Scene = {
    kind: "view",
    id: "s",
    role: "hook",
    title: "操作",
    image: "shot:vscode/one",
    beats: [
      { say: "操作します。", clip: "web/action#open", speed: 2 },
      { say: "読みます。", zoom: "all" },
    ],
  };
  const t = sceneTimelines([scene], [[1, 8]], { "web/action": clip })[0];
  expect(t.beats[0].start).toBe(0.8);
  expect(t.beats[0].clip?.start).toBeCloseTo(1.8);
  expect(t.beats[0].clip?.end).toBeCloseTo(6.8);
  expect(t.beats[0].end).toBeCloseTo(7.4);
  expect(t.beats[1].start).toBeCloseTo(8.3);
  expect(sceneVtt([t])).toContain("00:00:00.800 --> 00:00:01.800");
  const longSpeech = sceneTimelines([scene], [[10, 8]], { "web/action": clip })[0];
  expect(longSpeech.beats[0].end).toBeCloseTo(10.8);
  expect(longSpeech.beats[1].start).toBeCloseTo(11.7);
  scene.beats[0] = { say: "操作します。", clip: "web/action#open" };
  scene.image = "clip:web/action#open";
  const opening = sceneTimelines(
    [{ ...scene, image: "shot:vscode/one", beats: [] }, scene],
    [[], [1, 8]],
    { "web/action": clip },
  )[1];
  expect(opening.beats[0].clip?.start).toBeCloseTo(1);
});
