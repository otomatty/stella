// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { halfIfEven } from "../src/q03-12-half-if-even";
test("問12 halfIfEven", () => {
  expect(halfIfEven(8)).toBe(4);
  expect(halfIfEven(7)).toBeUndefined();
  expectTypeOf(halfIfEven).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(halfIfEven).returns.toEqualTypeOf<number | undefined>();
});
