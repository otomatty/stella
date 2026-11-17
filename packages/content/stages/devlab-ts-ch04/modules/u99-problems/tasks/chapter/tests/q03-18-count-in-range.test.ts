// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countInRange } from "../src/q03-18-count-in-range";
test("問18 countInRange", () => {
  expect(countInRange([1, 5, 10, 15], 5, 10)).toBe(2);
  expect(countInRange([], 0, 1)).toBe(0);
  expectTypeOf(countInRange).parameters.toEqualTypeOf<[readonly number[], number, number]>();
  expectTypeOf(countInRange).returns.toEqualTypeOf<number>();
});
