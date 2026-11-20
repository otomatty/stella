// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstWhere } from "../src/q07-18-first-where";
test("問18 firstWhere", () => {
  const nums: number[] = [1, 4, 6];
  expect(firstWhere(nums, (n) => n % 2 === 0)).toBe(4);
  expectTypeOf(firstWhere(nums, (n) => n > 0)).toEqualTypeOf<number | undefined>();
});
