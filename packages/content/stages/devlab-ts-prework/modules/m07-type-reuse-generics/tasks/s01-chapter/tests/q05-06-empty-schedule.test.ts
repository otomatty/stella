// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { emptySchedule, type Weekday } from "../src/q05-06-empty-schedule";
test("問6 emptySchedule", () => {
  expect(emptySchedule()).toEqual({ mon: [], tue: [], wed: [], thu: [], fri: [] });
  expectTypeOf(emptySchedule).parameters.toEqualTypeOf<[]>();
  expectTypeOf(emptySchedule).returns.toEqualTypeOf<Record<Weekday, string[]>>();
});
