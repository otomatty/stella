// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { priceText } from "../src/q08-09-price-text";
test("問9 priceText", () => {
  expect(priceText(1200)).toBe("1,200円");
  expectTypeOf(priceText).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(priceText).returns.toEqualTypeOf<string>();
});
