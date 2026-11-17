// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { setPrice, type Item } from "../src/q03-02-set-price";
test("問2 setPrice", () => {
  const item: Item = { id: 1, name: "りんご", price: 150, stock: 12 };
  expect(setPrice(item, 120)).toEqual({ id: 1, name: "りんご", price: 120, stock: 12 });
  expect(item.price).toBe(150);
  expectTypeOf(setPrice).parameters.toEqualTypeOf<[Item, number]>();
  expectTypeOf(setPrice).returns.toEqualTypeOf<Item>();
});
