// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { safeRepeat } from "../src/q05-08-safe-repeat";
test("問8 safeRepeat", () => {
  expect(safeRepeat("ab", 2)).toBe("abab");
  expect(safeRepeat("ab", -1)).toBe("");
  expectTypeOf(safeRepeat).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(safeRepeat).returns.toEqualTypeOf<string>();
});
