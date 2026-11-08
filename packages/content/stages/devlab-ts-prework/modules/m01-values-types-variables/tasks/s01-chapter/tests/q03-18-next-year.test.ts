// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { nextYear } from "../src/q03-18-next-year";
test("問18 nextYear", () => {
  expect(nextYear(2026)).toBe(2027);
  expectTypeOf(nextYear).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(nextYear).returns.toEqualTypeOf<number>();
});
