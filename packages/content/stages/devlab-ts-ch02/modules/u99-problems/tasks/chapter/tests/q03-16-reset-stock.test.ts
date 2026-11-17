// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { resetStock, type Item } from "../src/q03-16-reset-stock";
test("問16 resetStock", () => {
  const item: Item = { id: 1, name: "りんご", price: 150, stock: 12 };
  expect(resetStock(item).stock).toBe(0);
  expect(item.stock).toBe(12);
  expectTypeOf(resetStock).parameters.toEqualTypeOf<[Item]>();
  expectTypeOf(resetStock).returns.toEqualTypeOf<Item>();
});
