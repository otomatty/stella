// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { priceLabel } from "../src/q03-08-price-label";
test("問8 priceLabel", () => {
  expect(priceLabel(1200)).toBe("1,200円");
  expect(priceLabel(1200, "ドル")).toBe("1,200ドル");
  expectTypeOf(priceLabel).parameters.toEqualTypeOf<[number, string?]>();
  expectTypeOf(priceLabel).returns.toEqualTypeOf<string>();
});
