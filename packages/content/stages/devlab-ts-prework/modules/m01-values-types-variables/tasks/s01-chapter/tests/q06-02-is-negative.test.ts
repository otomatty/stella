// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isNegative } from "../src/q06-02-is-negative";
test("問2 isNegative", () => {
  expect(isNegative(-1)).toBe(true);
  expect(isNegative(0)).toBe(false);
  expectTypeOf(isNegative).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isNegative).returns.toEqualTypeOf<boolean>();
});
