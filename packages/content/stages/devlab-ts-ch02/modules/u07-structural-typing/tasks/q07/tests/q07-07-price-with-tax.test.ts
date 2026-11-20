// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { priceWithTax, type Product, type Service } from "../src/q07-07-price-with-tax";
test("問7 priceWithTax", () => {
  const product: Product = { name: "りんご", price: 150, stock: 10 };
  const service: Service = { name: "相談", price: 3000, hours: 1 };
  expect(priceWithTax(product)).toBe(165);
  expect(priceWithTax(service)).toBe(3300);
  expectTypeOf(priceWithTax).parameters.toEqualTypeOf<[{ price: number }]>();
  expectTypeOf(priceWithTax).returns.toEqualTypeOf<number>();
});
