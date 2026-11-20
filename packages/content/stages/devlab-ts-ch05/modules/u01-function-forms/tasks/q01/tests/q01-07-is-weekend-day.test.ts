// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isWeekendDay } from "../src/q01-07-is-weekend-day";
test("問7 isWeekendDay", () => {
  expect(isWeekendDay(6)).toBe(true);
  expect(isWeekendDay(3)).toBe(false);
  expectTypeOf(isWeekendDay).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isWeekendDay).returns.toEqualTypeOf<boolean>();
});
