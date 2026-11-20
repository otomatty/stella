// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { longer } from "../src/q07-03-longer";
test("問3 longer", () => {
  const nums: number[] = [1, 2];
  expect(longer(nums, [3])).toEqual([1, 2]);
  expect(longer("ab", "cde")).toBe("cde");
  expectTypeOf(longer(nums, nums)).toEqualTypeOf<number[]>();
});
