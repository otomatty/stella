// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { priceLabel } from "../src/q05-07-price-label";
test("問7 priceLabel", () => {
  expect(priceLabel(1200)).toBe("1,200円");
  expectTypeOf(priceLabel).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(priceLabel).returns.toEqualTypeOf<string>();
});
