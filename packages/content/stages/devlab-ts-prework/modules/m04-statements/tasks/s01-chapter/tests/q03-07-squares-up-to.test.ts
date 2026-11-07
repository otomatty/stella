// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { squaresUpTo } from "../src/q03-07-squares-up-to";
test("問7 squaresUpTo", () => {
  expect(squaresUpTo(4)).toEqual([1, 4, 9, 16]);
  expect(squaresUpTo(0)).toEqual([]);
  expectTypeOf(squaresUpTo).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(squaresUpTo).returns.toEqualTypeOf<number[]>();
});
