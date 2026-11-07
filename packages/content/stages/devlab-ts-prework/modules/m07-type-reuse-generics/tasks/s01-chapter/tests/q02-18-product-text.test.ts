// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { productText, type Product } from "../src/q02-18-product-text";
test("問18 productText", () => {
  const product: Product = { code: "A1", price: 150, stock: 3 };
  expect(productText(product, ["code", "price"])).toBe("code=A1, price=150");
  expectTypeOf(productText).parameters.toEqualTypeOf<
    [Product, readonly ("code" | "price" | "stock")[]]
  >();
  expectTypeOf(productText).returns.toEqualTypeOf<string>();
});
