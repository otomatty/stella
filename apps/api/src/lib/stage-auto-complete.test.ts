/**
 * 修了条件の判定式 (`completionMet`) のユニットテスト。
 *
 * この式は手動発行 (`routes/certificates.ts` の completion 集計 2 か所) と自動発行の
 * 3 か所で共有される。DB 集計そのものは core-loop スモーク (添削合格 → 自動発行) が
 * 通しで検証するので、ここでは境界条件だけを固定する。
 */

import { describe, expect, it } from "vitest";

import { completionMet, type CompletionCounts } from "./stage-auto-complete.js";

const ALL_REQUIRED = {
  requireAllLessons: true,
  requireQuizPass: true,
  requireAssignmentPass: true,
};

const counts = (over: Partial<CompletionCounts>): CompletionCounts => ({
  totalLessons: 3,
  completedLessons: 3,
  totalQuizzes: 2,
  passedQuizzes: 2,
  totalAssignments: 1,
  passedAssignments: 1,
  ...over,
});

describe("completionMet", () => {
  it("全条件を満たせば達成", () => {
    expect(completionMet(ALL_REQUIRED, counts({}))).toBe(true);
  });

  it("レッスン 0 件のステージは常に未達 (空ステージが作った瞬間に修了しない)", () => {
    expect(completionMet(ALL_REQUIRED, counts({ totalLessons: 0, completedLessons: 0 }))).toBe(
      false,
    );
  });

  it("必須条件が 1 つでも欠ければ未達", () => {
    expect(completionMet(ALL_REQUIRED, counts({ completedLessons: 2 }))).toBe(false);
    expect(completionMet(ALL_REQUIRED, counts({ passedQuizzes: 1 }))).toBe(false);
    expect(completionMet(ALL_REQUIRED, counts({ passedAssignments: 0 }))).toBe(false);
  });

  it("外した条件は数えない (小テスト・課題が任意のステージ)", () => {
    const lessonsOnly = {
      requireAllLessons: true,
      requireQuizPass: false,
      requireAssignmentPass: false,
    };
    expect(completionMet(lessonsOnly, counts({ passedQuizzes: 0, passedAssignments: 0 }))).toBe(
      true,
    );
  });

  it("小テスト・課題が 0 件なら、その条件は必須でも満たされる", () => {
    expect(
      completionMet(
        ALL_REQUIRED,
        counts({ totalQuizzes: 0, passedQuizzes: 0, totalAssignments: 0, passedAssignments: 0 }),
      ),
    ).toBe(true);
  });
});
