// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { addDays } from "../src/q03-06-add-days";
test("問6 addDays", () => {
  const date = new Date(2026, 3, 30, 9);
  expect(addDays(date, 1)).toEqual(new Date(2026, 4, 1, 9));
  expect(addDays(date, -30)).toEqual(new Date(2026, 2, 31, 9));
  expect(date).toEqual(new Date(2026, 3, 30, 9));
  expectTypeOf(addDays).parameters.toEqualTypeOf<[Date, number]>();
  expectTypeOf(addDays).returns.toEqualTypeOf<Date>();
});
