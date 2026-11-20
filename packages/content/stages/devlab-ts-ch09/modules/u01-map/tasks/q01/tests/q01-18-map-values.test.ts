// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { mapValues } from "../src/q01-18-map-values";
test("問18 mapValues", () => {
  const scores = new Map([
    ["a", 1],
    ["b", 2],
  ]);
  expect([...mapValues(scores, (n) => n * 10).entries()]).toEqual([
    ["a", 10],
    ["b", 20],
  ]);
  expectTypeOf(mapValues).parameters.toEqualTypeOf<[Map<string, number>, (n: number) => number]>();
  expectTypeOf(mapValues).returns.toEqualTypeOf<Map<string, number>>();
});
