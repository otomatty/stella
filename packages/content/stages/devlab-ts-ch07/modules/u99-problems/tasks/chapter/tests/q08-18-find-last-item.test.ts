// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { findLastItem } from "../src/q08-18-find-last-item";
test("問18 findLastItem", () => {
  const nums: number[] = [1, 4, 6, 7];
  expect(findLastItem(nums, (n) => n % 2 === 0)).toBe(6);
  expect(findLastItem(nums, (n) => n > 10)).toBeUndefined();
  expectTypeOf(findLastItem(nums, (n) => n > 0)).toEqualTypeOf<number | undefined>();
});
