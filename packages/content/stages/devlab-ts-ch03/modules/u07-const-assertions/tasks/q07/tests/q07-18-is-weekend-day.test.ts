// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { WEEKEND, isWeekendDay } from "../src/q07-18-is-weekend-day";
test("問18 isWeekendDay", () => {
  expectTypeOf<typeof WEEKEND>().toEqualTypeOf<readonly ["土", "日"]>();
  expect(isWeekendDay("日")).toBe(true);
  expect(isWeekendDay("月")).toBe(false);
  expectTypeOf(isWeekendDay).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isWeekendDay).returns.toEqualTypeOf<boolean>();
});
