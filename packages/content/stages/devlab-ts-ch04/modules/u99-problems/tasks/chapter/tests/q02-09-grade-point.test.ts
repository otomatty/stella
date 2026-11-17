// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { gradePoint } from "../src/q02-09-grade-point";
test("問9 gradePoint", () => {
  expect(gradePoint("A")).toBe(4);
  expect(gradePoint("B")).toBe(3);
  expect(gradePoint("F")).toBe(0);
  expectTypeOf(gradePoint).parameters.toEqualTypeOf<["A" | "B" | "C" | "D" | "F"]>();
  expectTypeOf(gradePoint).returns.toEqualTypeOf<number>();
});
