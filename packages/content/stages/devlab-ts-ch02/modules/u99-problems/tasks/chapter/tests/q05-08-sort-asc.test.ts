// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sortAsc } from "../src/q05-08-sort-asc";
test("問8 sortAsc", () => {
  const numbers = [3, 1, 10, 2];
  expect(sortAsc(numbers)).toEqual([1, 2, 3, 10]);
  expect(numbers).toEqual([3, 1, 10, 2]);
  expectTypeOf(sortAsc).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(sortAsc).returns.toEqualTypeOf<number[]>();
});
