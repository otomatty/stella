// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { discountRate } from "../src/q01-09-discount-rate";
test("問9 discountRate", () => {
  expect(discountRate(10000)).toBe(0.1);
  expect(discountRate(6000)).toBe(0.05);
  expect(discountRate(4999)).toBe(0);
  expectTypeOf(discountRate).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(discountRate).returns.toEqualTypeOf<number>();
});
