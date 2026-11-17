// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { discountPrice } from "../src/q02-11-discount-price";
test("問11 discountPrice", () => {
  expect(discountPrice(1000, 15)).toBe(850);
  expect(discountPrice(999, 10)).toBe(899);
  expectTypeOf(discountPrice).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(discountPrice).returns.toEqualTypeOf<number>();
});
