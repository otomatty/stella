import { expect, it } from "vitest";
import { beatClock } from "./beat-clock";

const atBeat = beatClock(
  [
    { start: 0.5, end: 1.5 },
    { start: 3, end: 9 },
    { start: 10, end: 14 },
  ],
  [4, 4, 4],
);

it("設計と同じ長さ以上の文では開始からの間隔を保つ", () => {
  expect(atBeat(1, 3)).toBe(6);
  expect(atBeat(2, 3)).toBe(13);
});

it("短い文では開始からの間隔を同じ割合で縮める", () => {
  expect(atBeat(0)).toBe(0.5);
  expect(atBeat(0, 2)).toBe(1);
  expect(atBeat(0, 4)).toBe(1.5);
});

it("文より前の間隔を保ち、0 秒より前は丸める", () => {
  expect(atBeat(0, -0.4)).toBeCloseTo(0.1);
  expect(atBeat(0, -0.6)).toBe(0);
});
