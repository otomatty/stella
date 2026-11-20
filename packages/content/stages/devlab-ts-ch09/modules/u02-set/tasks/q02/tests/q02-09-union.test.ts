// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { union } from "../src/q02-09-union";
test("問9 union", () => {
  expect([...union(new Set([1, 2]), new Set([3, 2]))]).toEqual([1, 2, 3]);
  expectTypeOf(union).parameters.toEqualTypeOf<[Set<number>, Set<number>]>();
  expectTypeOf(union).returns.toEqualTypeOf<Set<number>>();
});
