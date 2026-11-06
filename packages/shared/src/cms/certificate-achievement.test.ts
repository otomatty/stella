import { describe, expect, it } from "vitest";
import { achievementFromSnapshot } from "./certificate-achievement.js";

const snapshot = {
  criteria: {
    require_all_lessons: true,
    require_quiz_pass: false,
    require_assignment_pass: true,
  },
  completed_lessons: 169,
  total_lessons: 169,
  passed_quizzes: 10,
  total_quizzes: 10,
  passed_assignments: 18,
  total_assignments: 18,
};

describe("achievementFromSnapshot", () => {
  it("必須の項目の数だけを返す", () => {
    expect(achievementFromSnapshot(snapshot)).toEqual({
      lessons: { done: 169, total: 169 },
      assignments: { done: 18, total: 18 },
    });
    expect(achievementFromSnapshot({ ...snapshot, criteria: { require_quiz_pass: true } })).toEqual(
      { quizzes: { done: 10, total: 10 } },
    );
  });
  it("total 0 の項目を落とす", () => {
    expect(achievementFromSnapshot({ ...snapshot, total_assignments: 0 })).toEqual({
      lessons: { done: 169, total: 169 },
    });
    expect(
      achievementFromSnapshot({ ...snapshot, total_assignments: 0, total_lessons: 0 }),
    ).toBeNull();
  });
  it.each([
    {},
    null,
    [],
    "broken",
    { criteria: null },
    { criteria: [] },
    { ...snapshot, completed_lessons: "169" },
    { ...snapshot, total_lessons: undefined },
    { ...snapshot, passed_assignments: Number.NaN },
    { ...snapshot, total_lessons: Number.POSITIVE_INFINITY },
    { ...snapshot, total_lessons: -1 },
    { ...snapshot, criteria: { require_all_lessons: "true" } },
  ])("壊れた snapshot は null: %j", (value) => {
    expect(achievementFromSnapshot(value)).toBeNull();
  });
});
