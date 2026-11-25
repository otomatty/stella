import { describe, expect, it } from "vitest";
import { blockingStep, isLockedStep, lockKindOfLessonType, type LockStep } from "./step-lock.js";

describe("ステージのレッスン順による問題の解放", () => {
  const steps: LockStep[] = [
    { id: "unit-1-text", kind: lockKindOfLessonType("text"), title: "まとめ" },
    { id: "unit-1-quiz", kind: lockKindOfLessonType("quiz"), title: "知識問題" },
    { id: "unit-1-slides", kind: "content", title: "スライド" },
    { id: "unit-1-task-1-q1", kind: "problem", title: "問1" },
    { id: "unit-2-video", kind: "content", title: "動画" },
    { id: "unit-2-task-2-q1", kind: "problem", title: "次の課題の問1" },
  ];

  it("未完了の内容を飛ばすと止まり、テキストと知識問題は数えない", () => {
    expect(blockingStep(steps, 3, new Set())).toBe(steps[2]);
    expect(isLockedStep(steps, 3, new Set())).toBe(true);
    expect(isLockedStep(steps, 3, new Set(["unit-1-slides"]))).toBe(false);
  });

  it("前の問題や動画が未完了なら、課題やセクションをまたいで止まる", () => {
    const done = new Set(["unit-1-slides"]);
    expect(blockingStep(steps, 5, done)).toBe(steps[3]);
    done.add("unit-1-task-1-q1");
    expect(blockingStep(steps, 5, done)).toBe(steps[4]);
    done.add("unit-2-video");
    expect(blockingStep(steps, 5, done)).toBeNull();
  });

  it("提出済みの問題と問題以外のレッスンは止めない", () => {
    expect(blockingStep(steps, 5, new Set(["unit-2-task-2-q1"]))).toBeNull();
    for (const index of [0, 1, 2, 4]) {
      expect(isLockedStep(steps, index, new Set())).toBe(false);
    }
  });

  it("動画とスライドだけを content にする", () => {
    expect(["video", "slides"].map(lockKindOfLessonType)).toEqual(["content", "content"]);
    expect(["text", "quiz", "code", "assignment", ""].map(lockKindOfLessonType)).toEqual([
      "other",
      "other",
      "other",
      "other",
      "other",
    ]);
  });
});
