// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { stockValue, type Item } from "../src/q03-15-stock-value";
test("問15 stockValue", () => {
  expect(stockValue({ id: 1, name: "りんご", price: 150, stock: 12 })).toBe(1800);
  expectTypeOf(stockValue).parameters.toEqualTypeOf<[Item]>();
  expectTypeOf(stockValue).returns.toEqualTypeOf<number>();
});
