// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { priceOf, type Category } from "../src/q05-16-price-of";
test("問16 priceOf", () => {
  expect(priceOf({ food: 300, drink: 150, other: 500 }, "drink")).toBe(150);
  expectTypeOf(priceOf).parameters.toEqualTypeOf<[Record<Category, number>, Category]>();
  expectTypeOf(priceOf).returns.toEqualTypeOf<number>();
});
