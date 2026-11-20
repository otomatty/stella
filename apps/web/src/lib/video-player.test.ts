import { describe, expect, it } from "vitest";
import { clusterMarkers, formatSeekValue, formatVideoTime, timeAtPointer } from "./video-player";

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

describe("コメントの印のまとまり", () => {
  const marker = (id: string, position_sec: number, resolved = true) => ({
    id,
    position_sec,
    resolved,
    author_name: `投稿者 ${id}`,
    excerpt: `本文 ${id}`,
  });

  it("隣り合う距離が 2% 以下の印を位置順にまとめ、先頭の情報を使う", () => {
    const markers = [marker("c", 14, false), marker("a", 10), marker("d", 17), marker("b", 12)];
    expect(clusterMarkers(markers, 100)).toEqual([
      {
        positionSec: 10,
        ids: ["a", "b", "c"],
        count: 3,
        resolved: false,
        authorName: "投稿者 a",
        excerpt: "本文 a",
      },
      {
        positionSec: 17,
        ids: ["d"],
        count: 1,
        resolved: true,
        authorName: "投稿者 d",
        excerpt: "本文 d",
      },
    ]);
    expect(markers.map(({ id }) => id)).toEqual(["c", "a", "d", "b"]);
    expect(clusterMarkers(markers, 100, 0.01)).toHaveLength(4);
  });

  it("長さを超える印を丸め、元の位置順に並べる", () => {
    expect(clusterMarkers([marker("b", 120), marker("a", 110)], 100)).toMatchObject([
      { positionSec: 100, ids: ["a", "b"], count: 2, resolved: true },
    ]);
  });

  it.each([0, -1, NaN, Infinity])("長さが %s なら印を返さない", (duration) => {
    expect(clusterMarkers([marker("a", 0)], duration)).toEqual([]);
  });
});
