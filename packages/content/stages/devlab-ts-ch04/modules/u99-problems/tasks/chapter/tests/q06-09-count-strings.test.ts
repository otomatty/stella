// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countStrings } from "../src/q06-09-count-strings";
test("問9 countStrings", () => {
  expect(countStrings(["a", 1, "b", null])).toBe(2);
  expect(countStrings([])).toBe(0);
  expectTypeOf(countStrings).parameters.toEqualTypeOf<[readonly unknown[]]>();
  expectTypeOf(countStrings).returns.toEqualTypeOf<number>();
});
