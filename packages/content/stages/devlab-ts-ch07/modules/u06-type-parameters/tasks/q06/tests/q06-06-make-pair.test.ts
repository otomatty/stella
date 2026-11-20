// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makePair } from "../src/q06-06-make-pair";
test("問6 makePair", () => {
  const nums: number[] = [1];
  const text = nums.join("");
  expect(makePair("a", 1)).toEqual(["a", 1]);
  expectTypeOf(makePair(text, nums.length)).toEqualTypeOf<[string, number]>();
});
