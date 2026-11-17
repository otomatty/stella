// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isWeekend } from "../src/q03-05-is-weekend";
test("問5 isWeekend", () => {
  expect(isWeekend(new Date(2026, 3, 4))).toBe(true);
  expect(isWeekend(new Date(2026, 3, 5))).toBe(true);
  expect(isWeekend(new Date(2026, 3, 6))).toBe(false);
  expectTypeOf(isWeekend).parameters.toEqualTypeOf<[Date]>();
  expectTypeOf(isWeekend).returns.toEqualTypeOf<boolean>();
});
