// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { withTax, type Item } from "../src/q03-20-with-tax";
test("問20 withTax", () => {
  const item: Item = { id: 1, name: "りんご", price: 150, stock: 12 };
  expect(withTax(item).price).toBe(165);
  expect(item.price).toBe(150);
  expectTypeOf(withTax).parameters.toEqualTypeOf<[Item]>();
  expectTypeOf(withTax).returns.toEqualTypeOf<Item>();
});
