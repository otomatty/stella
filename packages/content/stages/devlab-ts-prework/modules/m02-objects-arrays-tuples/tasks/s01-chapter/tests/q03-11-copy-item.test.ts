// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { copyItem, type Item } from "../src/q03-11-copy-item";
test("問11 copyItem", () => {
  const item: Item = { id: 1, name: "りんご", price: 150, stock: 12 };
  const copied = copyItem(item);
  expect(copied).toEqual(item);
  expect(copied).not.toBe(item);
  expectTypeOf(copyItem).parameters.toEqualTypeOf<[Item]>();
  expectTypeOf(copyItem).returns.toEqualTypeOf<Item>();
});
