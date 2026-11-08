// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { digitTotal } from "../src/q03-12-digit-total";
test("問12 digitTotal", () => {
  expect(digitTotal("a1b2c3")).toBe(6);
  expect(digitTotal("abc")).toBe(0);
  expectTypeOf(digitTotal).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(digitTotal).returns.toEqualTypeOf<number>();
});
