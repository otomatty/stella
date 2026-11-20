// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { rename, type Item } from "../src/q03-05-rename";
test("問5 rename", () => {
  const item: Item = { id: 1, name: "りんご", price: 150, stock: 12 };
  expect(rename(item, "青りんご")).toEqual({ id: 1, name: "青りんご", price: 150, stock: 12 });
  expect(item.name).toBe("りんご");
  expectTypeOf(rename).parameters.toEqualTypeOf<[Item, string]>();
  expectTypeOf(rename).returns.toEqualTypeOf<Item>();
});
