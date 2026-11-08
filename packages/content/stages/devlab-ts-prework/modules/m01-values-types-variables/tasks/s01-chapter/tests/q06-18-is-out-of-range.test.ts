// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isOutOfRange } from "../src/q06-18-is-out-of-range";
test("問18 isOutOfRange", () => {
  expect(isOutOfRange(11, 1, 10)).toBe(true);
  expect(isOutOfRange(0, 1, 10)).toBe(true);
  expect(isOutOfRange(10, 1, 10)).toBe(false);
  expectTypeOf(isOutOfRange).parameters.toEqualTypeOf<[number, number, number]>();
  expectTypeOf(isOutOfRange).returns.toEqualTypeOf<boolean>();
});
