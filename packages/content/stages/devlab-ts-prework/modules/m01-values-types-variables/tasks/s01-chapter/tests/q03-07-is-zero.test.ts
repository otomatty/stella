// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isZero } from "../src/q03-07-is-zero";
test("問7 isZero", () => {
  expect(isZero(0)).toBe(true);
  expect(isZero(3)).toBe(false);
  expectTypeOf(isZero).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isZero).returns.toEqualTypeOf<boolean>();
});
