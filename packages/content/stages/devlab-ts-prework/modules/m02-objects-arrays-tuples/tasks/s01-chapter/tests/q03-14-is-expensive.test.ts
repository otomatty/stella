// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isExpensive, type Item } from "../src/q03-14-is-expensive";
test("問14 isExpensive", () => {
  expect(isExpensive({ id: 1, name: "りんご", price: 150, stock: 12 })).toBe(false);
  expect(isExpensive({ id: 2, name: "メロン", price: 1000, stock: 1 })).toBe(true);
  expectTypeOf(isExpensive).parameters.toEqualTypeOf<[Item]>();
  expectTypeOf(isExpensive).returns.toEqualTypeOf<boolean>();
});
