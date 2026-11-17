// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { orderTotal, type Category } from "../src/q05-17-order-total";
test("問17 orderTotal", () => {
  expect(orderTotal({ food: 300, drink: 150, other: 500 }, { food: 2 })).toBe(600);
  expect(orderTotal({ food: 300, drink: 150, other: 500 }, { food: 1, drink: 2 })).toBe(600);
  expect(orderTotal({ food: 300, drink: 150, other: 500 }, {})).toBe(0);
  expectTypeOf(orderTotal).parameters.toEqualTypeOf<
    [Record<Category, number>, Partial<Record<Category, number>>]
  >();
  expectTypeOf(orderTotal).returns.toEqualTypeOf<number>();
});
