// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { splitBy } from "../src/q08-03-split-by";
test("問3 splitBy", () => {
  const nums: number[] = [1, 2, 3];
  expect(splitBy(nums, (n) => n > 1)).toEqual([[2, 3], [1]]);
  expectTypeOf(splitBy(nums, (n) => n > 1)).toEqualTypeOf<[number[], number[]]>();
});
