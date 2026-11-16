import { describe, expect, it } from "vitest";
import { validateFrames } from "./video-shots";
const videos = { "screen.mp4": { width: 1600, height: 1000, duration: 90 } };
const frame = {
  id: "vscode/task-open",
  video: "screen.mp4",
  at: 12,
  regions: { editor: [440, 84, 578, 876] },
};
describe("ショットの定義", () => {
  it("画像の端に接する領域と時刻0を受け付ける", () => {
    const result = validateFrames(
      [{ ...frame, at: 0, regions: { all: [0, 0, 1600, 1000] } }],
      videos,
    );
    expect(result.errors).toEqual([]);
    expect(result.frames).toHaveLength(1);
  });
  it("id・重複・動画・時刻・複数の領域のエラーを全部集める", () => {
    const result = validateFrames(
      [
        {
          ...frame,
          id: "../escape",
          video: "missing",
          at: -1,
          regions: { a: [-1, 0, 2, 2], b: [0, 0, 0, 2] },
        },
        frame,
        { ...frame, at: 90, regions: { outside: [1599, 999, 2, 2] } },
      ],
      videos,
    );
    expect(result.errors).toHaveLength(8);
    expect(result.frames).toEqual([]);
  });
  it.each([null, {}, "frames"])("配列でなければ失敗: %j", (value) => {
    expect(validateFrames(value, videos).errors).toHaveLength(1);
  });
  it.each([NaN, Infinity, "12", 90, -0.1])("不正な時刻を拒否: %j", (at) => {
    expect(validateFrames([{ ...frame, at }], videos).errors).toHaveLength(1);
  });
  it.each([
    [0, 0, 1],
    [0, 0, Infinity, 1],
    [0, 0, -1, 1],
    [0, 0, "1", 1],
    [0, 999, 1, 2],
  ])("不正な領域を拒否: %j", (...rect) => {
    expect(validateFrames([{ ...frame, regions: { rect } }], videos).errors).toHaveLength(1);
  });
});
