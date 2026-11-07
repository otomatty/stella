// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isRangeError } from "../src/q05-15-is-range-error";
test("問15 isRangeError", () => {
  expect(isRangeError(new RangeError("x"))).toBe(true);
  expect(isRangeError(new Error("x"))).toBe(false);
  expect(isRangeError("x")).toBe(false);
  expectTypeOf(isRangeError).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isRangeError).returns.toEqualTypeOf<boolean>();
});
