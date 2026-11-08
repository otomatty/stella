// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isStringArray } from "../src/q09-04-is-string-array";
test("問4 isStringArray", () => {
  expect(isStringArray(["a", "b"])).toBe(true);
  expect(isStringArray(["a", 1])).toBe(false);
  expect(isStringArray("ab")).toBe(false);
  expectTypeOf(isStringArray).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isStringArray).guards.toEqualTypeOf<string[]>();
});
