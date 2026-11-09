// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type CategoryCount } from "../src/q05-01-category-count";
test("問1 CategoryCount", () => {
  expectTypeOf<CategoryCount>().toEqualTypeOf<{ food: number; drink: number; other: number }>();
});
