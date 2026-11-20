// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstNegative } from "../src/q03-13-first-negative";
test("問13 firstNegative", () => {
  expect(firstNegative([3, -1, -5])).toBe(-1);
  expect(firstNegative([1, 2])).toBeUndefined();
  expectTypeOf(firstNegative).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(firstNegative).returns.toEqualTypeOf<number | undefined>();
});
