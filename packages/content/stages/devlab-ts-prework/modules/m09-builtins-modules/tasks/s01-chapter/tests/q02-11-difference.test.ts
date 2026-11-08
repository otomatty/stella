// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { difference } from "../src/q02-11-difference";
test("問11 difference", () => {
  expect([...difference(new Set([1, 2, 3]), new Set([2, 4]))]).toEqual([1, 3]);
  expectTypeOf(difference).parameters.toEqualTypeOf<[Set<number>, Set<number>]>();
  expectTypeOf(difference).returns.toEqualTypeOf<Set<number>>();
});
