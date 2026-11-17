// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstIndex } from "../src/q01-19-first-index";
test("問19 firstIndex", () => {
  expect([...firstIndex(["a", "b", "a", "c"]).entries()]).toEqual([
    ["a", 0],
    ["b", 1],
    ["c", 3],
  ]);
  expectTypeOf(firstIndex).returns.toEqualTypeOf<Map<string, number>>();
});
