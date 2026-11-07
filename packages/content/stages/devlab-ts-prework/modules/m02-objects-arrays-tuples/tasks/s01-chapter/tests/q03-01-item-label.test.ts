// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { itemLabel, type Item } from "../src/q03-01-item-label";
test("問1 itemLabel", () => {
  expect(itemLabel({ id: 1, name: "りんご", price: 150, stock: 12 })).toBe("りんご 150円");
  expectTypeOf(itemLabel).parameters.toEqualTypeOf<[Item]>();
  expectTypeOf(itemLabel).returns.toEqualTypeOf<string>();
});
