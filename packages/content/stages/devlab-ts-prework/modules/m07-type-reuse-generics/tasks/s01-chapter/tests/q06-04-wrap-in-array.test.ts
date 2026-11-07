// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { wrapInArray } from "../src/q06-04-wrap-in-array";
test("問4 wrapInArray", () => {
  const nums: number[] = [7];
  expect(wrapInArray("a")).toEqual(["a"]);
  expectTypeOf(wrapInArray(nums.length)).toEqualTypeOf<number[]>();
  expectTypeOf(wrapInArray(nums)).toEqualTypeOf<number[][]>();
});
