// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { endOfMonth } from "../src/q03-17-end-of-month";
test("問17 endOfMonth", () => {
  expect(endOfMonth(new Date(2026, 3, 15))).toEqual(new Date(2026, 3, 30));
  expect(endOfMonth(new Date(2026, 11, 1))).toEqual(new Date(2026, 11, 31));
  expectTypeOf(endOfMonth).parameters.toEqualTypeOf<[Date]>();
  expectTypeOf(endOfMonth).returns.toEqualTypeOf<Date>();
});
