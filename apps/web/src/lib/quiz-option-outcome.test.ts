import { describe, expect, it } from "vitest";

import { quizOptionOutcome } from "@/lib/quiz-option-outcome";

describe("quizOptionOutcome", () => {
  it.each([
    { selected: true, correct: true, outcome: "hit" },
    { selected: false, correct: true, outcome: "missed" },
    { selected: true, correct: false, outcome: "wrong" },
    { selected: false, correct: false, outcome: "none" },
  ])("$selected / $correct → $outcome", ({ selected, correct, outcome }) => {
    expect(quizOptionOutcome(selected, correct)).toBe(outcome);
  });
});
