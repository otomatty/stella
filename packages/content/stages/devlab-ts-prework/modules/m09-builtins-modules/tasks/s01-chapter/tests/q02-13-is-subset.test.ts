// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isSubset } from "../src/q02-13-is-subset";
test("問13 isSubset", () => {
  expect(isSubset(new Set([1, 2]), new Set([1, 2, 3]))).toBe(true);
  expect(isSubset(new Set([1, 4]), new Set([1, 2, 3]))).toBe(false);
  expect(isSubset(new Set(), new Set([1]))).toBe(true);
  expectTypeOf(isSubset).parameters.toEqualTypeOf<[Set<number>, Set<number>]>();
  expectTypeOf(isSubset).returns.toEqualTypeOf<boolean>();
});
