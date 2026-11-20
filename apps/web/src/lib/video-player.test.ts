import { describe, expect, it } from "vitest";
import { formatSeekValue, formatVideoTime, timeAtPointer } from "./video-player";

describe("シークバーの座標", () => {
  const rect = { left: 100, width: 200 };

  it.each([
    [50, 60, 0],
    [100, 60, 0],
    [175, 10, 3.75],
    [300, 60, 60],
    [350, 60, 60],
    [200, 0, 0],
    [200, Number.NaN, 0],
    [200, Number.POSITIVE_INFINITY, 0],
    [Number.NaN, 60, 0],
  ])("座標 %s、長さ %s の再生位置は %s 秒", (clientX, duration, expected) => {
    expect(timeAtPointer(clientX, rect, duration)).toBe(expected);
  });

  it("幅がないときは先頭を返す", () => {
    expect(timeAtPointer(200, { left: 100, width: 0 }, 60)).toBe(0);
  });
});

describe("動画の時刻表示", () => {
  it.each([
    [0, "0:00"],
    [Number.NaN, "0:00"],
    [-1, "0:00"],
    [134.9, "2:14"],
    [3599, "59:59"],
    [3600, "1:00:00"],
    [3665, "1:01:05"],
  ])("%s 秒を %s と表示する", (seconds, expected) => {
    expect(formatVideoTime(seconds)).toBe(expected);
  });

  it("再生位置と長さを日本語で読み上げる", () => {
    expect(formatSeekValue(134, 400)).toBe("2分14秒 / 6分40秒");
    expect(formatSeekValue(3603, 3665)).toBe("1時間0分3秒 / 1時間1分5秒");
    expect(formatSeekValue(0, Number.NaN)).toBe("0分0秒 / 0分0秒");
  });
});
