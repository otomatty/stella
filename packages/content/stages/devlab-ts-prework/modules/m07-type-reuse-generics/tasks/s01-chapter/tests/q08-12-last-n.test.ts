// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { lastN } from "../src/q08-12-last-n";
test("問12 lastN", () => {
  const nums: number[] = [1, 2, 3];
  expect(lastN(nums, 2)).toEqual([2, 3]);
  expect(lastN(nums, 0)).toEqual([]);
  expect(lastN(nums, 5)).toEqual([1, 2, 3]);
  expectTypeOf(lastN(nums, 1)).toEqualTypeOf<number[]>();
});
