// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { mergeArrays } from "../src/q05-18-merge-arrays";
test("問18 mergeArrays", () => {
  expect(mergeArrays([1, 2], [3], [])).toEqual([1, 2, 3]);
  expect(mergeArrays()).toEqual([]);
  expectTypeOf(mergeArrays).parameters.toEqualTypeOf<(readonly number[])[]>();
  expectTypeOf(mergeArrays).returns.toEqualTypeOf<number[]>();
});
