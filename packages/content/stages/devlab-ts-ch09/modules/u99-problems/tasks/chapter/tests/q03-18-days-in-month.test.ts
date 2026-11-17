// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { daysInMonth } from "../src/q03-18-days-in-month";
test("問18 daysInMonth", () => {
  expect(daysInMonth(2028, 2)).toBe(29);
  expect(daysInMonth(2026, 2)).toBe(28);
  expect(daysInMonth(2026, 4)).toBe(30);
  expect(daysInMonth(2026, 12)).toBe(31);
  expectTypeOf(daysInMonth).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(daysInMonth).returns.toEqualTypeOf<number>();
});
