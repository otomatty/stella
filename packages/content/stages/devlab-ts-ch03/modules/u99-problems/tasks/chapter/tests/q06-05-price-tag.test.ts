// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { priceTag, type Named, type Priced } from "../src/q06-05-price-tag";
test("問5 priceTag", () => {
  expect(priceTag({ name: "りんご", price: 150 })).toBe("りんご 150円");
  expectTypeOf(priceTag).parameters.toEqualTypeOf<[Named & Priced]>();
  expectTypeOf(priceTag).returns.toEqualTypeOf<string>();
});
