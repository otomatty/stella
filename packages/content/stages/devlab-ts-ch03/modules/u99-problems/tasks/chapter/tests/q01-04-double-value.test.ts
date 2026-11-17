// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { doubleValue } from "../src/q01-04-double-value";
test("問4 doubleValue", () => {
  expect(doubleValue(4)).toBe(8);
  expect(doubleValue("ab")).toBe("abab");
  expectTypeOf(doubleValue).parameters.toEqualTypeOf<[string | number]>();
  expectTypeOf(doubleValue).returns.toEqualTypeOf<string | number>();
});
