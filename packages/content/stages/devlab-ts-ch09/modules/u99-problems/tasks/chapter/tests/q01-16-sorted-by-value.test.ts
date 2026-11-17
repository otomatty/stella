// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sortedByValue } from "../src/q01-16-sorted-by-value";
test("問16 sortedByValue", () => {
  const scores = new Map([
    ["a", 1],
    ["b", 3],
    ["c", 1],
  ]);
  expect(sortedByValue(scores)).toEqual([
    ["b", 3],
    ["a", 1],
    ["c", 1],
  ]);
  expectTypeOf(sortedByValue).parameters.toEqualTypeOf<[Map<string, number>]>();
  expectTypeOf(sortedByValue).returns.toEqualTypeOf<[string, number][]>();
});
