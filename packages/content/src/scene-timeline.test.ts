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
      { say: "文です。", start: 0.5, end: 1.5 },
      { say: "次です。", start: 1.85, end: 3.85 },
    ]);
    expect(t[0].duration).toBeCloseTo(4.9);
    expect(t[1].start).toBe(t[0].duration);
    expect(t[2].start).toBe(t[0].duration + t[1].duration);
    expect(t[2].duration).toBeCloseTo(5.7);
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
    expect(vtt).toContain("00:00:00.500 --> 00:00:01.500\n&lt;b&gt;&amp;");
    expect(vtt).toContain("3\n00:00:05.400 --> 00:00:06.400");
    expect(vtt.match(/-->/g)).toHaveLength(6);
  });
});
