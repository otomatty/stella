// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isSameDay } from "../src/q03-12-is-same-day";
test("問12 isSameDay", () => {
  expect(isSameDay(new Date(2026, 3, 1, 9), new Date(2026, 3, 1, 23))).toBe(true);
  expect(isSameDay(new Date(2026, 3, 1), new Date(2026, 4, 1))).toBe(false);
  expect(isSameDay(new Date(2026, 3, 1), new Date(2027, 3, 1))).toBe(false);
  expectTypeOf(isSameDay).parameters.toEqualTypeOf<[Date, Date]>();
  expectTypeOf(isSameDay).returns.toEqualTypeOf<boolean>();
});
