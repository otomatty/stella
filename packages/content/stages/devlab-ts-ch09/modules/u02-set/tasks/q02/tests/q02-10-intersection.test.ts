// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { intersection } from "../src/q02-10-intersection";
test("問10 intersection", () => {
  expect([...intersection(new Set([1, 2, 3]), new Set([3, 1]))]).toEqual([1, 3]);
  expect(intersection(new Set([1]), new Set([2])).size).toBe(0);
  expectTypeOf(intersection).parameters.toEqualTypeOf<[Set<number>, Set<number>]>();
  expectTypeOf(intersection).returns.toEqualTypeOf<Set<number>>();
});
