// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { charCounts } from "../src/q01-11-char-counts";
test("問11 charCounts", () => {
  expect([...charCounts("banana").entries()]).toEqual([
    ["b", 1],
    ["a", 3],
    ["n", 2],
  ]);
  expect(charCounts("").size).toBe(0);
  expectTypeOf(charCounts).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(charCounts).returns.toEqualTypeOf<Map<string, number>>();
});
