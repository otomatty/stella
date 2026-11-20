// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeSquareCache } from "../src/q08-13-make-square-cache";
test("問13 makeSquareCache", () => {
  const cache = makeSquareCache();
  expect(cache.square(3)).toBe(9);
  expect(cache.square(3)).toBe(9);
  expect(cache.square(4)).toBe(16);
  expect(cache.computed()).toBe(2);
  expectTypeOf(makeSquareCache).parameters.toEqualTypeOf<[]>();
  expectTypeOf(makeSquareCache).returns.toEqualTypeOf<{
    square: (n: number) => number;
    computed: () => number;
  }>();
});
