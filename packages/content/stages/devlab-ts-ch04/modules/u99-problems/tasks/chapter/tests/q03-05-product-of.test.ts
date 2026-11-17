// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { productOf } from "../src/q03-05-product-of";
test("問5 productOf", () => {
  expect(productOf([2, 3, 4])).toBe(24);
  expect(productOf([])).toBe(1);
  expectTypeOf(productOf).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(productOf).returns.toEqualTypeOf<number>();
});
