// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { priceText, type Price } from "../src/q01-11-price-text";
test("問11 priceText", () => {
  expectTypeOf<Price>().toEqualTypeOf<number | "非売品">();
  expect(priceText(1200)).toBe("1,200円");
  expect(priceText("非売品")).toBe("非売品");
  expectTypeOf(priceText).parameters.toEqualTypeOf<[Price]>();
  expectTypeOf(priceText).returns.toEqualTypeOf<string>();
});
