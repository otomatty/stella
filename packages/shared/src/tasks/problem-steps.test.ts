import { describe, expect, it } from "vitest";
import { problemStepStates } from "./problem-steps.js";

describe("動画と前の提出で出る問題", () => {
  const steps = [
    { problemId: "q3", afterLessonId: "video2", position: 2 },
    { problemId: "q1", afterLessonId: "video1", position: 0 },
    { problemId: "q2", afterLessonId: "video1", position: 1 },
  ];

  it("動画が未完了なら動画を優先し、完了した動画の中では position 順に出す", () => {
    expect(problemStepStates(steps, new Set(["video1"]), new Set())).toEqual(
      new Map([
        ["q1", "open"],
        ["q2", "locked-previous"],
        ["q3", "locked-video"],
      ]),
    );
    expect(problemStepStates(steps, new Set(["video1", "video2"]), new Set()).get("q3")).toBe(
      "locked-previous",
    );
  });

  it("手で済みにした問題も提出として扱い、動画の完了より提出を優先する", () => {
    const manuallySubmitted = new Set(["q1", "q3"]);
    expect(problemStepStates(steps, new Set(["video1"]), manuallySubmitted)).toEqual(
      new Map([
        ["q1", "submitted"],
        ["q2", "open"],
        ["q3", "submitted"],
      ]),
    );
    expect(problemStepStates(steps, new Set(), manuallySubmitted).get("q1")).toBe("submitted");
  });
});
