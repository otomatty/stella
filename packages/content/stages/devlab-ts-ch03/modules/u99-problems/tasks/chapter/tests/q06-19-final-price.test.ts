// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { finalPrice, type Discounted, type Priced } from "../src/q06-19-final-price";
test("問19 finalPrice", () => {
  expectTypeOf<Discounted>().toEqualTypeOf<Priced & { discount: number }>();
  expect(finalPrice({ price: 1000, discount: 200 })).toBe(800);
  expect(finalPrice({ price: 100, discount: 200 })).toBe(0);
  expectTypeOf(finalPrice).parameters.toEqualTypeOf<[Discounted]>();
  expectTypeOf(finalPrice).returns.toEqualTypeOf<number>();
});
