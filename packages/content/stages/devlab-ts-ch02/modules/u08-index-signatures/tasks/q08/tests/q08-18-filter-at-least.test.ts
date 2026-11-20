// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { filterAtLeast } from "../src/q08-18-filter-at-least";
test("問18 filterAtLeast", () => {
  expect(filterAtLeast({ a: 1, b: 5, c: 3 }, 3)).toEqual({ b: 5, c: 3 });
  expectTypeOf(filterAtLeast).parameters.toEqualTypeOf<[{ [key: string]: number }, number]>();
  expectTypeOf(filterAtLeast).returns.toEqualTypeOf<{ [key: string]: number }>();
});
