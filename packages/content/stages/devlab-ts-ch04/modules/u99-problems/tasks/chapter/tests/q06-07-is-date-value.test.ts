// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isDateValue } from "../src/q06-07-is-date-value";
test("問7 isDateValue", () => {
  expect(isDateValue(new Date())).toBe(true);
  expect(isDateValue("2026-12-01")).toBe(false);
  expectTypeOf(isDateValue).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isDateValue).returns.toEqualTypeOf<boolean>();
});
