// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { zip } from "../src/q06-19-zip";
test("問19 zip", () => {
  const nums: number[] = [1, 2];
  const words: string[] = ["a", "b", "c"];
  expect(zip(nums, words)).toEqual([
    [1, "a"],
    [2, "b"],
  ]);
  expectTypeOf(zip(nums, words)).toEqualTypeOf<[number, string][]>();
});
