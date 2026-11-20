// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { zipWith } from "../src/q08-07-zip-with";
test("問7 zipWith", () => {
  const nums: number[] = [1, 2, 3];
  const words: string[] = ["a", "b"];
  expect(zipWith(nums, words, (n, s) => `${s}${n}`)).toEqual(["a1", "b2"]);
  expectTypeOf(zipWith(nums, words, (n, s) => s.length > n)).toEqualTypeOf<boolean[]>();
});
