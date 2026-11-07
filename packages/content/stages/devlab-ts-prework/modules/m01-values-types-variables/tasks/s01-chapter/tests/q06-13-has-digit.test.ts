// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { hasDigit } from "../src/q06-13-has-digit";
test("問13 hasDigit", () => {
  expect(hasDigit("abc1")).toBe(true);
  expect(hasDigit("abc")).toBe(false);
  expectTypeOf(hasDigit).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(hasDigit).returns.toEqualTypeOf<boolean>();
});
