// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isPositiveNumber } from "../src/q01-16-is-positive-number";
test("問16 isPositiveNumber", () => {
  expect(isPositiveNumber(1)).toBe(true);
  expect(isPositiveNumber(-1)).toBe(false);
  expectTypeOf(isPositiveNumber).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isPositiveNumber).returns.toEqualTypeOf<boolean>();
});
