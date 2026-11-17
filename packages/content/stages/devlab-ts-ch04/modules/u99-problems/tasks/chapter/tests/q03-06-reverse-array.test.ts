// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { reverseArray } from "../src/q03-06-reverse-array";
test("問6 reverseArray", () => {
  expect(reverseArray(["a", "b", "c"])).toEqual(["c", "b", "a"]);
  expect(reverseArray([])).toEqual([]);
  expectTypeOf(reverseArray).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(reverseArray).returns.toEqualTypeOf<string[]>();
});
