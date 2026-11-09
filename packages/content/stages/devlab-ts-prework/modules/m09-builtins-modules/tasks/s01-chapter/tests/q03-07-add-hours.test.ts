// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { addHours } from "../src/q03-07-add-hours";
test("問7 addHours", () => {
  const date = new Date(2026, 3, 1, 22);
  expect(addHours(date, 3)).toEqual(new Date(2026, 3, 2, 1));
  expect(date.getHours()).toBe(22);
  expectTypeOf(addHours).parameters.toEqualTypeOf<[Date, number]>();
  expectTypeOf(addHours).returns.toEqualTypeOf<Date>();
});
