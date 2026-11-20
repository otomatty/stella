// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { symmetricDifference } from "../src/q02-12-symmetric-difference";
test("問12 symmetricDifference", () => {
  expect([...symmetricDifference(new Set([1, 2, 5]), new Set([2, 3]))]).toEqual([1, 5, 3]);
  expectTypeOf(symmetricDifference).parameters.toEqualTypeOf<[Set<number>, Set<number>]>();
  expectTypeOf(symmetricDifference).returns.toEqualTypeOf<Set<number>>();
});
