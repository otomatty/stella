// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { zipSum } from "../src/q03-16-zip-sum";
test("問16 zipSum", () => {
  expect(zipSum([1, 2, 3], [10, 20])).toEqual([11, 22]);
  expect(zipSum([], [1])).toEqual([]);
  expectTypeOf(zipSum).parameters.toEqualTypeOf<[readonly number[], readonly number[]]>();
  expectTypeOf(zipSum).returns.toEqualTypeOf<number[]>();
});
