// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sortDates } from "../src/q03-20-sort-dates";
test("問20 sortDates", () => {
  const dates = [new Date(2026, 3, 3), new Date(2026, 3, 1), new Date(2026, 3, 2)];
  expect(sortDates(dates).map((d) => d.getDate())).toEqual([1, 2, 3]);
  expect(dates.map((d) => d.getDate())).toEqual([3, 1, 2]);
  expectTypeOf(sortDates).parameters.toEqualTypeOf<[Date[]]>();
  expectTypeOf(sortDates).returns.toEqualTypeOf<Date[]>();
});
