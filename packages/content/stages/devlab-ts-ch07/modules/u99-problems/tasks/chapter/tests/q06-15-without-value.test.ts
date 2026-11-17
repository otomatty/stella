// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { withoutValue } from "../src/q06-15-without-value";
test("問15 withoutValue", () => {
  const nums: number[] = [1, 2, 1];
  expect(withoutValue(nums, 1)).toEqual([2]);
  expectTypeOf(withoutValue(nums, 1)).toEqualTypeOf<number[]>();
});
