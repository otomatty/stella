// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isNumberValue } from "../src/q01-05-is-number-value";
test("問5 isNumberValue", () => {
  expect(isNumberValue(1)).toBe(true);
  expect(isNumberValue("1")).toBe(false);
  expectTypeOf(isNumberValue).parameters.toEqualTypeOf<[string | number]>();
  expectTypeOf(isNumberValue).returns.toEqualTypeOf<boolean>();
});
