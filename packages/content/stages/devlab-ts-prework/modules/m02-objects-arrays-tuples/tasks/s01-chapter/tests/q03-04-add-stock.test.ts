// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { addStock, type Item } from "../src/q03-04-add-stock";
test("問4 addStock", () => {
  const item: Item = { id: 1, name: "りんご", price: 150, stock: 12 };
  expect(addStock(item, 8).stock).toBe(20);
  expect(item.stock).toBe(12);
  expectTypeOf(addStock).parameters.toEqualTypeOf<[Item, number]>();
  expectTypeOf(addStock).returns.toEqualTypeOf<Item>();
});
