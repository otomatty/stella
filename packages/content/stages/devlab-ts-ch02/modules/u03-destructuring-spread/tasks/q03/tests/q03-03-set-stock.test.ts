// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { setStock, type Item } from "../src/q03-03-set-stock";
test("問3 setStock", () => {
  const item: Item = { id: 1, name: "りんご", price: 150, stock: 12 };
  expect(setStock(item, 0)).toEqual({ id: 1, name: "りんご", price: 150, stock: 0 });
  expect(item.stock).toBe(12);
  expectTypeOf(setStock).parameters.toEqualTypeOf<[Item, number]>();
  expectTypeOf(setStock).returns.toEqualTypeOf<Item>();
});
