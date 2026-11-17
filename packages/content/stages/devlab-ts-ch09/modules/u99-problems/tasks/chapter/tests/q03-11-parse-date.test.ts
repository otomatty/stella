// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseDate } from "../src/q03-11-parse-date";
test("問11 parseDate", () => {
  expect(parseDate("2026-04-01")).toEqual(new Date(2026, 3, 1));
  expect(parseDate("2026-12-31")).toEqual(new Date(2026, 11, 31));
  expect(() => parseDate("2026/04/01")).toThrow(Error);
  expectTypeOf(parseDate).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseDate).returns.toEqualTypeOf<Date>();
});
