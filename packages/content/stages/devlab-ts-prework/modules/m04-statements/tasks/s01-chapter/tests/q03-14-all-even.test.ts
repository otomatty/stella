// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { allEven } from "../src/q03-14-all-even";
test("問14 allEven", () => {
  expect(allEven([2, 4, 6])).toBe(true);
  expect(allEven([2, 4, 5])).toBe(false);
  expect(allEven([])).toBe(true);
  expectTypeOf(allEven).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(allEven).returns.toEqualTypeOf<boolean>();
});
