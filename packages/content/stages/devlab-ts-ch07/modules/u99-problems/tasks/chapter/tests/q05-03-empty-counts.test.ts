// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { emptyCounts, type Category } from "../src/q05-03-empty-counts";
test("問3 emptyCounts", () => {
  expect(emptyCounts()).toEqual({ food: 0, drink: 0, other: 0 });
  expectTypeOf(emptyCounts).parameters.toEqualTypeOf<[]>();
  expectTypeOf(emptyCounts).returns.toEqualTypeOf<Record<Category, number>>();
});
