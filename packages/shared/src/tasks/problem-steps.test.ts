import { describe, expect, it } from "vitest";
import { presentProblemStep } from "./problem-steps.js";
import type { LockStep } from "./step-lock.js";

describe("問題の解放状態", () => {
  const steps: LockStep[] = [
    { id: "video1", kind: "content", title: "最初の動画" },
    { id: "q1", kind: "problem", title: "問1" },
    { id: "video2", kind: "content", title: "次の動画" },
    { id: "q2", kind: "problem", title: "問2" },
  ];

  it("最初の未完了ステップを、種類に応じたロック状態とともに返す", () => {
    expect(presentProblemStep(steps, 3, new Set())).toEqual({
      state: "locked-video",
      blocking: steps[0],
    });
    expect(presentProblemStep(steps, 3, new Set(["video1"]))).toEqual({
      state: "locked-previous",
      blocking: steps[1],
    });
    expect(presentProblemStep(steps, 3, new Set(["video1", "q1"]))).toEqual({
      state: "locked-video",
      blocking: steps[2],
    });
  });

  it("前のステップが完了していれば開き、提出済みなら前の完了状況を問わない", () => {
    expect(presentProblemStep(steps, 3, new Set(["video1", "q1", "video2"]))).toEqual({
      state: "open",
      blocking: null,
    });
    expect(presentProblemStep(steps, 3, new Set(["q2"]))).toEqual({
      state: "submitted",
      blocking: null,
    });
  });

  it("問題以外のステップの状態は返さない", () => {
    expect(presentProblemStep(steps, 2, new Set())).toBeNull();
  });
});
