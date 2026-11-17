// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { totalPrice, type Product, type Service } from "../src/q07-12-total-price";
test("問12 totalPrice", () => {
  const product: Product = { name: "りんご", price: 150, stock: 10 };
  const service: Service = { name: "相談", price: 3000, hours: 1 };
  expect(totalPrice([product, service])).toBe(3150);
  expect(totalPrice([])).toBe(0);
  expectTypeOf(totalPrice).parameters.toEqualTypeOf<[readonly { price: number }[]]>();
  expectTypeOf(totalPrice).returns.toEqualTypeOf<number>();
});
