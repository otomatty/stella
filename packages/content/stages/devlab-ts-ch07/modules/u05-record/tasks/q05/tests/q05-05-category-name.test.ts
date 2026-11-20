// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { categoryName, CATEGORY_NAMES, type Category } from "../src/q05-05-category-name";
test("問5 categoryName", () => {
  expect(categoryName("drink")).toBe("飲み物");
  expectTypeOf(CATEGORY_NAMES).toEqualTypeOf<Record<Category, string>>();
  expectTypeOf(categoryName).parameters.toEqualTypeOf<[Category]>();
  expectTypeOf(categoryName).returns.toEqualTypeOf<string>();
});
