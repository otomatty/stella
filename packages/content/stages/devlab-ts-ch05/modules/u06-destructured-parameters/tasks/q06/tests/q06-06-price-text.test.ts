// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { priceText } from "../src/q06-06-price-text";
test("問6 priceText", () => {
  expect(priceText({ price: 1200 })).toBe("1,200円");
  expect(priceText({ price: 5, currency: "ドル" })).toBe("5ドル");
  expectTypeOf(priceText).parameters.toEqualTypeOf<[{ price: number; currency?: string }]>();
  expectTypeOf(priceText).returns.toEqualTypeOf<string>();
});
