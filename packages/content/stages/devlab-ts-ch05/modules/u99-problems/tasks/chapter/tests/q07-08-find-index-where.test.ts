// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { findIndexWhere } from "../src/q07-08-find-index-where";
test("問8 findIndexWhere", () => {
  expect(findIndexWhere(["a", "bb"], (s) => s.length === 2)).toBe(1);
  expect(findIndexWhere(["a"], (s) => s.length === 2)).toBe(-1);
  expectTypeOf(findIndexWhere).parameters.toEqualTypeOf<
    [readonly string[], (s: string) => boolean]
  >();
  expectTypeOf(findIndexWhere).returns.toEqualTypeOf<number>();
});
