// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { withTax } from "../src/q05-06-with-tax";
test("問6 withTax", () => {
  expect(withTax(100)).toBe(110);
  expect(withTax(980)).toBe(1078);
  expectTypeOf(withTax).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(withTax).returns.toEqualTypeOf<number>();
});
