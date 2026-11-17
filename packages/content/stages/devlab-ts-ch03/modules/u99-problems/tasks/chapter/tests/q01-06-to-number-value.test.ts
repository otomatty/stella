// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toNumberValue } from "../src/q01-06-to-number-value";
test("問6 toNumberValue", () => {
  expect(toNumberValue("12")).toBe(12);
  expect(toNumberValue(7)).toBe(7);
  expectTypeOf(toNumberValue).parameters.toEqualTypeOf<[string | number]>();
  expectTypeOf(toNumberValue).returns.toEqualTypeOf<number>();
});
