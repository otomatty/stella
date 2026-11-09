// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { yearOf } from "../src/q03-02-year-of";
test("問2 yearOf", () => {
  expect(yearOf(new Date(2026, 3, 1))).toBe(2026);
  expectTypeOf(yearOf).parameters.toEqualTypeOf<[Date]>();
  expectTypeOf(yearOf).returns.toEqualTypeOf<number>();
});
