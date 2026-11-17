// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sortDesc } from "../src/q05-09-sort-desc";
test("問9 sortDesc", () => {
  const numbers = [3, 1, 10, 2];
  expect(sortDesc(numbers)).toEqual([10, 3, 2, 1]);
  expect(numbers).toEqual([3, 1, 10, 2]);
  expectTypeOf(sortDesc).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(sortDesc).returns.toEqualTypeOf<number[]>();
});
