import { expect, it } from "vitest";
import { taskProblemCountLabel } from "./task-row";
it("問題の件数に引き継ぎを添える。0と問題なしは添えない", () => {
  expect(
    taskProblemCountLabel({ problems_total: 168, problems_passed: 168, problems_manual: 168 }),
  ).toBe("168/168 問（うち引き継ぎ 168 問）");
  expect(
    taskProblemCountLabel({ problems_total: 168, problems_passed: 10, problems_manual: 4 }),
  ).toBe("10/168 問（うち引き継ぎ 4 問）");
  expect(taskProblemCountLabel({ problems_total: 1, problems_passed: 0, problems_manual: 0 })).toBe(
    "0/1 問",
  );
  expect(taskProblemCountLabel({})).toBeNull();
});
