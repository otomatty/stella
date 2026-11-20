// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { productField, type Product } from "../src/q02-08-product-field";
test("問8 productField", () => {
  const product: Product = { code: "A1", price: 150, stock: 3 };
  expect(productField(product, "price")).toBe(150);
  expect(productField(product, "code")).toBe("A1");
  expectTypeOf(productField).parameters.toEqualTypeOf<[Product, "code" | "price" | "stock"]>();
  expectTypeOf(productField).returns.toEqualTypeOf<string | number>();
});
