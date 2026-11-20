// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { addEvent, type Weekday } from "../src/q05-07-add-event";
test("問7 addEvent", () => {
  const schedule: Record<Weekday, string[]> = { mon: [], tue: [], wed: [], thu: [], fri: [] };
  expect(addEvent(schedule, "mon", "会議").mon).toEqual(["会議"]);
  expect(schedule.mon).toEqual([]);
  expectTypeOf(addEvent).parameters.toEqualTypeOf<[Record<Weekday, string[]>, Weekday, string]>();
  expectTypeOf(addEvent).returns.toEqualTypeOf<Record<Weekday, string[]>>();
});
