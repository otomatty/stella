// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { reversedCopy } from "../src/q06-10-reversed-copy";
test("問10 reversedCopy", () => {
  const nums: number[] = [1, 2, 3];
  expect(reversedCopy(nums)).toEqual([3, 2, 1]);
  expect(nums).toEqual([1, 2, 3]);
  expectTypeOf(reversedCopy(nums)).toEqualTypeOf<number[]>();
});
