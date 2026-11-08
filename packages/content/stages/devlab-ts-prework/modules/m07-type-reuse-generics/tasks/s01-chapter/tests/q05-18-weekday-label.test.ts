// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { weekdayLabel, WEEKDAY_LABELS, type Weekday } from "../src/q05-18-weekday-label";
test("問18 weekdayLabel", () => {
  expect(weekdayLabel("wed")).toBe("水");
  expectTypeOf(WEEKDAY_LABELS).toEqualTypeOf<Record<Weekday, string>>();
  expectTypeOf(weekdayLabel).parameters.toEqualTypeOf<[Weekday]>();
  expectTypeOf(weekdayLabel).returns.toEqualTypeOf<string>();
});
