// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { withIndex } from "../src/q06-20-with-index";
test("問20 withIndex", () => {
  expect(withIndex(["a", "b"])).toEqual([
    [0, "a"],
    [1, "b"],
  ]);
  expectTypeOf(withIndex).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(withIndex).returns.toEqualTypeOf<[number, string][]>();
});
