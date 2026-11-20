import { describe, expect, it } from "vitest";
import {
  type CommentAnchor,
  mentionCandidates,
  resolveCommentPosition,
  sceneAt,
} from "./comments.js";

const scenes = [
  { id: "intro", startSec: 0, durationSec: 10, hash: "intro" },
  { id: "search", startSec: 10, durationSec: 5, hash: "search" },
  { id: "end", startSec: 17, durationSec: 3, hash: "end" },
];
const anchor: CommentAnchor = {
  positionSec: 14,
  videoPath: "old.mp4",
  sceneId: "search",
  sceneOffsetSec: 4,
  sceneHash: "search",
};

describe("sceneAt", () => {
  it("始点を含み、最後の場面だけ終点を含む", () => {
    expect(sceneAt(scenes, 0)).toBe(scenes[0]);
    expect(sceneAt(scenes, 9.99)).toBe(scenes[0]);
    expect(sceneAt(scenes, 10)).toBe(scenes[1]);
    expect(sceneAt(scenes, 15)).toBeNull();
    expect(sceneAt(scenes, 16)).toBeNull();
    expect(sceneAt(scenes, 20)).toBe(scenes[2]);
    expect(sceneAt(scenes, 20.01)).toBeNull();
    expect(sceneAt(scenes, -1)).toBeNull();
    expect(sceneAt([], 0)).toBeNull();
    expect(sceneAt(null, 0)).toBeNull();
  });
});

describe("resolveCommentPosition", () => {
  const current = { videoPath: "new.mp4", scenes: [{ ...scenes[1], startSec: 25 }] };

  it("動画全体へのコメントは時刻を持たない", () => {
    expect(resolveCommentPosition({ ...anchor, positionSec: null }, current)).toEqual({
      state: "untimed",
      positionSec: null,
    });
  });

  it("保存時と同じ版なら場面の情報がなくても元の時刻を使う", () => {
    expect(resolveCommentPosition(anchor, { videoPath: "old.mp4", scenes: null })).toEqual({
      state: "current",
      positionSec: 14,
    });
  });

  it("同じ内容の場面に引き直し、場面の長さでオフセットを丸める", () => {
    expect(resolveCommentPosition(anchor, current)).toEqual({ state: "current", positionSec: 29 });
    expect(resolveCommentPosition({ ...anchor, sceneOffsetSec: 7 }, current)).toEqual({
      state: "current",
      positionSec: 30,
    });
  });

  it("場面の内容が変わったら場面の始点を使う", () => {
    expect(
      resolveCommentPosition(anchor, {
        ...current,
        scenes: [{ ...current.scenes[0], hash: "changed" }],
      }),
    ).toEqual({ state: "outdated", positionSec: 25 });
  });

  it("動画や場面がない、または投稿時の場面情報がない場合は位置を失う", () => {
    for (const video of [
      { videoPath: null, scenes: current.scenes },
      { ...current, scenes: null },
      { ...current, scenes: [scenes[0]] },
    ]) {
      expect(resolveCommentPosition(anchor, video)).toEqual({
        state: "orphaned",
        positionSec: null,
      });
    }
    expect(resolveCommentPosition({ ...anchor, sceneId: null }, current)).toEqual({
      state: "orphaned",
      positionSec: null,
    });
  });
});

describe("mentionCandidates", () => {
  it("先頭と返信の投稿者を重複なく返し、本人は除く", () => {
    expect(mentionCandidates("a", ["b", "a", "c", "b"], "b")).toEqual(["a", "c"]);
    expect(mentionCandidates("a", ["a", "b"], "a")).toEqual(["b"]);
  });
});
