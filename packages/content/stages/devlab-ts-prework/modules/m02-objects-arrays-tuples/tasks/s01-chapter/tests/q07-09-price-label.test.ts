// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { priceLabel, type Product, type Service } from "../src/q07-09-price-label";
test("問9 priceLabel", () => {
  const product: Product = { name: "りんご", price: 150, stock: 10 };
  const service: Service = { name: "相談", price: 3000, hours: 1 };
  expect(priceLabel(product)).toBe("りんご: 150円");
  expect(priceLabel(service)).toBe("相談: 3000円");
  expectTypeOf(priceLabel).parameters.toEqualTypeOf<[{ name: string; price: number }]>();
  expectTypeOf(priceLabel).returns.toEqualTypeOf<string>();
});
