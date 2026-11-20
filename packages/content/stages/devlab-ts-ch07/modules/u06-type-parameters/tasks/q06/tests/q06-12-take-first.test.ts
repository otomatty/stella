// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { takeFirst } from "../src/q06-12-take-first";
test("問12 takeFirst", () => {
  const nums: number[] = [1, 2, 3];
  expect(takeFirst(nums, 2)).toEqual([1, 2]);
  expectTypeOf(takeFirst(nums, 2)).toEqualTypeOf<number[]>();
});
