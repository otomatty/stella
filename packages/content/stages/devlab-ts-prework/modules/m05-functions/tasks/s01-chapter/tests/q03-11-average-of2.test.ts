// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { averageOf2 } from "../src/q03-11-average-of2";
test("問11 averageOf2", () => {
  expect(averageOf2(4, 6)).toBe(5);
  expect(averageOf2(4)).toBe(4);
  expectTypeOf(averageOf2).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(averageOf2).returns.toEqualTypeOf<number>();
});
