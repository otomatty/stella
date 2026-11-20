// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { daysBetween } from "../src/q03-14-days-between";
test("問14 daysBetween", () => {
  expect(daysBetween(new Date(2026, 3, 1, 23), new Date(2026, 3, 2, 1))).toBe(1);
  expect(daysBetween(new Date(2026, 3, 1), new Date(2026, 4, 1))).toBe(30);
  expect(daysBetween(new Date(2026, 3, 10), new Date(2026, 3, 1))).toBe(-9);
  expectTypeOf(daysBetween).parameters.toEqualTypeOf<[Date, Date]>();
  expectTypeOf(daysBetween).returns.toEqualTypeOf<number>();
});
