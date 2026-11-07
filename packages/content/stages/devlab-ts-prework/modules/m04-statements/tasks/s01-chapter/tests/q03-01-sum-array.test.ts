// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sumArray } from "../src/q03-01-sum-array";
test("問1 sumArray", () => {
  expect(sumArray([1, 2, 3])).toBe(6);
  expect(sumArray([])).toBe(0);
  expectTypeOf(sumArray).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(sumArray).returns.toEqualTypeOf<number>();
});
