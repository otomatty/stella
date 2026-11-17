// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeDate } from "../src/q03-01-make-date";
test("問1 makeDate", () => {
  const date = makeDate(2026, 4, 1);
  expect(date.getFullYear()).toBe(2026);
  expect(date.getMonth()).toBe(3);
  expect(date.getDate()).toBe(1);
  expect(date.getHours()).toBe(0);
  expectTypeOf(makeDate).parameters.toEqualTypeOf<[number, number, number]>();
  expectTypeOf(makeDate).returns.toEqualTypeOf<Date>();
});
