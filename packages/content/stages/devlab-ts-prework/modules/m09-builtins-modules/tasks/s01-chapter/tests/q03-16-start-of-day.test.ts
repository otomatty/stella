// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { startOfDay } from "../src/q03-16-start-of-day";
test("問16 startOfDay", () => {
  const date = new Date(2026, 3, 1, 15, 30, 10, 500);
  expect(startOfDay(date)).toEqual(new Date(2026, 3, 1));
  expect(date.getHours()).toBe(15);
  expectTypeOf(startOfDay).parameters.toEqualTypeOf<[Date]>();
  expectTypeOf(startOfDay).returns.toEqualTypeOf<Date>();
});
