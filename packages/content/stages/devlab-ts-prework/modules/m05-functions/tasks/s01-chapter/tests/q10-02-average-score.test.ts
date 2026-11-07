// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { averageScore, type Student } from "../src/q10-02-average-score";
test("問2 averageScore", () => {
  expect(
    averageScore([
      { name: "山田", grade: 1, score: 80 },
      { name: "佐藤", grade: 2, score: 90 },
    ]),
  ).toBe(85);
  expect(averageScore([])).toBe(0);
  expectTypeOf(averageScore).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(averageScore).returns.toEqualTypeOf<number>();
});
