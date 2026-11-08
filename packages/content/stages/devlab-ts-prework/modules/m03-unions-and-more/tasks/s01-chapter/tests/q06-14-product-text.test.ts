// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { productText, type Product, type Named, type Priced, type Identified } from "../src/q06-14-product-text";
test("問14 productText", () => {
  expectTypeOf<Product>().toEqualTypeOf<Named & Priced & Identified>();
  expect(productText({ id: 1, name: "りんご", price: 150 })).toBe("#1 りんご 150円");
  expectTypeOf(productText).parameters.toEqualTypeOf<[Product]>();
  expectTypeOf(productText).returns.toEqualTypeOf<string>();
});
