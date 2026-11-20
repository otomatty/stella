// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isBefore } from "../src/q03-13-is-before";
test("問13 isBefore", () => {
  expect(isBefore(new Date(2026, 3, 1, 9), new Date(2026, 3, 1, 10))).toBe(true);
  expect(isBefore(new Date(2026, 3, 1, 10), new Date(2026, 3, 1, 10))).toBe(false);
  expectTypeOf(isBefore).parameters.toEqualTypeOf<[Date, Date]>();
  expectTypeOf(isBefore).returns.toEqualTypeOf<boolean>();
});
