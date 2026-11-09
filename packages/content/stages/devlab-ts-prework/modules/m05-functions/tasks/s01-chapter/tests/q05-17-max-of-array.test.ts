// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { maxOfArray } from "../src/q05-17-max-of-array";
test("問17 maxOfArray", () => {
  expect(maxOfArray([3, 9, 2])).toBe(9);
  expect(() => maxOfArray([])).toThrow(Error);
  expectTypeOf(maxOfArray).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(maxOfArray).returns.toEqualTypeOf<number>();
});
