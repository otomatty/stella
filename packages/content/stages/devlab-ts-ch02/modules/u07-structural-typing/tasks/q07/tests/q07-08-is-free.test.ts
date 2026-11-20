// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isFree, type Service, type Product } from "../src/q07-08-is-free";
test("問8 isFree", () => {
  const service: Service = { name: "無料相談", price: 0, hours: 1 };
  const product: Product = { name: "りんご", price: 150, stock: 10 };
  expect(isFree(service)).toBe(true);
  expect(isFree(product)).toBe(false);
  expectTypeOf(isFree).parameters.toEqualTypeOf<[{ price: number }]>();
  expectTypeOf(isFree).returns.toEqualTypeOf<boolean>();
});
