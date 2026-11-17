// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { longestOf } from "../src/q05-14-longest-of";
test("問14 longestOf", () => {
  expect(longestOf("a", "abc", "ab")).toBe("abc");
  expect(longestOf()).toBe("");
  expectTypeOf(longestOf).parameters.toEqualTypeOf<string[]>();
  expectTypeOf(longestOf).returns.toEqualTypeOf<string>();
});
