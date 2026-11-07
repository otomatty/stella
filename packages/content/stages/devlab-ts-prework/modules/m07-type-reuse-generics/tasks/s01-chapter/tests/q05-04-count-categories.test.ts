// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countCategories, type Category } from "../src/q05-04-count-categories";
test("問4 countCategories", () => {
  expect(countCategories(["food", "food", "drink"])).toEqual({ food: 2, drink: 1, other: 0 });
  expectTypeOf(countCategories).parameters.toEqualTypeOf<[readonly Category[]]>();
  expectTypeOf(countCategories).returns.toEqualTypeOf<Record<Category, number>>();
});
