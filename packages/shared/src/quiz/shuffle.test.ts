import { describe, expect, it, vi } from "vitest";

import type { LearnerQuizQuestion } from "../cms/types.js";
import { shuffleLearnerQuizQuestions, shuffled } from "./shuffle.js";

const sampleQuestions: LearnerQuizQuestion[] = [
  {
    id: "q1",
    kind: "single",
    prompt: "Q1",
    points: 1,
    order: 0,
    options: [
      { id: "q1-a", label: "A", order: 0 },
      { id: "q1-b", label: "B", order: 1 },
    ],
  },
  {
    id: "q2",
    kind: "single",
    prompt: "Q2",
    points: 1,
    order: 1,
    options: [
      { id: "q2-a", label: "A", order: 0 },
      { id: "q2-b", label: "B", order: 1 },
      { id: "q2-c", label: "C", order: 2 },
    ],
  },
];

describe("shuffled", () => {
  it("元配列を変更しない", () => {
    const input = [1, 2, 3];
    shuffled(input);
    expect(input).toEqual([1, 2, 3]);
  });

  it("要素の集合を保つ", () => {
    const input = [1, 2, 3, 4];
    expect(shuffled(input).sort()).toEqual(input);
  });
});

describe("shuffleLearnerQuizQuestions", () => {
  it("設問 ID と選択肢 ID をすべて保持する", () => {
    const result = shuffleLearnerQuizQuestions(sampleQuestions);
    expect(result.map((q) => q.id).sort()).toEqual(["q1", "q2"]);
    for (const q of result) {
      const original = sampleQuestions.find((s) => s.id === q.id);
      expect(original).toBeDefined();
      expect(q.options.map((o) => o.id).sort()).toEqual(original?.options.map((o) => o.id).sort());
    }
  });

  it("Math.random を固定すると既知の順序にシャッフルされる", () => {
    const random = [0.1, 0.2, 0.1, 0.1];
    let i = 0;
    const spy = vi.spyOn(Math, "random").mockImplementation(() => random[i++] ?? 0);

    const first = shuffleLearnerQuizQuestions(sampleQuestions);
    i = 0;
    const second = shuffleLearnerQuizQuestions(sampleQuestions);

    expect(first.map((q) => q.id)).toEqual(["q2", "q1"]);
    expect(first[0]?.options.map((o) => o.id)).toEqual(["q2-b", "q2-c", "q2-a"]);
    expect(first[1]?.options.map((o) => o.id)).toEqual(["q1-b", "q1-a"]);

    expect(first.map((q) => q.id)).toEqual(second.map((q) => q.id));
    expect(first.map((q) => q.options.map((o) => o.id))).toEqual(
      second.map((q) => q.options.map((o) => o.id)),
    );

    spy.mockRestore();
  });
});
