// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { monthOf } from "../src/q03-03-month-of";
test("問3 monthOf", () => {
  expect(monthOf(new Date(2026, 3, 1))).toBe(4);
  expect(monthOf(new Date(2026, 0, 1))).toBe(1);
  expectTypeOf(monthOf).parameters.toEqualTypeOf<[Date]>();
  expectTypeOf(monthOf).returns.toEqualTypeOf<number>();
});
