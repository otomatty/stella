import { describe, expect, it } from "vitest";
import type { Lesson, Stage } from "@/data/types";
import { lessonSubmissionTarget, submissionMatchesTarget } from "./lesson-submissions";

const targetOf = (
  type: Lesson["type"],
  format: Stage["format"] = 2,
  taskId: string | null = null,
  assignmentId?: string,
) => lessonSubmissionTarget({ format, lesson: { id: "lesson-1", type, assignmentId }, taskId });

describe("lessonSubmissionTarget", () => {
  it("新形式の課題文レッスンは課題を対象にする", () => {
    expect(targetOf("text", 2, "task-1")).toEqual({ kind: "task", taskId: "task-1" });
  });

  it("課題の無い text は取得中・失敗時も対象がない", () => {
    expect(targetOf("text")).toBeNull();
  });

  it.each(["slides", "quiz", "video"] as const)("%s は対象がない", (type) => {
    expect(targetOf(type)).toBeNull();
    expect(targetOf(type, 2, "task-1")).toBeNull();
    expect(targetOf(type, 1)).toBeNull();
  });

  it("旧形式の assignment はレッスンと任意の assignment を対象にする", () => {
    expect(targetOf("assignment", 1)).toEqual({ kind: "legacy", lessonId: "lesson-1" });
    expect(targetOf("assignment", 1, null, "assignment-1")).toEqual({
      kind: "legacy",
      lessonId: "lesson-1",
      assignmentId: "assignment-1",
    });
    expect(
      lessonSubmissionTarget({
        format: undefined,
        lesson: { id: "lesson-1", type: "assignment" },
        taskId: null,
      }),
    ).toEqual({ kind: "legacy", lessonId: "lesson-1" });
  });

  it("旧形式の code は assignmentId があるときだけ対象にする", () => {
    expect(targetOf("code", 1, null, "assignment-1")).toEqual({
      kind: "legacy",
      lessonId: "lesson-1",
      assignmentId: "assignment-1",
    });
    expect(targetOf("code", 1)).toBeNull();
  });

  it("format 2 の assignment は旧形式として扱わない", () => {
    expect(targetOf("assignment", 2, "task-1", "assignment-1")).toBeNull();
  });

  it("format 2 の code レッスン (assignmentId あり) は legacy を対象にする", () => {
    expect(targetOf("code", 2, null, "assignment-1")).toEqual({
      kind: "legacy",
      lessonId: "lesson-1",
      assignmentId: "assignment-1",
    });
  });

  it("format 2 の code レッスン (assignmentId なし) は対象がない", () => {
    expect(targetOf("code", 2)).toBeNull();
    expect(targetOf("code", 2, "task-1")).toBeNull();
  });
});

describe("submissionMatchesTarget", () => {
  it("task は taskId だけで一致を決める", () => {
    const target = { kind: "task", taskId: "task-1" } as const;
    expect(submissionMatchesTarget({ taskId: "task-1" }, target)).toBe(true);
    expect(submissionMatchesTarget({ taskId: "task-2" }, target)).toBe(false);
    expect(
      submissionMatchesTarget({ lessonId: "lesson-1", assignmentId: "assignment-1" }, target),
    ).toBe(false);
  });

  it("legacy は lessonId または assignmentId の一致を認める", () => {
    const target = {
      kind: "legacy",
      lessonId: "lesson-1",
      assignmentId: "assignment-1",
    } as const;
    expect(submissionMatchesTarget({ lessonId: "lesson-1" }, target)).toBe(true);
    expect(submissionMatchesTarget({ lessonId: "lesson-2" }, target)).toBe(false);
    expect(submissionMatchesTarget({ assignmentId: "assignment-1" }, target)).toBe(true);
    expect(
      submissionMatchesTarget({ lessonId: "lesson-2", assignmentId: "assignment-1" }, target),
    ).toBe(true);
    expect(submissionMatchesTarget({ assignmentId: "assignment-2" }, target)).toBe(false);
    expect(submissionMatchesTarget({}, { kind: "legacy", lessonId: "lesson-1" })).toBe(false);
  });

  it("taskId があれば lessonId・assignmentId が一致しても legacy に混ぜない", () => {
    expect(
      submissionMatchesTarget(
        { taskId: "task-1", lessonId: "lesson-1", assignmentId: "assignment-1" },
        { kind: "legacy", lessonId: "lesson-1", assignmentId: "assignment-1" },
      ),
    ).toBe(false);
  });
});
