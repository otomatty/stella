// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { totalScore, type Student } from "../src/q10-16-total-score";
test("問16 totalScore", () => {
  expect(
    totalScore([
      { name: "山田", grade: 1, score: 80 },
      { name: "佐藤", grade: 2, score: 95 },
    ]),
  ).toBe(175);
  expect(totalScore([])).toBe(0);
  expectTypeOf(totalScore).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(totalScore).returns.toEqualTypeOf<number>();
});
