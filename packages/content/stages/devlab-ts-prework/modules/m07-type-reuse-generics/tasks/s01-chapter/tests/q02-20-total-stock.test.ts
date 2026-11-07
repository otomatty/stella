// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { totalStock, type Product } from "../src/q02-20-total-stock";
test("問20 totalStock", () => {
  const products: Product[] = [
    { code: "A1", price: 150, stock: 3 },
    { code: "B2", price: 80, stock: 5 },
  ];
  expect(totalStock(products, "stock")).toBe(8);
  expect(totalStock(products, "price")).toBe(230);
  expectTypeOf(totalStock).parameters.toEqualTypeOf<[readonly Product[], "price" | "stock"]>();
  expectTypeOf(totalStock).returns.toEqualTypeOf<number>();
});
