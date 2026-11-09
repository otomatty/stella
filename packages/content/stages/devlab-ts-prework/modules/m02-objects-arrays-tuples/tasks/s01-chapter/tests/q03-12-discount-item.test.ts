// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { discountItem, type Item } from "../src/q03-12-discount-item";
test("問12 discountItem", () => {
  const item: Item = { id: 1, name: "りんご", price: 150, stock: 12 };
  expect(discountItem(item, 10).price).toBe(135);
  expect(discountItem(item, 15).price).toBe(127);
  expect(item.price).toBe(150);
  expectTypeOf(discountItem).parameters.toEqualTypeOf<[Item, number]>();
  expectTypeOf(discountItem).returns.toEqualTypeOf<Item>();
});
